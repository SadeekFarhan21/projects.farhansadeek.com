/**
 * Workspace bridge: PTY + FS + fs.event + agent.tool + git + workspace + LSP (Phases 1–7+).
 * Phase 6: BRIDGE_TOKEN, optional JWT (JWT_SECRET), rate limits, audit/redaction.
 */
import { WebSocketServer } from "ws";
import * as pty from "node-pty";
import fs from "node:fs/promises";
import path from "node:path";
import chokidar from "chokidar";
import { spawn, execFile } from "node:child_process";
import net from "node:net";
import http from "node:http";
import { promisify } from "node:util";
import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import { pathToFileURL, fileURLToPath } from "node:url";
import * as mcpManager from "./mcpManager.mjs";
import * as busyTracker from "./busyTracker.mjs";
import { safeRepoDirName, parseRepoUrl } from "./cloud/repoNames.mjs";

const BRIDGE_ROOT = path.dirname(fileURLToPath(import.meta.url));

const execFileP = promisify(execFile);

const GIT_REMOTE_TIMEOUT_MS = 120_000;

const MAX_READ_BYTES = 512 * 1024;
const MAX_WRITE_BYTES = 512 * 1024;
const MAX_GREP_BYTES = 256 * 1024;
const MAX_CMD_OUT_BYTES = 256 * 1024;
const COMMAND_TIMEOUT_MS = 60_000;
const GREP_TIMEOUT_MS = 30_000;

const RUN_COMMAND_ALLOW = new Set([
  "npm", "npx", "node", "git", "ls", "cat", "echo", "pwd",
  "mkdir", "rm", "rmdir", "cp", "mv", "touch", "chmod",
  "find", "grep", "head", "tail", "wc", "sort", "uniq", "diff", "sed", "awk", "tr", "cut",
  "curl", "wget",
  "python", "python3", "pip", "pip3",
  "yarn", "pnpm",
  "tar", "zip", "unzip", "gzip", "gunzip",
  "env", "which", "whoami", "date", "uname",
  "tsc", "tsx", "prettier", "eslint", "vitest", "jest",
  "docker", "make",
  "sh", "bash",
]);

const PORT = Number(process.env.PORT || 3001);
const CWD = process.env.WORKSPACE_DIR || process.cwd();
const resolvedCwd = path.resolve(CWD);

// Workspace bootstrap state — set by bootstrapWorkspace() at startup, observable
// by clients via the workspace.status RPC and broadcast pushes on state change.
// "empty"   → no repo configured, workspace dir is empty and usable as-is
// "cloning" → git clone (and optional npm install) is running in the background
// "ready"   → workspace is populated and ready for IDE / agent operations
// "error"   → bootstrap failed; workspaceCloneError holds the message
//
// Phase 2 (warm pool): these are mutable because a warm-launched bridge starts
// with no repo and adopts one via /claim. Cold-launch path sets them once at
// startup and never touches them again.
let GITHUB_REPO_URL = (process.env.GITHUB_REPO_URL || "").trim();
let TREENA_SESSION_ID = (process.env.TREENA_SESSION_ID || "").trim();
// Phase 3C (resume): when set, bootstrapWorkspace clones with `--branch <name>`
// so the workspace is restored from the auto-save branch instead of main.
let GITHUB_BRANCH = (process.env.GITHUB_BRANCH || "").trim();
// Cache GitHub token in module-private scope so it survives `delete process.env.GITHUB_TOKEN`
// and remains available for both clone (Phase 1) and exit-time auto-save (Phase 3B).
// Keeping it out of process.env hides it from agent run_command shells and any child
// processes that don't explicitly need it.
let cachedGithubToken = process.env.GITHUB_TOKEN || "";
let workspaceStatus = "empty";
let workspaceCloneError = null;

// Phase 2 (warm pool): claim gating. Set CLAIM_TOKEN at launch on warm tasks
// only — the bridge then refuses WebSocket connections until the API POSTs
// /claim with this token plus user-specific credentials. Cold-launch path
// (no CLAIM_TOKEN) bypasses claim gating entirely.
const CLAIM_TOKEN = (process.env.CLAIM_TOKEN || "").trim();
const REQUIRES_CLAIM = !!CLAIM_TOKEN;
let claimed = !REQUIRES_CLAIM;

const BRIDGE_TOKEN_RAW = process.env.BRIDGE_TOKEN;
// Phase 2: bridge token may be replaced via /claim with the user's per-session
// token. Cold-launch path: set once at startup and never touched.
let BRIDGE_TOKEN =
  typeof BRIDGE_TOKEN_RAW === "string" && BRIDGE_TOKEN_RAW.trim()
    ? BRIDGE_TOKEN_RAW.trim()
    : "";

function bridgeAuthOk(request) {
  // Phase 2: warm bridges refuse all WS until /claim has run. Cold-launch
  // path sets `claimed = true` at startup so this check is a no-op there.
  if (!claimed) return false;
  if (!BRIDGE_TOKEN) return true;
  let provided = "";
  try {
    const u = new URL(request.url || "/", "http://127.0.0.1");
    provided = u.searchParams.get("token") ?? "";
  } catch {
    return false;
  }
  const exp = Buffer.from(BRIDGE_TOKEN, "utf8");
  const got = Buffer.from(provided, "utf8");
  if (exp.length !== got.length) return false;
  return crypto.timingSafeEqual(exp, got);
}

const JWT_SECRET_RAW = process.env.JWT_SECRET || process.env.BRIDGE_JWT_SECRET || "";
const JWT_SECRET =
  typeof JWT_SECRET_RAW === "string" && JWT_SECRET_RAW.trim()
    ? JWT_SECRET_RAW.trim()
    : "";
const JWT_ISS = (process.env.JWT_ISS || "").trim();
const JWT_AUD = (process.env.JWT_AUD || "").trim();
const WORKSPACE_ID_BIND = (process.env.WORKSPACE_ID || "").trim();
const TRUST_PROXY = process.env.TRUST_PROXY === "1" || process.env.TRUST_PROXY === "true";

const MAX_WS_FRAME_BYTES = 8 * 1024 * 1024;
const MSG_RATE_WINDOW_MS = 1000;
const MSG_RATE_MAX = 80;
const IP_RATE_WINDOW_MS = 1000;
const IP_RATE_MAX = 200;

const ipRateBuckets = new Map();

function clientIpFromRequest(request) {
  if (TRUST_PROXY) {
    const xff = request.headers["x-forwarded-for"];
    if (typeof xff === "string" && xff.trim()) {
      return xff.split(",")[0].trim();
    }
  }
  return request.socket?.remoteAddress || "unknown";
}

function ipRateOk(ip) {
  const now = Date.now();
  let b = ipRateBuckets.get(ip);
  if (!b || now - b.start >= IP_RATE_WINDOW_MS) {
    b = { start: now, n: 0 };
    ipRateBuckets.set(ip, b);
  }
  b.n += 1;
  return b.n <= IP_RATE_MAX;
}

function wsMessageRateOk(ws) {
  const now = Date.now();
  if (!ws._msgTs) ws._msgTs = [];
  ws._msgTs = ws._msgTs.filter((t) => now - t < MSG_RATE_WINDOW_MS);
  if (ws._msgTs.length >= MSG_RATE_MAX) return false;
  ws._msgTs.push(now);
  return true;
}

function concurrentTry(ws, key, max) {
  if (!ws._conc) ws._conc = {};
  const n = ws._conc[key] ?? 0;
  if (n >= max) return false;
  ws._conc[key] = n + 1;
  return true;
}

function concurrentRelease(ws, key) {
  if (!ws._conc) return;
  const n = (ws._conc[key] ?? 1) - 1;
  ws._conc[key] = n > 0 ? n : 0;
}

const REDACT_PATTERNS = [
  /\bBearer\s+\S+/gi,
  /token=\S+/gi,
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]+\b/gi,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
];

function redactString(s) {
  let out = String(s);
  for (const re of REDACT_PATTERNS) {
    out = out.replace(re, "[REDACTED]");
  }
  return out;
}

function safeLog(...args) {
  const mapped = args.map((a) =>
    typeof a === "string" ? redactString(a) : a instanceof Error ? redactString(a.message) : a
  );
  console.error(...mapped);
}

function auditLine(event, fields) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    event,
    workspaceId: fields.workspaceId ?? "",
    ...fields,
  });
  console.log(redactString(line));
}

function base64UrlDecode(s) {
  const pad = 4 - (s.length % 4);
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + (pad < 4 ? "=".repeat(pad) : "");
  return Buffer.from(b64, "base64");
}

/**
 * @returns {null | 'expired' | { workspaceId: string, sub?: string, exp: number }}
 */
function verifyJwtHs256(token, secret) {
  const parts = String(token).split(".");
  if (parts.length !== 3) return null;
  const [h64, p64, sig64] = parts;
  const signingInput = `${h64}.${p64}`;
  let expected;
  try {
    expected = crypto.createHmac("sha256", secret).update(signingInput).digest();
  } catch {
    return null;
  }
  let sigBuf;
  try {
    sigBuf = base64UrlDecode(sig64);
  } catch {
    return null;
  }
  if (sigBuf.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(sigBuf, expected)) return null;
  } catch {
    return null;
  }
  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(p64).toString("utf8"));
  } catch {
    return null;
  }
  if (payload == null || typeof payload !== "object") return null;
  if (JWT_ISS && payload.iss !== JWT_ISS) return null;
  if (JWT_AUD && payload.aud !== JWT_AUD) return null;
  const exp = Number(payload.exp);
  if (!Number.isFinite(exp)) return null;
  if (exp <= Date.now() / 1000) return "expired";
  const workspaceId = typeof payload.workspaceId === "string" ? payload.workspaceId : "";
  if (!workspaceId) return null;
  return { workspaceId, sub: typeof payload.sub === "string" ? payload.sub : undefined, exp };
}

function jwtFromRequestUrl(request) {
  try {
    const u = new URL(request.url || "/", "http://127.0.0.1");
    return (u.searchParams.get("jwt") ?? "").trim();
  } catch {
    return "";
  }
}

// Day 6.5: parse the per-WS active repo scope from the connect URL.
// Returns one of:
//   { state: "absent" }                            — old client; soft-fall back
//   { state: "empty" }                             — new client w/o repo; fail loud
//   { state: "valid", repoDir: <name> }            — scope to /workspace/<name>
//   { state: "invalid", reason: <msg> }            — close WS with 4003
function parseActiveRepoDir(request) {
  let u;
  try {
    u = new URL(request.url || "/", "http://127.0.0.1");
  } catch {
    return { state: "absent" };
  }
  if (!u.searchParams.has("activeRepoDir")) return { state: "absent" };
  const raw = u.searchParams.get("activeRepoDir") ?? "";
  if (raw === "") return { state: "empty" };
  if (!/^[a-zA-Z0-9_-]+$/.test(raw)) {
    return { state: "invalid", reason: "activeRepoDir must match /^[a-zA-Z0-9_-]+$/" };
  }
  return { state: "valid", repoDir: raw };
}

function sendSessionErr(ws, code, m) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify({ t: "session.err", code, m }));
  }
}

function sendSessionOk(ws, workspaceId) {
  if (ws.readyState === 1) {
    // rootFileUri reflects the active scope when set; legacy/unscoped clients
    // see the volume root.
    const rootCwd = getActiveCwdFor(ws) || resolvedCwd;
    ws.send(
      JSON.stringify({
        t: "session.ok",
        workspaceId: workspaceId || "",
        rootFileUri: pathToFileURL(rootCwd).href,
      })
    );
  }
}

function bindWorkspaceClaims(claims) {
  if (!WORKSPACE_ID_BIND) return true;
  return claims.workspaceId === WORKSPACE_ID_BIND;
}

function safeRel(relRaw) {
  const rel = String(relRaw ?? "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  const parts = rel.split("/").filter(Boolean);
  for (const p of parts) {
    if (p === "..") throw new Error("invalid path");
  }
  return parts.join("/");
}

// Day 6.5: per-WS active repo scoping. Each connection picks an
// `activeRepoDir` from the WS URL query string at handshake; path-touching
// ops scope to `/workspace/<activeRepoDir>` instead of the volume root.
//
// Three URL states (see plan Day 6.5 mid-deploy fallback):
//   - param ABSENT       → ws.legacyMode=true, ws.activeRepoDir=""  (old client; soft-fall back to volumeRoot)
//   - param PRESENT, ""  → ws.legacyMode=false, ws.activeRepoDir="" (new client w/o repo; fail loud)
//   - param VALID        → ws.legacyMode=false, ws.activeRepoDir=<name> (scope correctly)
function getActiveCwdFor(ws) {
  if (ws.activeRepoDir) return path.join(resolvedCwd, ws.activeRepoDir);
  if (ws.legacyMode) return resolvedCwd;
  return null;
}

function requireActiveCwdFor(ws) {
  const cwd = getActiveCwdFor(ws);
  if (!cwd) {
    throw Object.assign(
      new Error("no active repo set on this connection"),
      { code: "E_NO_ACTIVE_REPO" }
    );
  }
  return cwd;
}

function safeFullFor(ws, relRaw) {
  const cwd = requireActiveCwdFor(ws);
  const rel = safeRel(relRaw);
  const full = path.resolve(cwd, rel);
  const outRel = path.relative(cwd, full);
  if (outRel.startsWith("..") || path.isAbsolute(outRel)) {
    throw new Error("path outside active repo");
  }
  return full;
}

async function fsListRecursive(ws, rel, depth, maxDepth) {
  const full = safeFullFor(ws, rel);
  let st;
  try {
    st = await fs.stat(full);
  } catch (err) {
    if (err && (err.code === "ENOENT" || err.code === "EACCES" || err.code === "EPERM")) return [];
    throw err;
  }
  if (!st.isDirectory()) return [];
  // Tolerant readdir: Fly's ext4 volumes auto-create /workspace/lost+found
  // owned by root mode 700, which the bridge's `node` user can't read. ENOENT
  // also happens mid-clone when git rewrites .git/. Returning empty keeps the
  // parent tree renderable instead of crashing mobile's refreshFileTree.
  let names;
  try {
    names = await fs.readdir(full);
  } catch (err) {
    if (err && (err.code === "ENOENT" || err.code === "EACCES" || err.code === "EPERM")) return [];
    throw err;
  }
  const nodes = [];
  for (const name of names) {
    if (name.startsWith(".") && depth === 0 && name !== ".gitignore") continue;
    // Skip at any depth — never useful in the IDE, and .git is mid-rewrite during
    // clone so walking into it races with ENOENT/scandir errors.
    if (name === ".git" || name === "node_modules") continue;
    // Filter Linux's auto-created fsck recovery dir at the workspace root —
    // unreadable, never useful in the IDE. Only filter at depth 0 so a user
    // repo with a legitimate (readable) `lost+found` subdir isn't hidden.
    if (name === "lost+found" && depth === 0) continue;
    const childRel = rel ? `${rel}/${name}` : name;
    const childFull = path.join(full, name);
    let cst;
    try {
      cst = await fs.stat(childFull);
    } catch {
      // Broken symlink, race with concurrent rm, ENOENT mid-clone, or
      // permission edge case — skip the entry rather than fail the whole listing.
      continue;
    }
    const isDir = cst.isDirectory();
    const node = { name, relPath: childRel, isDirectory: isDir };
    if (isDir && depth < maxDepth) {
      node.children = await fsListRecursive(ws, childRel, depth + 1, maxDepth);
    }
    nodes.push(node);
  }
  nodes.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return nodes;
}

function sendFsResp(ws, id, payload) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify({ t: "fs.resp", id, ...payload }));
  }
}

function sendAgentToolResult(ws, id, payload) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify({ t: "agent.tool_result", id, ...payload }));
  }
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let pos = 0;
  while (true) {
    const idx = haystack.indexOf(needle, pos);
    if (idx === -1) break;
    count += 1;
    pos = idx + needle.length;
  }
  return count;
}

function replaceFirst(haystack, needle, replacement) {
  const idx = haystack.indexOf(needle);
  if (idx === -1) return null;
  return (
    haystack.slice(0, idx) +
    replacement +
    haystack.slice(idx + needle.length)
  );
}

async function listDirOneLevel(ws, relRaw) {
  const rel = safeRel(relRaw ?? "");
  const full = safeFullFor(ws, rel);
  let st;
  try {
    st = await fs.stat(full);
  } catch (err) {
    if (err && (err.code === "ENOENT" || err.code === "EACCES" || err.code === "EPERM")) return { entries: [] };
    throw err;
  }
  if (!st.isDirectory()) throw new Error("not a directory");
  // Same tolerance as fsListRecursive — see comment there.
  let names;
  try {
    names = await fs.readdir(full);
  } catch (err) {
    if (err && (err.code === "ENOENT" || err.code === "EACCES" || err.code === "EPERM")) return { entries: [] };
    throw err;
  }
  const entries = [];
  for (const name of names) {
    if (name.startsWith(".") && name !== ".gitignore") continue;
    // Skip at any depth — same rationale as fsListRecursive.
    if (name === ".git" || name === "node_modules") continue;
    // Filter Linux's lost+found at workspace root only.
    if (name === "lost+found" && rel === "") continue;
    const p = path.join(full, name);
    let st2;
    try {
      st2 = await fs.stat(p);
    } catch {
      continue;
    }
    entries.push({ name, isDirectory: st2.isDirectory() });
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return { entries };
}

function runSpawnCommand(ws, parts, timeoutMs) {
  return new Promise((resolve, reject) => {
    const bin = parts[0];
    let cwd;
    try {
      cwd = requireActiveCwdFor(ws);
    } catch (e) {
      reject(e);
      return;
    }
    const child = spawn(bin, parts.slice(1), {
      cwd,
      shell: false,
      env: { ...process.env },
    });
    busyTracker.trackChildProcess(child, "run_command");
    let stdout = "";
    let stderr = "";
    const cap = MAX_CMD_OUT_BYTES;
    const t = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("command timeout"));
    }, timeoutMs);
    const trim = (s) => (s.length > cap ? s.slice(0, cap) + "\n[truncated]" : s);
    child.stdout?.on("data", (d) => {
      stdout += d.toString();
      if (stdout.length > cap) stdout = trim(stdout);
    });
    child.stderr?.on("data", (d) => {
      stderr += d.toString();
      if (stderr.length > cap) stderr = trim(stderr);
    });
    child.on("error", (err) => {
      clearTimeout(t);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(t);
      resolve({
        stdout: trim(stdout),
        stderr: trim(stderr),
        exitCode: code ?? 0,
      });
    });
  });
}

function waitForPort(port, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const start = Date.now();
    function probe() {
      const sock = net.createConnection({ port, host: "127.0.0.1" });
      sock.on("connect", () => {
        sock.destroy();
        resolve(true);
      });
      sock.on("error", () => {
        sock.destroy();
        if (Date.now() - start >= timeoutMs) {
          resolve(false);
        } else {
          setTimeout(probe, 500);
        }
      });
    }
    probe();
  });
}

let bgIdCounter = 0;

function grepNoMatchResult(e) {
  if (e?.status === 1 || e?.code === 1) {
    return {
      matches: typeof e.stdout === "string" ? e.stdout : "",
      stderr: typeof e.stderr === "string" ? e.stderr : "",
    };
  }
  return null;
}

async function runGrep(ws, pattern, relSubdir, maxMatches) {
  const maxLines = Math.min(200, Math.max(1, Number(maxMatches) || 80));
  const rel = relSubdir ? safeRel(relSubdir) : "";
  const cwd = rel ? safeFullFor(ws, rel) : requireActiveCwdFor(ws);
  const rgArgs = [
    "-F",
    "--no-heading",
    "-n",
    "--max-count",
    String(maxLines * 20),
    "--glob",
    "!**/node_modules/**",
    "--glob",
    "!.git/**",
    pattern,
    ".",
  ];
  try {
    const { stdout, stderr } = await execFileP("rg", rgArgs, {
      cwd,
      maxBuffer: MAX_GREP_BYTES,
      timeout: GREP_TIMEOUT_MS,
    });
    return { matches: stdout || "", stderr: stderr || "" };
  } catch (e) {
    const noMatch = grepNoMatchResult(e);
    if (noMatch) return noMatch;
    if (e?.code === "ENOENT") {
      try {
        const { stdout, stderr } = await execFileP(
          "grep",
          [
            "-R",
            "-n",
            "-F",
            "-I",
            "--exclude-dir=node_modules",
            "--exclude-dir=.git",
            pattern,
            ".",
          ],
          {
            cwd,
            maxBuffer: MAX_GREP_BYTES,
            timeout: GREP_TIMEOUT_MS,
          }
        );
        return { matches: stdout || "", stderr: stderr || "" };
      } catch (e2) {
        const nm = grepNoMatchResult(e2);
        if (nm) return nm;
        throw e2;
      }
    }
    throw e;
  }
}

const DIAGNOSTICS_TIMEOUT_MS = 45_000;

function sendWorkspaceResp(ws, id, payload) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify({ t: "workspace.resp", id, ...payload }));
  }
}

function broadcastWorkspaceStatus() {
  const msg = JSON.stringify({
    t: "workspace.status",
    status: workspaceStatus,
    repoUrl: GITHUB_REPO_URL || null,
    error: workspaceCloneError,
  });
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      try { client.send(msg); } catch { /* ignore */ }
    }
  }
}

async function bootstrapWorkspace() {
  if (!GITHUB_REPO_URL) {
    workspaceStatus = "ready";
    return;
  }
  if (!cachedGithubToken) {
    console.warn("[cloud] GITHUB_REPO_URL set but no GITHUB_TOKEN; skipping clone");
    workspaceStatus = "ready";
    return;
  }
  workspaceStatus = "cloning";
  workspaceCloneError = null;
  broadcastWorkspaceStatus();
  console.log(
    `[cloud] Cloning ${GITHUB_REPO_URL}${GITHUB_BRANCH ? ` (branch ${GITHUB_BRANCH})` : ""} into ${resolvedCwd} ...`
  );
  const authUrl = GITHUB_REPO_URL.replace(
    /^https:\/\//,
    `https://${cachedGithubToken}@`
  );
  try {
    const cloneArgs = ["clone", "--depth", "50"];
    if (GITHUB_BRANCH) {
      cloneArgs.push("--branch", GITHUB_BRANCH);
    }
    cloneArgs.push(authUrl, resolvedCwd);
    await execFileP("git", cloneArgs, {
      timeout: 300_000,
    });
    const pkgPath = path.join(resolvedCwd, "package.json");
    let hasPkg = false;
    try {
      await fs.access(pkgPath);
      hasPkg = true;
    } catch {
      /* no package.json */
    }
    if (hasPkg) {
      console.log("[cloud] Installing dependencies...");
      await execFileP("npm", ["install", "--ignore-scripts"], {
        cwd: resolvedCwd,
        timeout: 600_000,
      });
    }
    workspaceStatus = "ready";
    console.log("[cloud] Workspace ready");
  } catch (err) {
    workspaceStatus = "error";
    workspaceCloneError = err && err.message ? err.message : String(err);
    console.error("[cloud] Workspace bootstrap failed:", workspaceCloneError);
  } finally {
    // Hide the token from process.env so child processes (agent shells,
    // npm install, etc.) can't read it. Bridge keeps it in `cachedGithubToken`
    // for legitimate uses like Phase 3B auto-save on exit.
    delete process.env.GITHUB_TOKEN;
    broadcastWorkspaceStatus();
  }
}

// Phase 3A — graceful-vs-unexpected disconnect window.
// Set by `client.bg` WS messages; cleared by `client.fg`. Auto-destroy reads it
// at WS-close time to decide whether the disconnect was an expected backgrounding
// (long timeout) or an unexpected close like force-kill (short timeout).
let lastClientBgAt = 0;
const CLIENT_BG_RECENCY_MS = 10_000;

function isLastDisconnectGraceful() {
  if (lastClientBgAt === 0) return false;
  return Date.now() - lastClientBgAt < CLIENT_BG_RECENCY_MS;
}

// Phase 3B: server-side auto-save before container exit. Idempotent — runs at
// most once across SIGTERM, SIGINT, and the auto-destroy timer.
let autoSaveAlreadyRan = false;
async function runAutoSaveOnExit(reason) {
  if (autoSaveAlreadyRan) return;
  autoSaveAlreadyRan = true;
  try {
    const { autoSaveWorkspace } = await import("./cloudAutoSave.mjs");
    const result = await autoSaveWorkspace({
      cwd: resolvedCwd,
      githubToken: cachedGithubToken,
      repoUrl: GITHUB_REPO_URL,
      sessionId: TREENA_SESSION_ID,
    });
    console.log(
      `[autoSave] reason=${reason} ${JSON.stringify(result)}`
    );
  } catch (e) {
    console.error(
      `[autoSave] reason=${reason} failed:`,
      e && e.message ? e.message : e
    );
  }
}

function parseRgStructuredLine(line) {
  const m = String(line).match(/^(.+):(\d+):(.*)$/);
  if (!m) return null;
  const filePath = m[1].replace(/^\.\//, "");
  return { path: filePath, line: Number(m[2]), text: m[3] };
}

async function runTscDiagnosticsForFile(ws, relPath) {
  await fs.stat(safeFullFor(ws, relPath));
  let combined = "";
  try {
    await execFileP(
      "npx",
      ["tsc", "--noEmit", "--pretty", "false", "--incremental", "false", relPath],
      {
        cwd: requireActiveCwdFor(ws),
        encoding: "utf8",
        maxBuffer: 512 * 1024,
        timeout: DIAGNOSTICS_TIMEOUT_MS,
      }
    );
  } catch (e) {
    combined = `${e.stdout || ""}${e.stderr || ""}`;
  }
  const diags = [];
  const re =
    /^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+([^:]+):\s*(.+)$/gm;
  const normRel = relPath.replace(/\\/g, "/");
  let mm;
  while ((mm = re.exec(combined)) !== null) {
    let fp = mm[1].replace(/\\/g, "/");
    if (!fp.endsWith(normRel) && !fp.endsWith(path.basename(normRel))) {
      continue;
    }
    diags.push({
      line: Number(mm[2]),
      col: Number(mm[3]),
      severity: mm[4] === "warning" ? "warning" : "error",
      message: `${mm[5]}: ${(mm[6] || "").trim()}`,
    });
  }
  return diags;
}

const LSP_REQUEST_TIMEOUT_MS = 60_000;

function drainLspBuffer(ws) {
  const st = ws.lsp;
  if (!st) return;
  let idx;
  while ((idx = st.buf.indexOf("\n")) >= 0) {
    const line = st.buf.slice(0, idx).trim();
    st.buf = st.buf.slice(idx + 1);
    if (!line) continue;
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    if (parsed.id != null && st.pending.has(parsed.id)) {
      const { resolve, t } = st.pending.get(parsed.id);
      clearTimeout(t);
      st.pending.delete(parsed.id);
      resolve(parsed);
    }
  }
}

function lspWrite(ws, obj) {
  if (!ws.lsp?.child?.stdin) return false;
  try {
    ws.lsp.child.stdin.write(`${JSON.stringify(obj)}\n`);
    return true;
  } catch {
    return false;
  }
}

function lspRpcPromise(ws, method, params, rpcId) {
  return new Promise((resolve, reject) => {
    if (!ws.lsp) {
      reject(new Error("lsp not started"));
      return;
    }
    const t = setTimeout(() => {
      ws.lsp.pending.delete(rpcId);
      reject(new Error("lsp timeout"));
    }, LSP_REQUEST_TIMEOUT_MS);
    ws.lsp.pending.set(rpcId, { resolve, t });
    if (!lspWrite(ws, { jsonrpc: "2.0", id: rpcId, method, params })) {
      clearTimeout(t);
      ws.lsp.pending.delete(rpcId);
      reject(new Error("lsp write failed"));
    }
  });
}

async function tlsServerBinary() {
  const ext = process.platform === "win32" ? ".cmd" : "";
  const p = path.join(BRIDGE_ROOT, "node_modules", ".bin", `typescript-language-server${ext}`);
  try {
    await fs.access(p);
    return p;
  } catch {
    return null;
  }
}

async function ensureLspSession(ws) {
  if (ws.lsp?.ready) return;
  const lspCwd = requireActiveCwdFor(ws);
  const bin = await tlsServerBinary();
  const proc = bin
    ? spawn(bin, ["--stdio"], {
        cwd: lspCwd,
        shell: false,
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env },
      })
    : spawn("npx", ["-y", "typescript-language-server", "--stdio"], {
        cwd: lspCwd,
        shell: process.platform === "win32",
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, npm_config_yes: "true" },
      });

  ws.lsp = {
    child: proc,
    buf: "",
    pending: new Map(),
    nextId: 1,
    ready: false,
  };

  proc.stdout?.on("data", (d) => {
    if (!ws.lsp) return;
    ws.lsp.buf += d.toString();
    drainLspBuffer(ws);
  });
  proc.stderr?.on("data", () => {});
  proc.on("exit", () => {
    if (ws.lsp?.child === proc) ws.lsp = null;
  });

  const initId = ws.lsp.nextId++;
  const initResp = await lspRpcPromise(ws, "initialize", {
    processId: null,
    rootUri: pathToFileURL(lspCwd).href,
    capabilities: { workspace: {}, textDocument: {} },
    clientInfo: { name: "treena-bridge", version: "0.1" },
  }, initId);
  if (initResp.error) {
    throw new Error(initResp.error.message || "lsp initialize failed");
  }
  lspWrite(ws, { jsonrpc: "2.0", method: "initialized", params: {} });
  ws.lsp.ready = true;
}

async function handleLspReq(ws, msg) {
  const reqId = msg.id;
  if (typeof reqId !== "number") return;
  const method = typeof msg.method === "string" ? msg.method : "";
  if (!method) return;
  const params = msg.params != null && typeof msg.params === "object" ? msg.params : {};

  try {
    await ensureLspSession(ws);
    const rpcId = ws.lsp.nextId++;
    const resp = await lspRpcPromise(ws, method, params, rpcId);
    const out =
      resp.error != null
        ? { t: "lsp.resp", id: reqId, ok: false, err: String(resp.error.message || resp.error) }
        : { t: "lsp.resp", id: reqId, ok: true, result: resp.result };
    if (ws.readyState === 1) ws.send(JSON.stringify(out));
    auditLine("lsp.rpc", { workspaceId: ws.workspaceIdForAudit || "", method, ok: !resp.error });
  } catch (e) {
    if (ws.readyState === 1) {
      ws.send(
        JSON.stringify({
          t: "lsp.resp",
          id: reqId,
          ok: false,
          err: String(e?.message || e),
        })
      );
    }
    auditLine("lsp.rpc", { workspaceId: ws.workspaceIdForAudit || "", method, ok: false });
  }
}

async function handleWorkspaceRpc(ws, msg) {
  const id = msg.id;
  if (typeof id !== "number") return;
  try {
    switch (msg.t) {
      case "workspace.status": {
        sendWorkspaceResp(ws, id, {
          ok: true,
          status: workspaceStatus,
          repoUrl: GITHUB_REPO_URL || null,
          error: workspaceCloneError,
        });
        return;
      }
      case "workspace.search": {
        if (!concurrentTry(ws, "workspaceRpc", 2)) {
          sendWorkspaceResp(ws, id, { ok: false, err: "RATE_LIMIT" });
          return;
        }
        try {
          const pattern = String(msg.pattern ?? "");
          if (!pattern) {
            sendWorkspaceResp(ws, id, { ok: false, err: "pattern required" });
            return;
          }
          const { matches: raw } = await runGrep(
            ws,
            pattern,
            msg.path ? String(msg.path) : "",
            msg.max_matches
          );
          const lines = (raw || "").split("\n").filter((l) => l.length > 0);
          const items = [];
          for (const line of lines) {
            const row = parseRgStructuredLine(line);
            if (row) items.push(row);
            if (items.length >= 120) break;
          }
          sendWorkspaceResp(ws, id, { ok: true, matches: items });
          auditLine("workspace.search", {
            workspaceId: ws.workspaceIdForAudit || "",
            ok: true,
          });
        } finally {
          concurrentRelease(ws, "workspaceRpc");
        }
        break;
      }
      case "diagnostics.file": {
        if (!concurrentTry(ws, "workspaceRpc", 2)) {
          sendWorkspaceResp(ws, id, { ok: false, err: "RATE_LIMIT" });
          return;
        }
        try {
          const rel = String(msg.path ?? "");
          if (!rel) {
            sendWorkspaceResp(ws, id, { ok: false, err: "path required" });
            return;
          }
          const diagnostics = await runTscDiagnosticsForFile(ws, rel);
          sendWorkspaceResp(ws, id, { ok: true, diagnostics });
          auditLine("diagnostics.file", {
            workspaceId: ws.workspaceIdForAudit || "",
            path: rel,
            ok: true,
          });
        } finally {
          concurrentRelease(ws, "workspaceRpc");
        }
        break;
      }
      case "workspace.embed_search": {
        sendWorkspaceResp(ws, id, {
          ok: false,
          err: "NOT_IMPLEMENTED",
        });
        auditLine("workspace.embed_search", {
          workspaceId: ws.workspaceIdForAudit || "",
          ok: false,
        });
        break;
      }
      default:
        sendWorkspaceResp(ws, id, {
          ok: false,
          err: `unknown workspace op: ${msg.t}`,
        });
    }
  } catch (e) {
    sendWorkspaceResp(ws, id, { ok: false, err: String(e?.message || e) });
  }
}



// ── setup.run helpers (Day 6.1) ─────────────────────────────
// On-demand repo clone + dependency install on the user's persistent /workspace
// volume. Driven by a new agent.tool case below. Streams progress via
// `repo.setup` push messages so the mobile RepoSetupDrawer can render.
//
// SECURITY (Q1, Day 6.1): the GitHub token comes from the setup.run RPC payload
// (mobile passes it from its store on each call) — NOT from cachedGithubToken
// or process.env. The local `githubToken` variable lives only for the duration
// of clone + remote-set-url, and is interpolated into the clone URL with the
// `x-access-token:` git-helper convention then immediately stripped from
// .git/config via `git remote set-url origin`. The token is NEVER:
//   - written to process.env (so child shells / npm can't read it)
//   - included in repo.setup push payloads
//   - included in sendAgentToolResult payloads
//   - included in auditLine / logEvent fields
//   - left in .git/config after clone
// `redactString` (which matches ghp_*, github_pat_*, Bearer X, JWT, etc.)
// passes over every error and progress string as defense-in-depth.
//
// RETRY SEMANTICS (Q2, Day 6.1): runSetupRun unconditionally `rm -rf`s the
// repo target dir before re-cloning. This is intentional: the previous attempt
// may have left a partial clone or busted node_modules, and a fresh clone is
// the only deterministic recovery. This is SAFE because the autopush-to-treena-
// branch hook (lib/cloudSessionGitSave.ts, fired on AppState=background by
// useUserMachine.ts) saves user work to the `treena/<date>-<userMachineId>`
// branch on GitHub before the workspace can be wiped. KNOWN EDGE CASE that can
// lose data: user has uncommitted edits AND device is offline AND the autopush
// background-handler did not fire (e.g., process killed too quickly to run
// the async save) AND user re-triggers setup.run. In that narrow window the
// uncommitted edits are gone. This is documented, not fixed.
//
// MULTI-ECOSYSTEM (Q4 + C, Day 6.1): detectPackageManagers returns an ordered
// list of installers (one JS + one Python max, picked by lockfile priority).
// Installers run SERIALLY, JS first then Python. Each is independent: one
// failure does NOT abort the rest. Final stage:
//   - all succeed → "ready"
//   - mixed (some fail, some succeed) → "ready" with a note in the final
//     message listing which failed (machine is usable; user can retry the
//     failed installer manually)
//   - all fail → "failed" with the aggregated error
// Each installer's per-line stderr/stdout is broadcast via repo.setup pushes
// during the run; on failure, the LAST 2KB or 50 lines of stderr (whichever
// hits first) is captured and attached to the final error for actionable UX.

/**
 * Returns an ordered list of installers to run for a freshly-cloned repo.
 * At most one JS installer + one Python installer, each picked by lockfile
 * priority (most-specific first). Order: JS first (faster, fail-fast), then
 * Python. Empty list = no install, transition straight to ready.
 *
 * Per-installer entry: { ecosystem, cmd, args, source, env? }
 *   - source: which file triggered detection (for logging)
 *   - env: extra env vars to set for this installer (e.g. POETRY_VIRTUALENVS_IN_PROJECT)
 */
async function detectPackageManagers(dir) {
  const found = [];

  // JS — pick highest-priority single installer
  const jsCandidates = [
    { file: "pnpm-lock.yaml", cmd: "pnpm", args: ["install", "--frozen-lockfile"] },
    { file: "yarn.lock", cmd: "yarn", args: ["install", "--frozen-lockfile"] },
    { file: "package-lock.json", cmd: "npm", args: ["ci"] },
    { file: "package.json", cmd: "npm", args: ["install"] },
  ];
  for (const c of jsCandidates) {
    try {
      await fs.access(path.join(dir, c.file));
      found.push({ ecosystem: "js", ...c });
      break;
    } catch { /* not present */ }
  }

  // Python — pick highest-priority single installer.
  // poetry: POETRY_VIRTUALENVS_IN_PROJECT keeps the venv inside the repo dir
  // (and therefore on the persistent /workspace volume) so it survives
  // machine restarts.
  const pyCandidates = [
    {
      file: "poetry.lock",
      cmd: "poetry",
      args: ["install", "--no-interaction"],
      env: { POETRY_VIRTUALENVS_IN_PROJECT: "1" },
    },
    {
      file: "uv.lock",
      cmd: "uv",
      args: ["sync"],
    },
    {
      file: "pyproject.toml",
      cmd: "pip",
      args: ["install", "--break-system-packages", "-e", "."],
    },
    {
      file: "requirements.txt",
      cmd: "pip",
      args: ["install", "--break-system-packages", "-r", "requirements.txt"],
    },
  ];
  for (const c of pyCandidates) {
    try {
      await fs.access(path.join(dir, c.file));
      found.push({ ecosystem: "python", ...c });
      break;
    } catch { /* not present */ }
  }

  return found;
}

function broadcastRepoSetup(payload) {
  const msg = JSON.stringify({ t: "repo.setup", ...payload });
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      try { client.send(msg); } catch { /* ignore */ }
    }
  }
}

/**
 * Bounded ring buffer for stderr tail (Q3, Day 6.1). Keeps at most maxBytes
 * AND maxLines, whichever bound hits first. Used to surface actionable
 * context (ENOSPC, missing-binary, etc.) in the final error message without
 * unbounded memory growth on long-running installs.
 */
function makeStderrTail(maxBytes, maxLines) {
  let buf = "";
  return {
    push(text) {
      buf += text;
      if (buf.length > maxBytes) buf = buf.slice(-maxBytes);
      const lines = buf.split("\n");
      if (lines.length > maxLines) {
        buf = lines.slice(-maxLines).join("\n");
      }
    },
    flush() {
      return buf;
    },
  };
}

const SETUP_STDERR_MAX_BYTES = 2000;
const SETUP_STDERR_MAX_LINES = 50;

/**
 * Spawn git/npm/etc with timeout, busyTracker registration, throttled
 * stdout/stderr pump for live progress, AND bounded stderr tail capture for
 * actionable error messages.
 *
 * Resolves on exit code 0 with `{exitCode}`. Rejects otherwise with an Error
 * whose `.stderrTail` property holds the captured stderr (already redacted).
 */
function runSetupChild(bin, args, opts = {}) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(bin, args, {
        cwd: opts.cwd || resolvedCwd,
        shell: false,
        env: opts.env ? { ...process.env, ...opts.env } : { ...process.env },
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
      return;
    }
    busyTracker.trackChildProcess(child, opts.label || "setup");

    let lastEmittedAt = 0;
    let pendingLine = "";
    const pump = (data) => {
      pendingLine += data.toString();
      const idx = pendingLine.lastIndexOf("\n");
      if (idx === -1) return;
      const block = pendingLine.slice(0, idx);
      pendingLine = pendingLine.slice(idx + 1);
      const lines = block.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      if (lines.length === 0) return;
      const last = lines[lines.length - 1];
      const now = Date.now();
      if (opts.onLine && now - lastEmittedAt >= 1000) {
        lastEmittedAt = now;
        opts.onLine(redactString(last).slice(0, 240));
      }
    };
    child.stdout?.on("data", pump);
    child.stderr?.on("data", pump);

    // Separate stderr tail capture for failure context. Independent of the
    // throttled pump above so we don't lose error lines just because they
    // arrived in the same 1-second window as another line.
    const stderrTail = makeStderrTail(SETUP_STDERR_MAX_BYTES, SETUP_STDERR_MAX_LINES);
    child.stderr?.on("data", (data) => stderrTail.push(data.toString()));

    const timeoutMs = opts.timeoutMs || 60_000;
    const timer = setTimeout(() => {
      try { child.kill("SIGKILL"); } catch { /* ignore */ }
      const err = new Error(`${opts.label || "process"} timed out after ${timeoutMs}ms`);
      err.stderrTail = redactString(stderrTail.flush());
      reject(err);
    }, timeoutMs);

    child.on("error", (err) => {
      clearTimeout(timer);
      err.stderrTail = redactString(stderrTail.flush());
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ exitCode: code });
      } else {
        const err = new Error(`${opts.label || "process"} exited with code ${code}`);
        err.stderrTail = redactString(stderrTail.flush());
        reject(err);
      }
    });
  });
}

/**
 * Format an error from runSetupChild for inclusion in repo.setup push +
 * sendAgentToolResult. Always passes through redactString.
 */
function formatSetupError(label, err) {
  const head = redactString(String(err?.message || err));
  const tail = err?.stderrTail ? `\n--- last stderr ---\n${err.stderrTail}` : "";
  return `${label} failed: ${head}${tail}`;
}

async function runSetupRun(ws, id, args) {
  const repoUrl = String(args.repoUrl ?? "").trim();
  const branch = args.branch ? String(args.branch).trim() : null;
  // Q1: token comes from the RPC payload, not cachedGithubToken / process.env.
  // Local-only — never logged, never written to env, scope ends with this fn.
  const githubToken = String(args.githubToken ?? "").trim();

  if (!repoUrl) {
    sendAgentToolResult(ws, id, { ok: false, err: "repoUrl required", code: "E_TOOL" });
    return;
  }
  if (!githubToken) {
    sendAgentToolResult(ws, id, { ok: false, err: "githubToken required", code: "E_TOOL" });
    return;
  }

  let owner, repo;
  try {
    ({ owner, repo } = parseRepoUrl(repoUrl));
  } catch (e) {
    sendAgentToolResult(ws, id, { ok: false, err: e.message, code: "E_TOOL" });
    return;
  }
  const repoName = safeRepoDirName(repo);
  if (!repoName) {
    sendAgentToolResult(ws, id, { ok: false, err: "invalid repo name", code: "E_TOOL" });
    return;
  }

  const target = path.join(resolvedCwd, repoName);
  // Path-traversal guard: target MUST live directly under resolvedCwd.
  if (!target.startsWith(resolvedCwd + path.sep)) {
    sendAgentToolResult(ws, id, { ok: false, err: "path traversal blocked", code: "E_TOOL" });
    return;
  }

  // Wipe any existing dir first — see RETRY SEMANTICS comment block above for
  // why this is safe (autopush-to-treena-branch protects user work) and the
  // documented edge case where it isn't.
  try {
    await fs.rm(target, { recursive: true, force: true });
  } catch {
    /* best effort */
  }

  // Day 6.5: every repo.setup push carries repoName so mobile knows the
  // bridge-side dir name (avoids client-side derivation drift).
  const pushSetup = (extra) =>
    broadcastRepoSetup({ repoUrl, repoName, ...extra });

  pushSetup({ stage: "cloning", message: `Cloning ${repoName}...` });

  const tokenUrl = `https://x-access-token:${githubToken}@github.com/${owner}/${repo}.git`;
  const cleanUrl = `https://github.com/${owner}/${repo}.git`;

  // Clone
  const cloneArgs = ["clone", "--depth", "50"];
  if (branch) cloneArgs.push("--branch", branch);
  cloneArgs.push(tokenUrl, target);
  try {
    await runSetupChild("git", cloneArgs, {
      timeoutMs: 5 * 60_000,
      label: "clone",
      onLine: (line) => pushSetup({ stage: "cloning", message: line }),
    });
  } catch (e) {
    const msg = formatSetupError("Clone", e);
    pushSetup({ stage: "failed", message: msg, error: msg });
    sendAgentToolResult(ws, id, { ok: false, err: msg, code: "E_TOOL" });
    return;
  }

  // Strip the token from .git/config so it doesn't sit on disk.
  try {
    await runSetupChild(
      "git",
      ["-C", target, "remote", "set-url", "origin", cleanUrl],
      { timeoutMs: 10_000, label: "set-url" }
    );
  } catch {
    /* non-fatal — token-bearing remote URL is a security concern but not
       a functional blocker; user can manually fix with `git remote set-url`. */
  }

  // Detect installers (one JS + one Python max). Run serially, JS first.
  const installers = await detectPackageManagers(target);
  if (installers.length === 0) {
    pushSetup({ stage: "ready", message: "No package manager detected" });
    sendAgentToolResult(ws, id, {
      ok: true,
      result: { repoName, dir: target, installed: false, installers: [] },
    });
    return;
  }

  const results = [];
  for (const inst of installers) {
    pushSetup({
      stage: "installing",
      message: `[${inst.ecosystem}] Running ${inst.cmd} ${inst.args.join(" ")} (from ${inst.source})...`,
    });
    try {
      await runSetupChild(inst.cmd, inst.args, {
        cwd: target,
        env: inst.env,
        timeoutMs: 10 * 60_000,
        label: `${inst.ecosystem}-install`,
        onLine: (line) =>
          pushSetup({
            stage: "installing",
            message: `[${inst.ecosystem}] ${line}`,
          }),
      });
      results.push({ ecosystem: inst.ecosystem, cmd: inst.cmd, ok: true });
    } catch (e) {
      const msg = formatSetupError(`${inst.ecosystem} install`, e);
      results.push({
        ecosystem: inst.ecosystem,
        cmd: inst.cmd,
        ok: false,
        error: msg,
      });
      // Don't abort — keep going so a Python failure doesn't kill JS success.
      pushSetup({
        stage: "installing",
        message: `[${inst.ecosystem}] failed: ${msg}`,
      });
    }
  }

  // Final state:
  //   all-ok → ready
  //   all-failed → failed
  //   mixed → ready with a partial-success note (machine is usable)
  const successes = results.filter((r) => r.ok);
  const failures = results.filter((r) => !r.ok);

  if (successes.length === 0) {
    const errSummary = failures.map((f) => `${f.ecosystem}: ${f.error}`).join("\n\n");
    pushSetup({
      stage: "failed",
      message: `All installers failed`,
      error: errSummary,
    });
    sendAgentToolResult(ws, id, {
      ok: false,
      err: errSummary,
      code: "E_TOOL",
      result: { repoName, dir: target, installed: false, installers: results },
    });
    return;
  }

  let readyMessage = "Workspace ready";
  if (failures.length > 0) {
    const failSummary = failures
      .map((f) => `${f.ecosystem} install failed (${f.cmd})`)
      .join("; ");
    readyMessage = `Workspace ready, with partial success: ${failSummary}. You can retry or run manually.`;
  }
  pushSetup({
    stage: "ready",
    message: readyMessage,
    ...(failures.length > 0 ? { partial: true } : {}),
  });
  sendAgentToolResult(ws, id, {
    ok: true,
    result: {
      repoName,
      dir: target,
      installed: successes.length > 0,
      partial: failures.length > 0,
      installers: results,
    },
  });
}

async function handleAgentTool(ws, msg) {
  const id = msg.id;
  if (typeof id !== "string" || !id) return;
  const name = typeof msg.name === "string" ? msg.name : "";
  const args =
    msg.args && typeof msg.args === "object" && msg.args !== null ? msg.args : {};

  try {
    switch (name) {
      case "read_file": {
        const p = String(args.path ?? "");
        const full = safeFullFor(ws, p);
        const st = await fs.stat(full);
        if (!st.isFile()) throw new Error("not a file");
        if (st.size > MAX_READ_BYTES) throw new Error("file too large");
        const content = await fs.readFile(full, "utf8");
        sendAgentToolResult(ws, id, { ok: true, result: { content } });
        break;
      }
      case "write_file": {
        const p = String(args.path ?? "");
        const content = String(args.content ?? "");
        if (content.length > MAX_WRITE_BYTES) throw new Error("content too large");
        const full = safeFullFor(ws, p);
        await fs.writeFile(full, content, "utf8");
        sendAgentToolResult(ws, id, { ok: true, result: { path: p, written: true } });
        break;
      }
      case "list_dir": {
        const result = await listDirOneLevel(ws, args.path ?? "");
        sendAgentToolResult(ws, id, { ok: true, result });
        break;
      }
      case "grep": {
        if (!concurrentTry(ws, "grep", 2)) {
          sendAgentToolResult(ws, id, {
            ok: false,
            err: "RATE_LIMIT: too many concurrent grep",
            code: "E_TOOL",
          });
          break;
        }
        try {
          const pattern = String(args.pattern ?? "");
          if (!pattern) throw new Error("pattern required");
          const { matches, stderr } = await runGrep(
            ws,
            pattern,
            args.path ? String(args.path) : "",
            args.max_matches
          );
          sendAgentToolResult(ws, id, {
            ok: true,
            result: { matches, stderr },
          });
          auditLine("agent.tool", {
            workspaceId: ws.workspaceIdForAudit || "",
            name: "grep",
            ok: true,
          });
        } finally {
          concurrentRelease(ws, "grep");
        }
        break;
      }
      case "run_command": {
        const cmd = String(args.command ?? "").trim();
        if (!cmd) {
          sendAgentToolResult(ws, id, {
            ok: false,
            err: "command required",
            code: "E_TOOL",
          });
          break;
        }
        const parts = cmd.split(/\s+/).filter(Boolean);
        const bin = parts[0];
        if (!bin || !RUN_COMMAND_ALLOW.has(bin)) {
          sendAgentToolResult(ws, id, {
            ok: false,
            err: `binary not allowed: ${bin || "(empty)"}`,
            code: "E_TOOL",
          });
          break;
        }

        if (Boolean(args.background)) {
          if (!concurrentTry(ws, "runCmdBg", 3)) {
            sendAgentToolResult(ws, id, {
              ok: false,
              err: "RATE_LIMIT: too many concurrent background run_command",
              code: "E_TOOL",
            });
            break;
          }
          try {
            const child = spawn(bin, parts.slice(1), {
              cwd: requireActiveCwdFor(ws),
              shell: false,
              env: { ...process.env },
              detached: true,
              stdio: "ignore",
            });
            busyTracker.trackChildProcess(child, "run_command:bg");
            try {
              child.unref();
            } catch {
              /* ignore */
            }
            if (!ws._runCmdBgChildren) ws._runCmdBgChildren = new Set();
            ws._runCmdBgChildren.add(child);
            child.on("exit", () => {
              try {
                ws._runCmdBgChildren?.delete(child);
              } catch {
                /* ignore */
              }
            });
            sendAgentToolResult(ws, id, {
              ok: true,
              result: {
                background: true,
                pid: child.pid,
                message:
                  "Started in background (detached). Stop via Terminal (kill) if needed.",
              },
            });
            auditLine("agent.tool", {
              workspaceId: ws.workspaceIdForAudit || "",
              name: "run_command",
              ok: true,
              background: true,
            });
          } catch (e) {
            sendAgentToolResult(ws, id, {
              ok: false,
              err: String(e?.message || e),
              code: "E_TOOL",
            });
          } finally {
            concurrentRelease(ws, "runCmdBg");
          }
          break;
        }

        if (!concurrentTry(ws, "runCmd", 3)) {
          sendAgentToolResult(ws, id, {
            ok: false,
            err: "RATE_LIMIT: too many concurrent run_command",
            code: "E_TOOL",
          });
          break;
        }
        try {
          const out = await runSpawnCommand(ws, parts, COMMAND_TIMEOUT_MS);
          sendAgentToolResult(ws, id, { ok: true, result: out });
          auditLine("agent.tool", {
            workspaceId: ws.workspaceIdForAudit || "",
            name: "run_command",
            ok: true,
          });
        } finally {
          concurrentRelease(ws, "runCmd");
        }
        break;
      }
      case "start_server": {
        const bgProcs = ws._bgProcs || (ws._bgProcs = new Map());
        if (bgProcs.size >= 2) {
          sendAgentToolResult(ws, id, {
            ok: false,
            err: "RATE_LIMIT: max 2 background servers per session",
            code: "E_TOOL",
          });
          break;
        }
        try {
          const cmd = String(args.command ?? "").trim();
          const port = Number(args.port);
          if (!cmd) throw new Error("command required");
          if (!port || port < 1 || port > 65535) throw new Error("valid port required (1-65535)");
          const parts = cmd.split(/\s+/).filter(Boolean);
          const bin = parts[0];
          if (!bin || !RUN_COMMAND_ALLOW.has(bin)) {
            throw new Error(`binary not allowed: ${bin || "(empty)"}`);
          }
          const child = spawn(bin, parts.slice(1), {
            cwd: requireActiveCwdFor(ws),
            shell: false,
            env: { ...process.env },
            stdio: ["ignore", "pipe", "pipe"],
          });
          busyTracker.trackChildProcess(child, "start_server");
          const bgId = `bg_${++bgIdCounter}`;
          let initialOut = "";
          const cap = MAX_CMD_OUT_BYTES;
          child.stdout?.on("data", (d) => {
            if (initialOut.length < cap) initialOut += d.toString();
          });
          child.stderr?.on("data", (d) => {
            if (initialOut.length < cap) initialOut += d.toString();
          });
          let exited = false;
          child.on("exit", (code) => {
            exited = true;
            bgProcs.delete(bgId);
            safeLog(`[bg ${bgId}] exited code=${code}`);
          });
          child.on("error", (err) => {
            exited = false;
            bgProcs.delete(bgId);
            safeLog(`[bg ${bgId}] error: ${err.message}`);
          });
          bgProcs.set(bgId, { child, command: cmd, port });
          const ready = await waitForPort(port, 15000);
          sendAgentToolResult(ws, id, {
            ok: true,
            result: {
              id: bgId,
              port,
              ready,
              exited,
              initialOutput: initialOut.slice(0, 4096),
            },
          });
          auditLine("agent.tool", {
            workspaceId: ws.workspaceIdForAudit || "",
            name: "start_server",
            ok: true,
          });
        } catch (e) {
          sendAgentToolResult(ws, id, {
            ok: false,
            err: e.message || String(e),
            code: "E_TOOL",
          });
        }
        break;
      }
      case "browse_url": {
        try {
          const url = String(args.url ?? "").trim();
          if (!url) throw new Error("url required");
          try { new URL(url); } catch { throw new Error("invalid URL"); }
          sendAgentToolResult(ws, id, { ok: true, result: { url, action: "browse" } });
          auditLine("agent.tool", {
            workspaceId: ws.workspaceIdForAudit || "",
            name: "browse_url",
            ok: true,
          });
        } catch (e) {
          sendAgentToolResult(ws, id, {
            ok: false,
            err: e.message || String(e),
            code: "E_TOOL",
          });
        }
        break;
      }
      case "apply_patch": {
        const p = String(args.path ?? "");
        const hunksRaw = Array.isArray(args.hunks) ? args.hunks : null;
        if (!hunksRaw || hunksRaw.length === 0) {
          throw new Error("hunks required");
        }
        if (hunksRaw.length > 200) {
          throw new Error("too many hunks");
        }
        const full = safeFullFor(ws, p);
        const before = await fs.readFile(full, "utf8");
        if (Buffer.byteLength(before, "utf8") > MAX_WRITE_BYTES) {
          throw new Error("file too large");
        }

        let after = before;
        const replacements = [];

        for (let i = 0; i < hunksRaw.length; i++) {
          const h =
            hunksRaw[i] && typeof hunksRaw[i] === "object" ? hunksRaw[i] : null;
          if (!h) throw new Error(`invalid hunk at index ${i}`);
          const oldText = String(h.oldText ?? "");
          const newText = String(h.newText ?? "");
          const replaceAll = Boolean(h.replaceAll);
          if (!oldText) throw new Error(`hunk ${i}: oldText required`);

          const hitCount = countOccurrences(after, oldText);
          if (hitCount === 0) throw new Error(`hunk ${i}: context not found`);
          if (!replaceAll && hitCount > 1) {
            throw new Error(`hunk ${i}: context is ambiguous; set replaceAll`);
          }

          if (replaceAll) {
            after = after.split(oldText).join(newText);
            replacements.push({ index: i, count: hitCount, replaceAll: true });
          } else {
            const next = replaceFirst(after, oldText, newText);
            if (next == null) throw new Error(`hunk ${i}: context not found`);
            after = next;
            replacements.push({ index: i, count: 1, replaceAll: false });
          }
        }

        if (Buffer.byteLength(after, "utf8") > MAX_WRITE_BYTES) {
          throw new Error("patched content too large");
        }

        const changed = after !== before;
        if (changed) {
          await fs.writeFile(full, after, "utf8");
        }
        sendAgentToolResult(ws, id, {
          ok: true,
          result: {
            path: p,
            applied: true,
            changed,
            hunksApplied: hunksRaw.length,
            replacements,
            before,
            after,
          },
        });
        break;
      }
      case "setup.run": {
        // Mobile-callable: clone repo + install deps on the persistent /workspace
        // volume. Streams progress via repo.setup pushes (handled by mobile's
        // useRepoSetup → RepoSetupDrawer). Final completion lands as both an
        // ack here AND a `repo.setup` push with stage:"ready". Mobile flips DDB
        // setupState=ready via POST /repos/open {markReady:true} after the push.
        await runSetupRun(ws, id, args);
        break;
      }
      default:
        if (name.startsWith("mcp__")) {
          try {
            const result = await mcpManager.callTool(name, args);
            sendAgentToolResult(ws, id, { ok: true, result });
            auditLine("agent.tool", { name, ok: true });
          } catch (e) {
            sendAgentToolResult(ws, id, {
              ok: false,
              err: String(e?.message || e),
              code: "E_MCP",
            });
          }
        } else {
          sendAgentToolResult(ws, id, {
            ok: false,
            err: `unknown tool: ${name}`,
            code: "E_TOOL",
          });
        }
    }
  } catch (e) {
    sendAgentToolResult(ws, id, {
      ok: false,
      err: String(e?.message || e),
      code: e?.code === "E_NO_ACTIVE_REPO" ? "E_NO_ACTIVE_REPO" : "E_TOOL",
    });
  }
}

async function handleFsMessage(ws, msg) {
  const id = msg.id;
  if (typeof id !== "number") return;

  try {
    switch (msg.t) {
      case "fs.list": {
        const maxDepth = Number(msg.maxDepth) || 5;
        const rel = safeRel(msg.path ?? "");
        const tree = await fsListRecursive(ws, rel, 0, maxDepth);
        sendFsResp(ws, id, { ok: true, tree });
        break;
      }
      case "fs.read": {
        const full = safeFullFor(ws, msg.path);
        const content = await fs.readFile(full, "utf8");
        sendFsResp(ws, id, { ok: true, content });
        break;
      }
      case "fs.read_b64": {
        const full = safeFullFor(ws, msg.path);
        const st = await fs.stat(full);
        const MAX = 20 * 1024 * 1024;
        if (st.size > MAX) {
          sendFsResp(ws, id, {
            ok: false,
            err: `file too large for binary read (>${MAX} bytes)`,
          });
          break;
        }
        const buf = await fs.readFile(full);
        sendFsResp(ws, id, { ok: true, content: buf.toString("base64") });
        break;
      }
      case "fs.write": {
        const full = safeFullFor(ws, msg.path);
        await fs.writeFile(full, String(msg.content ?? ""), "utf8");
        sendFsResp(ws, id, { ok: true });
        break;
      }
      case "fs.mkdir": {
        const full = safeFullFor(ws, msg.path);
        await fs.mkdir(full, { recursive: true });
        sendFsResp(ws, id, { ok: true });
        break;
      }
      case "fs.rm": {
        const full = safeFullFor(ws, msg.path);
        const st = await fs.stat(full);
        if (st.isDirectory()) {
          await fs.rm(full, { recursive: true, force: true });
        } else {
          await fs.unlink(full);
        }
        sendFsResp(ws, id, { ok: true });
        break;
      }
      case "fs.rename": {
        const from = safeFullFor(ws, msg.from);
        const to = safeFullFor(ws, msg.to);
        await fs.rename(from, to);
        sendFsResp(ws, id, { ok: true });
        break;
      }
      default:
        sendFsResp(ws, id, {
          ok: false,
          err: `unknown fs RPC: ${String(msg.t)}`,
        });
        break;
    }
  } catch (e) {
    sendFsResp(ws, id, {
      ok: false,
      err: String(e?.message || e),
      ...(e?.code === "E_NO_ACTIVE_REPO" ? { code: "E_NO_ACTIVE_REPO" } : {}),
    });
  }
}

function sendGitResp(ws, id, payload) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify({ t: "git.resp", id, ...payload }));
  }
}

async function handleGitMessage(ws, msg) {
  const id = msg.id;
  if (typeof id !== "number") return;

  try {
    switch (msg.t) {
      case "git.status": {
        let branch = "HEAD";
        try {
          const { stdout: b } = await execFileP(
            "git",
            ["rev-parse", "--abbrev-ref", "HEAD"],
            {
              cwd: resolvedCwd,
              encoding: "utf8",
              maxBuffer: 65536,
            }
          );
          branch = (b || "").trim() || "HEAD";
        } catch {
          branch = "HEAD";
        }
        let lines = [];
        try {
          const { stdout } = await execFileP(
            "git",
            ["status", "--porcelain=1"],
            {
              cwd: resolvedCwd,
              encoding: "utf8",
              maxBuffer: 2 * 1024 * 1024,
            }
          );
          lines = stdout.split("\n").filter((l) => l.length > 0);
        } catch (e) {
          if (e?.code === 128 || e?.status === 128) {
            sendGitResp(ws, id, {
              ok: false,
              err: "not a git repository",
            });
            return;
          }
          throw e;
        }
        sendGitResp(ws, id, { ok: true, branch, lines });
        break;
      }
      case "git.log": {
        const depth = Math.min(100, Math.max(1, Number(msg.depth) || 20));
        const { stdout } = await execFileP(
          "git",
          ["log", `-${depth}`, "--format=%H\x01%s\x01%an\x01%ct"],
          {
            cwd: resolvedCwd,
            encoding: "utf8",
            maxBuffer: 2 * 1024 * 1024,
          }
        );
        const entries = [];
        for (const line of stdout.split("\n")) {
          if (!line) continue;
          const parts = line.split("\x01");
          if (parts.length < 4) continue;
          entries.push({
            oid: parts[0].slice(0, 7),
            message: parts[1],
            author: parts[2],
            timestamp: Number(parts[3]) * 1000,
          });
        }
        sendGitResp(ws, id, { ok: true, entries });
        break;
      }
      case "git.commit": {
        const message = String(msg.message ?? "").trim();
        if (!message) {
          sendGitResp(ws, id, { ok: false, err: "empty commit message" });
          return;
        }
        await execFileP("git", ["add", "-A"], {
          cwd: resolvedCwd,
          encoding: "utf8",
          maxBuffer: 1024 * 1024,
        });
        const authorName = String(msg.authorName ?? "Treena User");
        const authorEmail = String(msg.authorEmail ?? "user@treena.app");
        const { stdout, stderr } = await execFileP(
          "git",
          ["commit", "-m", message],
          {
            cwd: resolvedCwd,
            encoding: "utf8",
            maxBuffer: 1024 * 1024,
            env: {
              ...process.env,
              GIT_AUTHOR_NAME: authorName,
              GIT_AUTHOR_EMAIL: authorEmail,
              GIT_COMMITTER_NAME: authorName,
              GIT_COMMITTER_EMAIL: authorEmail,
            },
          }
        );
        const combined = `${stdout || ""}${stderr || ""}`;
        const oidMatch = /\[([a-f0-9]+)\]/i.exec(combined);
        sendGitResp(ws, id, {
          ok: true,
          oid: oidMatch ? oidMatch[1] : undefined,
          output: combined.trim(),
        });
        break;
      }
      case "git.checkout": {
        const branch = String(msg.branch ?? "").trim();
        if (!branch) {
          sendGitResp(ws, id, { ok: false, err: "missing branch" });
          return;
        }
        try {
          await execFileP(
            "git",
            ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`],
            {
              cwd: resolvedCwd,
              encoding: "utf8",
              maxBuffer: 65536,
            }
          );
          await execFileP("git", ["checkout", branch], {
            cwd: resolvedCwd,
            encoding: "utf8",
            maxBuffer: 1024 * 1024,
          });
        } catch {
          try {
            await execFileP("git", ["checkout", "-b", branch], {
              cwd: resolvedCwd,
              encoding: "utf8",
              maxBuffer: 1024 * 1024,
            });
          } catch (e) {
            sendGitResp(ws, id, {
              ok: false,
              err: String(e?.message || e),
            });
            return;
          }
        }
        sendGitResp(ws, id, { ok: true });
        break;
      }
      case "git.remote_list": {
        try {
          const { stdout } = await execFileP("git", ["remote", "-v"], {
            cwd: resolvedCwd,
            encoding: "utf8",
            maxBuffer: 65536,
          });
          const remotes = [];
          const seen = new Set();
          for (const line of stdout.split("\n")) {
            const m = /^(\S+)\s+(\S+)\s+\(fetch\)/.exec(line.trim());
            if (m && !seen.has(m[1])) {
              remotes.push({ name: m[1], fetchUrl: m[2] });
              seen.add(m[1]);
            }
          }
          sendGitResp(ws, id, { ok: true, remotes });
          auditLine("git.remote_list", {
            workspaceId: ws.workspaceIdForAudit || "",
            ok: true,
            count: remotes.length,
          });
        } catch (e) {
          sendGitResp(ws, id, { ok: false, err: String(e?.message || e) });
        }
        break;
      }
      case "git.pull":
      case "git.push": {
        const token = msg.token ? String(msg.token) : "";
        const sub = msg.t === "git.pull" ? "pull" : "push";
        const gitArgs = ["-c", "credential.helper="];
        if (token) {
          const hdr = `Authorization: Basic ${Buffer.from(`${token}:`).toString("base64")}`;
          gitArgs.push("-c", `http.extraHeader=${hdr}`);
        }
        const upBranch =
          msg.t === "git.push" && msg.setUpstream
            ? String(msg.branch ?? "").trim()
            : "";
        if (upBranch) {
          gitArgs.push("push", "-u", "origin", upBranch);
        } else {
          gitArgs.push(sub);
        }
        await execFileP("git", gitArgs, {
          cwd: resolvedCwd,
          encoding: "utf8",
          maxBuffer: 2 * 1024 * 1024,
          timeout: GIT_REMOTE_TIMEOUT_MS,
        });
        sendGitResp(ws, id, { ok: true });
        break;
      }
      default:
        sendGitResp(ws, id, {
          ok: false,
          err: `unknown git op: ${msg.t}`,
        });
    }
  } catch (e) {
    sendGitResp(ws, id, { ok: false, err: String(e?.message || e) });
  }
}

function relFromAbs(absPath) {
  const full = path.resolve(absPath);
  const rel = path.relative(resolvedCwd, full);
  const norm = rel.split(path.sep).join("/");
  if (!norm || norm.startsWith("..") || path.isAbsolute(rel)) return null;
  return norm;
}

/** Debounced fs.event broadcast to all WS clients (Phase 3). */
function startFileWatcher(wssInstance) {
  const pending = new Map();
  let debounceTimer = null;
  const DEBOUNCE_MS = 200;

  function flush() {
    debounceTimer = null;
    // Day 6.5: per-client filter + path-strip. Each client sees events scoped
    // to its own activeRepoDir; legacy clients see all events at volume-root
    // paths (preserves pre-6.5 behavior); empty-string clients (modern with
    // no active repo) get nothing.
    for (const client of wssInstance.clients) {
      if (client.readyState !== 1) continue;
      const isLegacy = client.legacyMode === true;
      const ard = client.activeRepoDir || "";
      if (!isLegacy && !ard) continue; // modern w/o active repo: skip
      const prefix = ard ? `${ard}/` : "";
      for (const [relPath, kind] of pending) {
        let outPath;
        if (isLegacy) {
          outPath = relPath; // unchanged volume-root path
        } else if (relPath === ard) {
          outPath = ""; // event on the active dir itself
        } else if (relPath.startsWith(prefix)) {
          outPath = relPath.slice(prefix.length);
        } else {
          continue; // event outside this client's scope
        }
        client.send(JSON.stringify({ t: "fs.event", kind, path: outPath }));
      }
    }
    pending.clear();
  }

  function enqueue(kind, absPath) {
    const rel = relFromAbs(absPath);
    if (rel == null) return;
    pending.set(rel, kind);
    if (!debounceTimer) debounceTimer = setTimeout(flush, DEBOUNCE_MS);
  }

  const watcher = chokidar.watch(resolvedCwd, {
    // lost+found: Fly ext4 volume auto-creates this at /workspace/lost+found
    // owned by root mode 700; chokidar can't read it as `node`, so it logs an
    // EACCES warning at startup. Ignoring silences the spam and skips a
    // pointless watch slot.
    ignored: ["**/node_modules/**", "**/.git/**", "**/lost+found", "**/lost+found/**"],
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
  });

  watcher.on("all", (event, absPath) => {
    if (event === "add" || event === "addDir") enqueue("add", absPath);
    else if (event === "change") enqueue("change", absPath);
    else if (event === "unlink" || event === "unlinkDir") enqueue("unlink", absPath);

    // Hot-reload MCP config when .treena/mcp.json changes
    if (event === "change" || event === "add") {
      const rel = relFromAbs(absPath);
      if (rel != null && mcpManager.isMcpConfigPath(rel)) {
        console.log("[mcp] Config file changed, reloading...");
        void mcpManager.reloadConfig();
      }
    }
  });

  watcher.on("error", (err) => {
    safeLog("chokidar:", err);
  });
}

function spawnPtyProcess(ws) {
  const shell = process.platform === "win32" ? "powershell.exe" : "bash";
  // Day 6.5: pty cwd scopes to the active repo. Bug 2 (terminal can `cd
  // /workspace` and see siblings) is intentionally deferred — this just sets
  // the default landing dir.
  const cwd = requireActiveCwdFor(ws);
  return pty.spawn(shell, [], {
    name: "xterm-256color",
    cols: 80,
    rows: 24,
    cwd,
    env: {
      ...process.env,
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
    },
  });
}

function wireAuthenticatedSocket(ws, initialProc, sessionWorkspaceId) {
  const ptys = new Map();

  function attachPty(terminalId, p) {
    ptys.set(terminalId, p);
    p.onData((data) => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ t: "out", d: data, terminalId }));
      }
    });
    p.onExit(() => {
      ptys.delete(terminalId);
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ t: "out", d: "\r\n[pty exited]\r\n", terminalId }));
        if (ptys.size === 0) ws.close();
      }
    });
  }

  attachPty("t1", initialProc);

  ws.on("message", (rawBuf) => {
    const raw = rawBuf.toString();
    if (raw.length > MAX_WS_FRAME_BYTES) {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ t: "err", m: "message too large", code: "FRAME_TOO_LARGE" }));
      }
      return;
    }
    const ip = ws._clientIp || "unknown";
    if (!ipRateOk(ip)) {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ t: "err", m: "rate limit (ip)", code: "RATE_LIMIT" }));
      }
      return;
    }
    if (!wsMessageRateOk(ws)) {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ t: "err", m: "rate limit (session)", code: "RATE_LIMIT" }));
      }
      return;
    }
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (typeof msg?.t === "string" && msg.t.startsWith("fs.")) {
      void handleFsMessage(ws, msg);
      return;
    }
    if (msg.t === "agent.tool") {
      void handleAgentTool(ws, msg);
      return;
    }
    if (msg.t === "mcp.refresh") {
      void mcpManager.reloadConfig();
      return;
    }
    if (msg.t === "mcp.setRuntimeConfig") {
      const serverKeys =
        msg.servers && typeof msg.servers === "object"
          ? Object.keys(msg.servers)
          : [];
      auditLine("mcp.setRuntimeConfig", {
        workspaceId: ws.workspaceIdForAudit || "",
        clear: msg.clear === true,
        serverCount: serverKeys.length,
        serverNames: serverKeys.slice(0, 20),
      });
      void mcpManager
        .setRuntimeConfig({
          clear: msg.clear === true,
          servers:
            msg.servers && typeof msg.servers === "object"
              ? msg.servers
              : undefined,
        })
        .catch((e) => {
          if (ws.readyState === 1) {
            ws.send(
              JSON.stringify({
                t: "err",
                m: `mcp.setRuntimeConfig: ${e?.message || e}`,
              })
            );
          }
        });
      return;
    }
    if (typeof msg?.t === "string" && msg.t.startsWith("git.")) {
      void handleGitMessage(ws, msg);
      return;
    }
    if (
      msg.t === "workspace.search" ||
      msg.t === "workspace.status" ||
      msg.t === "diagnostics.file" ||
      msg.t === "workspace.embed_search"
    ) {
      void handleWorkspaceRpc(ws, msg);
      return;
    }
    // Phase 3A — graceful-vs-unexpected disconnect signaling.
    // Client sends `client.bg` on AppState=background (locked screen, app
    // switch, swipe-to-home) BEFORE iOS suspends its network. Bridge uses the
    // recency of this timestamp at WS-close time to pick a long (graceful) vs
    // short (unexpected/force-close) auto-destroy timeout.
    if (msg.t === "client.bg") {
      lastClientBgAt = Date.now();
      return;
    }
    if (msg.t === "client.fg") {
      lastClientBgAt = 0; // back in foreground; clear the graceful flag
      return;
    }
    if (msg.t === "lsp.req") {
      void handleLspReq(ws, msg);
      return;
    }
    if (msg.t === "in" && typeof msg.d === "string") {
      const tid = typeof msg.terminalId === "string" ? msg.terminalId : "t1";
      let p = ptys.get(tid);
      if (!p) {
        try {
          p = spawnPtyProcess(ws);
          attachPty(tid, p);
        } catch (e) {
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({ t: "err", m: String(e?.message || e), terminalId: tid }));
          }
          return;
        }
      }
      p.write(msg.d);
    }
    if (msg.t === "resize" && msg.cols > 0 && msg.rows > 0) {
      const tid = typeof msg.terminalId === "string" ? msg.terminalId : "t1";
      let p = ptys.get(tid);
      if (!p) {
        try {
          p = spawnPtyProcess(ws);
          attachPty(tid, p);
          if (ws.readyState === 1) {
            const ptyCwd = getActiveCwdFor(ws) || CWD;
            ws.send(JSON.stringify({ t: "out", d: "\r\n[connected] cwd=" + ptyCwd + "\r\n", terminalId: tid }));
          }
        } catch (e) {
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({ t: "err", m: String(e?.message || e), terminalId: tid }));
          }
        }
      }
      if (p) p.resize(msg.cols, msg.rows);
    }
  });

  ws.on("close", () => {
    for (const [, p] of ptys) {
      try {
        p.kill();
      } catch {
        /* ignore */
      }
    }
    ptys.clear();
    if (ws._bgProcs) {
      for (const [, bg] of ws._bgProcs) {
        try {
          bg.child.kill("SIGTERM");
        } catch {
          /* ignore */
        }
      }
      ws._bgProcs.clear();
    }
    if (ws._runCmdBgChildren) {
      for (const ch of ws._runCmdBgChildren) {
        try {
          ch.kill("SIGTERM");
        } catch {
          /* ignore */
        }
      }
      ws._runCmdBgChildren.clear();
    }
    if (ws.lsp?.child) {
      try {
        ws.lsp.child.kill("SIGKILL");
      } catch {
        /* ignore */
      }
      ws.lsp = null;
    }
  });

  sendSessionOk(ws, sessionWorkspaceId || "");
  // Push MCP server status to newly connected client
  try {
    const mcpStatus = mcpManager.getStatus();
    if (Object.keys(mcpStatus).length > 0) {
      ws.send(JSON.stringify({ t: "mcp.status", servers: mcpStatus }));
    }
  } catch { /* ignore */ }
  const initialPtyCwd = getActiveCwdFor(ws) || CWD;
  ws.send(JSON.stringify({ t: "out", d: "\r\n[connected] cwd=" + initialPtyCwd + "\r\n", terminalId: "t1" }));
}

function spawnPtyAndAttach(ws, sessionWorkspaceId) {
  // Mobile app embeds xterm.js (WebView) for remote PTY — full VT / TUIs
  // (e.g. Claude Code). Use a normal shell + xterm TERM; client sends resize.
  let proc;
  try {
    proc = spawnPtyProcess(ws);
  } catch (e) {
    ws.send(JSON.stringify({ t: "err", m: String(e?.message || e) }));
    ws.close();
    return;
  }

  wireAuthenticatedSocket(ws, proc, sessionWorkspaceId);

  // Send current workspace bootstrap status to the just-authenticated client.
  // Subsequent state changes are pushed via broadcastWorkspaceStatus().
  if (ws.readyState === 1) {
    try {
      ws.send(
        JSON.stringify({
          t: "workspace.status",
          status: workspaceStatus,
          repoUrl: GITHUB_REPO_URL || null,
          error: workspaceCloneError,
        })
      );
    } catch {
      /* ignore */
    }
  }
}

// HTTP on same port as WebSocket. Legacy path proxy for dev previews — prefer direct
// http://task-ip:dev-port in the app (see lib/terminalBrowseUrl.ts) so /asset paths resolve.
const MAX_CLAIM_BODY_BYTES = 64 * 1024;

async function handleClaim(req, res) {
  if (!REQUIRES_CLAIM) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "claim disabled" }));
    return;
  }
  if (claimed) {
    res.writeHead(409, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "already claimed" }));
    return;
  }

  // Buffer body with a hard size cap so a malformed/hostile request can't OOM us.
  const chunks = [];
  let total = 0;
  let aborted = false;
  await new Promise((resolve) => {
    req.on("data", (chunk) => {
      if (aborted) return;
      total += chunk.length;
      if (total > MAX_CLAIM_BODY_BYTES) {
        aborted = true;
        res.writeHead(413, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "body too large" }));
        req.destroy();
        resolve();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", resolve);
    req.on("error", () => {
      aborted = true;
      resolve();
    });
  });
  if (aborted) return;

  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "invalid json" }));
    return;
  }

  // Timing-safe claim token compare.
  const provided = typeof body.claimToken === "string" ? body.claimToken : "";
  const expBuf = Buffer.from(CLAIM_TOKEN, "utf8");
  const gotBuf = Buffer.from(provided, "utf8");
  if (
    expBuf.length !== gotBuf.length ||
    !crypto.timingSafeEqual(expBuf, gotBuf)
  ) {
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "invalid claim token" }));
    return;
  }

  // Adopt user-specific state. Order matters: set BRIDGE_TOKEN before flipping
  // `claimed = true` so any WS connect that lands the same tick has the right
  // token to compare against.
  if (typeof body.bridgeToken === "string" && body.bridgeToken.trim()) {
    BRIDGE_TOKEN = body.bridgeToken.trim();
  }
  if (typeof body.repoUrl === "string") GITHUB_REPO_URL = body.repoUrl.trim();
  if (typeof body.branch === "string") GITHUB_BRANCH = body.branch.trim();
  if (typeof body.sessionId === "string") TREENA_SESSION_ID = body.sessionId.trim();
  if (typeof body.githubToken === "string") cachedGithubToken = body.githubToken;
  if (typeof body.claudeOauthToken === "string" && body.claudeOauthToken) {
    process.env.CLAUDE_CODE_OAUTH_TOKEN = body.claudeOauthToken;
  }
  if (typeof body.codexApiKey === "string" && body.codexApiKey) {
    process.env.OPENAI_API_KEY = body.codexApiKey;
  }

  claimed = true;
  console.log(`[claim] adopted session=${TREENA_SESSION_ID} repo=${GITHUB_REPO_URL || "(none)"}`);

  startCloudAutoDestroy();

  // Fire-and-forget background clone using the new state. The HTTP response
  // returns immediately so the API can hand the WS URL to the user without
  // waiting for the clone — same pattern as Phase 1 cold-launch.
  void bootstrapWorkspace();
  // Ensure MCP picks up any .treena/mcp.json from the freshly-cloned repo.
  void mcpManager.reloadConfig().catch(() => { /* best-effort */ });

  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: true }));
}

const httpServer = http.createServer((req, res) => {
  // Phase 2 warm pool: lightweight readiness probe for the API's pool poller.
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        requiresClaim: REQUIRES_CLAIM,
        claimed,
        workspaceStatus,
      })
    );
    return;
  }
  // Idle-stop probe (consumed by api.mjs idleStop daemon via Fly proxy).
  // Conservative: any uncertainty in the daemon is treated as "active", so
  // returning here without a fast/correct answer is safe — but slow returns
  // burn API rate budget, so keep it cheap and synchronous.
  if (req.method === "GET" && req.url === "/busy") {
    const state = busyTracker.getBusyState({ workspaceStatus });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(state));
    return;
  }
  // Phase 2 warm pool: bridge adoption endpoint.
  if (req.method === "POST" && req.url === "/claim") {
    void handleClaim(req, res);
    return;
  }

  const match = req.url.match(/^\/__dev\/(\d+)(\/.*)?$/);
  if (!match) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  const targetPort = Number(match[1]);
  const targetPath = match[2] || "/";
  if (targetPort < 1 || targetPort > 65535) {
    res.writeHead(400);
    res.end("bad port");
    return;
  }
  const proxyHeaders = { ...req.headers, host: `localhost:${targetPort}` };
  delete proxyHeaders["accept-encoding"]; // avoid compressed responses we can't relay
  const proxyReq = http.request(
    {
      hostname: "127.0.0.1",
      port: targetPort,
      path: targetPath,
      method: req.method,
      headers: proxyHeaders,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );
  proxyReq.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(502);
      res.end("dev server not reachable on port " + targetPort);
    }
  });
  req.pipe(proxyReq);
});

const wss = new WebSocketServer({ server: httpServer });
busyTracker.attachWss(wss);
wss.on("connection", (ws) => {
  busyTracker.bumpActivity("ws-connect");
  ws.on("close", () => busyTracker.bumpActivity("ws-disconnect"));
});
httpServer.listen(PORT, "0.0.0.0");

// Kick off the async workspace clone — bridge is already accepting connections,
// so the client connects immediately and observes status as it changes.
void bootstrapWorkspace();

startFileWatcher(wss);

// ── MCP server lifecycle ──
mcpManager.init(resolvedCwd);
mcpManager.onStatusChange((status) => {
  // Broadcast MCP status to all connected WebSocket clients
  const msg = JSON.stringify({ t: "mcp.status", servers: status });
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      try { client.send(msg); } catch { /* ignore */ }
    }
  }
});
void mcpManager.spawnAll();

// Clean up MCP servers on exit. Run server-side auto-save first so uncommitted
// workspace changes are pushed to a treena/<date>-<sessionId> branch before the
// container's filesystem disappears (Phase 3B).
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, async () => {
    await runAutoSaveOnExit(sig);
    await mcpManager.shutdownAll();
    process.exit(0);
  });
}

wss.on("connection", (ws, request) => {
  if (!bridgeAuthOk(request)) {
    try {
      ws.send(
        JSON.stringify({
          t: "err",
          m: "unauthorized: set BRIDGE_TOKEN on server and pass ?token= on the WebSocket URL",
        })
      );
    } catch {
      /* ignore */
    }
    ws.close(1008, "unauthorized");
    return;
  }

  ws._clientIp = clientIpFromRequest(request);
  ws.workspaceIdForAudit = "";

  // Day 6.5: per-WS active repo scope (see parseActiveRepoDir for the
  // 3-state mid-deploy fallback). Validate that the named dir actually
  // exists on the volume; if not, clear activeRepoDir so path ops surface
  // E_NO_ACTIVE_REPO and mobile knows to retry setup.run.
  const ard = parseActiveRepoDir(request);
  if (ard.state === "invalid") {
    sendSessionErr(ws, "ACTIVE_REPO_INVALID", ard.reason);
    ws.close(4003, "active repo invalid");
    return;
  }
  ws.legacyMode = ard.state === "absent";
  ws.activeRepoDir = ard.state === "valid" ? ard.repoDir : "";
  if (ws.activeRepoDir) {
    void (async () => {
      try {
        const dir = path.join(resolvedCwd, ws.activeRepoDir);
        await fs.stat(dir);
        // Inform mcpManager of the per-repo workspace so .treena/mcp.json loads.
        // Idempotent if cwd unchanged. Best-effort.
        await mcpManager.setWorkspaceDir(dir).catch(() => { /* ignore */ });
      } catch {
        ws.activeRepoDir = "";
      }
    })();
  }

  if (!JWT_SECRET) {
    ws.workspaceIdForAudit = WORKSPACE_ID_BIND || "";
    spawnPtyAndAttach(ws, ws.workspaceIdForAudit);
    auditLine("session.open", {
      workspaceId: ws.workspaceIdForAudit,
      jwt: false,
      legacyMode: ws.legacyMode,
      activeRepoDir: ws.activeRepoDir || null,
    });
    return;
  }

  const urlJwt = jwtFromRequestUrl(request);
  if (urlJwt) {
    const v = verifyJwtHs256(urlJwt, JWT_SECRET);
    if (v === "expired") {
      sendSessionErr(ws, "JWT_EXPIRED", "jwt expired");
      ws.close(4001, "jwt expired");
      return;
    }
    if (!v || !bindWorkspaceClaims(v)) {
      sendSessionErr(ws, "JWT_INVALID", "invalid jwt");
      ws.close(4002, "invalid jwt");
      return;
    }
    ws.workspaceIdForAudit = v.workspaceId;
    spawnPtyAndAttach(ws, v.workspaceId);
    auditLine("session.open", { workspaceId: v.workspaceId, jwt: true, via: "query" });
    return;
  }

  const authTimer = setTimeout(() => {
    if (ws.readyState === 1) {
      sendSessionErr(ws, "AUTH_TIMEOUT", "send session.auth with jwt within 15s");
      ws.close(4003, "auth timeout");
    }
  }, 15_000);

  function onPreAuthMessage(rawBuf) {
    clearTimeout(authTimer);
    const raw = rawBuf.toString();
    if (raw.length > MAX_WS_FRAME_BYTES) {
      sendSessionErr(ws, "FRAME_TOO_LARGE", "message too large");
      ws.close(1009);
      return;
    }
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      sendSessionErr(ws, "AUTH_REQUIRED", "expected JSON session.auth");
      ws.close(1003);
      return;
    }
    if (msg?.t !== "session.auth" || typeof msg.jwt !== "string") {
      sendSessionErr(ws, "AUTH_REQUIRED", 'first message must be { t: "session.auth", jwt }');
      ws.close(1008);
      return;
    }
    const v = verifyJwtHs256(msg.jwt, JWT_SECRET);
    if (v === "expired") {
      sendSessionErr(ws, "JWT_EXPIRED", "jwt expired");
      ws.close(4001);
      return;
    }
    if (!v || !bindWorkspaceClaims(v)) {
      sendSessionErr(ws, "JWT_INVALID", "invalid jwt");
      ws.close(4002);
      return;
    }
    ws.removeListener("message", onPreAuthMessage);
    ws.workspaceIdForAudit = v.workspaceId;
    spawnPtyAndAttach(ws, v.workspaceId);
    auditLine("session.open", { workspaceId: v.workspaceId, jwt: true, via: "session.auth" });
  }

  ws.on("message", onPreAuthMessage);
});

const jwtHint = JWT_SECRET ? " [JWT_SECRET required]" : "";
const bridgeHint = BRIDGE_TOKEN ? " [BRIDGE_TOKEN required]" : "";
console.log(
  "treena-workspace-bridge: listening on 0.0.0.0:" +
    PORT +
    " (cwd=" +
    CWD +
    ")" +
    bridgeHint +
    jwtHint
);
console.log(
  "  In Treena Settings use ws://127.0.0.1:" +
    PORT +
    " (this machine), your LAN IP from another device, or ws://10.0.2.2:" +
    PORT +
    " (Android emulator)."
);

// Cloud auto-destroy: self-terminate when all clients disconnect (Fargate only).
// `beforeStop` runs server-side auto-save (Phase 3B) before StopTask so uncommitted
// work is pushed to GitHub before the container goes away.
//
// Phase 3A — two-policy timeout:
//   - graceful disconnect (client sent client.bg before close) → graceMs (long, ~50m)
//   - unexpected disconnect (no client.bg, e.g. force-close)   → unexpectedGraceMs (~2m)
// Defaults to graceMs for both so deploying the server change without the
// matching client AppState listener is safe; set AUTO_DESTROY_UNEXPECTED_GRACE_MS
// once the client is rolled out.
let autoDestroyStarted = false;
function startCloudAutoDestroy() {
  if (autoDestroyStarted) return;
  if (!process.env.FLY_MACHINE_ID) return;
  autoDestroyStarted = true;
  const graceMs = Number(process.env.AUTO_DESTROY_GRACE_MS) || 50 * 60_000;
  const unexpectedGraceMs =
    Number(process.env.AUTO_DESTROY_UNEXPECTED_GRACE_MS) || graceMs;
  import("./auto-destroy.mjs")
    .then(({ startAutoDestroy }) => {
      startAutoDestroy(wss, {
        graceMs,
        unexpectedGraceMs,
        beforeStop: () => runAutoSaveOnExit("auto-destroy-idle"),
        isLastDisconnectGraceful,
      });
    })
    .catch((e) => console.error("[cloud] auto-destroy load failed:", e));
}

// Cold-launch path starts the timer at boot. Warm-pool path defers it until
// /claim runs — otherwise an unclaimed warm task would self-terminate after
// graceMs while sitting in the pool, and the API would hand a dead bridge to
// the next user (10s claim timeout, then cold-launch fallback).
if (!REQUIRES_CLAIM) {
  startCloudAutoDestroy();
}
