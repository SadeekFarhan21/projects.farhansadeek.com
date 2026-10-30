/** Normalize HTTPS/SSH remote URL for PAT map keys (hostname + path, lowercase). */
export function normalizeGitFetchUrlKey(url: string): string {
  const raw = url.trim();
  if (!raw) return "";
  try {
    const u = new URL(raw.replace(/\.git$/i, ""));
    return `${u.hostname}${u.pathname}`.toLowerCase().replace(/\/$/, "");
  } catch {
    return raw.toLowerCase();
  }
}
