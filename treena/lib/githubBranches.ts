/**
 * Phase 3E (M4) — Treena auto-save branch discovery + cleanup helpers.
 *
 * The Treena bridge auto-saves uncommitted work to a branch named
 * `treena/<YYYY-MM-DD>-<sessionIdShort>` on session destroy
 * (see `lib/cloudSessionGitSave.ts:buildTreenaSessionBranchName` and
 * `server/cloudAutoSave.mjs`). Over time these accumulate. This module
 * powers the user-driven cleanup UI in SettingsModal.
 *
 * Three independent safety layers protect the user's repo:
 *  1. Strict regex match here (`TREENA_BRANCH_RE`) — only branches matching
 *     the auto-save naming convention. `treena/foo` (date-less) is excluded.
 *  2. Caller applies an age filter on top.
 *  3. Caller shows an explicit branch list before any DELETE call.
 */

const TREENA_BRANCH_RE = /^treena\/(\d{4})-(\d{2})-(\d{2})-(.+)$/;

export interface TreenaBranch {
  /** "owner/repo" — matches GitHub's full_name. */
  repoFullName: string;
  /** Branch name on GitHub, e.g. `treena/2026-04-26-abc123def456`. */
  branchName: string;
  /** Date parsed from the branch name; null only if the regex matched
   *  but the date components form an invalid Date. */
  date: Date | null;
}

interface GithubRepoMin {
  full_name: string;
}

interface GithubBranchMin {
  name: string;
}

/** Hermes / RN: AbortSignal.timeout may not exist; fall back to controller + setTimeout. */
function abortAfter(ms: number): AbortSignal {
  if (
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
  ) {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

/**
 * Pull `YYYY-MM-DD` out of a Treena auto-save branch name.
 * Returns `null` for branches that don't match the convention — those are
 * deliberately excluded from cleanup.
 */
export function parseTreenaBranchDate(name: string): Date | null {
  const m = TREENA_BRANCH_RE.exec(name);
  if (!m) return null;
  const [, y, mo, d] = m;
  const t = Date.UTC(Number(y), Number(mo) - 1, Number(d));
  if (Number.isNaN(t)) return null;
  return new Date(t);
}

/** Map across an array with a fixed concurrency limit. */
async function pMapWithLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workerCount = Math.max(1, Math.min(limit, items.length));
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array(workerCount).fill(0).map(worker));
  return results;
}

/** Iterate paged GitHub API endpoint, accumulating up to `maxPages` pages. */
async function fetchAllPages<T>(
  startUrl: string,
  init: RequestInit,
  maxPages = 10
): Promise<T[]> {
  const all: T[] = [];
  let url: string | null = startUrl;
  let page = 0;
  while (url && page < maxPages) {
    const resp: Response = await fetch(url, init);
    if (!resp.ok) {
      throw new Error(`GitHub API ${resp.status} for ${url}`);
    }
    const items = (await resp.json()) as T[];
    if (Array.isArray(items)) all.push(...items);
    // Parse next link from RFC-5988 Link header.
    const link = resp.headers.get("link");
    url = null;
    if (link) {
      const parts = link.split(",");
      for (const p of parts) {
        const m = /<([^>]+)>;\s*rel="next"/.exec(p.trim());
        if (m) {
          url = m[1];
          break;
        }
      }
    }
    page++;
  }
  return all;
}

/**
 * List every branch on a single repo. Pure GitHub API call — caller decides
 * how to sort/pin/filter. Throws on non-2xx so the caller can render an error
 * state with retry. Caps at 300 branches (3 pages of 100).
 */
export async function fetchRepoBranches(
  githubToken: string,
  repoFullName: string
): Promise<string[]> {
  const headers: HeadersInit = {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github+json",
  };
  const branches = await fetchAllPages<GithubBranchMin>(
    `https://api.github.com/repos/${repoFullName}/branches?per_page=100`,
    { headers, signal: abortAfter(15_000) },
    3
  );
  return branches.map((b) => b.name);
}

/**
 * List every Treena auto-save branch the user has push access to (i.e. their
 * own repos). Per-repo branch fetches are concurrency-capped to avoid
 * burning rate limit on users with many repos.
 */
export async function fetchTreenaBranches(
  githubToken: string
): Promise<TreenaBranch[]> {
  const headers: HeadersInit = {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github+json",
  };

  const repos = await fetchAllPages<GithubRepoMin>(
    "https://api.github.com/user/repos?type=owner&per_page=100&sort=updated",
    { headers, signal: abortAfter(20_000) },
    5
  );

  const perRepo = await pMapWithLimit(repos, 5, async (repo) => {
    const url = `https://api.github.com/repos/${repo.full_name}/branches?per_page=100`;
    try {
      const branches = await fetchAllPages<GithubBranchMin>(
        url,
        { headers, signal: abortAfter(15_000) },
        5
      );
      const out: TreenaBranch[] = [];
      for (const b of branches) {
        const date = parseTreenaBranchDate(b.name);
        if (!date) continue; // strict regex gate — silently drops non-matching
        out.push({
          repoFullName: repo.full_name,
          branchName: b.name,
          date,
        });
      }
      return out;
    } catch {
      // Skip repos that error out (rate limit, archived, etc.) rather than
      // fail the whole listing — the user can refresh.
      return [];
    }
  });

  const flat: TreenaBranch[] = [];
  for (const list of perRepo) flat.push(...list);
  // Newest first.
  flat.sort(
    (a, b) =>
      (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0)
  );
  return flat;
}

/**
 * Delete a single branch via the GitHub git refs API. Throws on non-2xx so
 * the caller can surface the error.
 */
export async function deleteTreenaBranch(
  githubToken: string,
  repoFullName: string,
  branchName: string
): Promise<void> {
  // Defense in depth — refuse anything not matching the regex even if a buggy
  // caller passed the wrong name. This is the last line before the DELETE call.
  if (!TREENA_BRANCH_RE.test(branchName)) {
    throw new Error(`refusing to delete non-treena branch: ${branchName}`);
  }
  const resp = await fetch(
    `https://api.github.com/repos/${repoFullName}/git/refs/heads/${encodeURIComponent(branchName)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
      },
      signal: abortAfter(15_000),
    }
  );
  if (!resp.ok && resp.status !== 422) {
    // 422 = ref already gone, treat as success (idempotent).
    throw new Error(`GitHub DELETE ${resp.status} for ${branchName}`);
  }
}

/** Bulk-delete with the same concurrency cap as the listing. */
export async function deleteTreenaBranches(
  githubToken: string,
  branches: TreenaBranch[]
): Promise<{ deleted: TreenaBranch[]; failed: { branch: TreenaBranch; error: string }[] }> {
  const deleted: TreenaBranch[] = [];
  const failed: { branch: TreenaBranch; error: string }[] = [];
  await pMapWithLimit(branches, 5, async (b) => {
    try {
      await deleteTreenaBranch(githubToken, b.repoFullName, b.branchName);
      deleted.push(b);
    } catch (e) {
      failed.push({
        branch: b,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  });
  return { deleted, failed };
}
