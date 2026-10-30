/**
 * Phase 3B: server-side auto-save before container exit.
 *
 * Mirrors lib/cloudSessionGitSave.ts (which runs client-side during graceful
 * stopSession), but executed inside the bridge container so it works even when
 * the client is dead — e.g., the user force-closed the app and the destroy
 * timer fires with no live JS to run cleanup.
 *
 * Pushes uncommitted workspace changes to a deterministic branch named
 * `treena/<YYYY-MM-DD>-<sessionId>` (matches buildTreenaSessionBranchName in
 * the client lib). Returns quickly with `skipped` if the workspace is clean,
 * not a git repo, or has no repo URL.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs/promises";

const execFileP = promisify(execFile);

const AUTO_SAVE_MSG = "treena: auto-save before session end";
const COMMIT_AUTHOR_NAME = "Treena";
const COMMIT_AUTHOR_EMAIL = "auto-save@treena.app";

function buildBranchName(sessionId) {
  const d = new Date().toISOString().slice(0, 10);
  const raw = (sessionId || "").replace(/[^a-zA-Z0-9]/g, "");
  const short = raw.slice(0, 12) || "session";
  return `treena/${d}-${short}`;
}

/**
 * @param {{cwd: string, githubToken: string, repoUrl: string, sessionId: string}} opts
 * @returns {Promise<{ok: boolean, branch?: string, skipped?: string, error?: string}>}
 */
export async function autoSaveWorkspace({ cwd, githubToken, repoUrl, sessionId }) {
  if (!repoUrl) return { ok: true, skipped: "no-repo" };
  if (!githubToken) return { ok: false, error: "no-github-token-cached" };

  try {
    await fs.access(path.join(cwd, ".git"));
  } catch {
    return { ok: true, skipped: "not-a-git-repo" };
  }

  // Cheap dirty check before doing any heavier git work.
  let dirty = false;
  try {
    const { stdout } = await execFileP("git", ["status", "--porcelain"], {
      cwd,
      timeout: 10_000,
    });
    dirty = stdout.trim().length > 0;
  } catch (e) {
    return { ok: false, error: `git status failed: ${e?.message || e}` };
  }
  if (!dirty) return { ok: true, skipped: "clean" };

  const branch = buildBranchName(sessionId);

  try {
    // -B: create branch (or reset to current HEAD if it exists). Idempotent
    // when an earlier crash left a partially-named branch behind.
    await execFileP("git", ["checkout", "-B", branch], {
      cwd,
      timeout: 30_000,
    });

    await execFileP("git", ["add", "-A"], { cwd, timeout: 30_000 });

    await execFileP(
      "git",
      [
        "-c",
        `user.name=${COMMIT_AUTHOR_NAME}`,
        "-c",
        `user.email=${COMMIT_AUTHOR_EMAIL}`,
        "commit",
        "-m",
        AUTO_SAVE_MSG,
      ],
      { cwd, timeout: 30_000 }
    );

    // Embed token in URL for one-shot push auth. Avoid logging this URL.
    const authUrl = repoUrl.replace(
      /^https:\/\//,
      `https://${githubToken}@`
    );
    await execFileP(
      "git",
      ["push", "--set-upstream", authUrl, branch],
      { cwd, timeout: 60_000 }
    );

    return { ok: true, branch };
  } catch (e) {
    return { ok: false, error: e?.message || String(e), branch };
  }
}
