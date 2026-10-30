/**
 * Shared repo-name normalization for the bridge AND api.mjs.
 *
 * Single source of truth — drift between the bridge's clone target and the
 * API's response would silently mis-route mobile's file tree to the wrong
 * directory on the volume. Keep both ends importing from here.
 *
 * Build-context note: the bridge image is built from `server/` and COPYs
 * this into `/app/cloud/repoNames.mjs` (preserves source layout so local
 * dev import path matches Docker import path). Bridge imports via
 * `./cloud/repoNames.mjs`. The api image is built from `server/cloud/`
 * with `COPY *.mjs ./` which lands this at `/app/repoNames.mjs`; api.mjs
 * imports via `./repoNames.mjs`.
 */

export function safeRepoDirName(repo) {
  return String(repo || "").replace(/[^a-zA-Z0-9_-]/g, "");
}

export function parseRepoUrl(url) {
  const m = String(url || "").match(
    /^https:\/\/github\.com\/([^/\s]+)\/([^/\s.]+)(?:\.git)?\/?$/i
  );
  if (!m) {
    throw new Error("Invalid GitHub URL — expected https://github.com/owner/repo");
  }
  return { owner: m[1], repo: m[2] };
}
