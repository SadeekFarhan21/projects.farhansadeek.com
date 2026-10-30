/**
 * GitHub REST helpers for the signed-in user (numeric id, repo metadata).
 */

const USER_AGENT = "treena-mobile";

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

/** Numeric GitHub user id for the token, or null if invalid. */
export async function fetchGithubUserId(
  accessToken: string
): Promise<number | null> {
  const token = accessToken?.trim();
  if (!token) return null;
  try {
    const resp = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": USER_AGENT,
      },
      signal: abortAfter(15_000),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { id?: unknown };
    return typeof data.id === "number" && !Number.isNaN(data.id)
      ? data.id
      : null;
  } catch {
    return null;
  }
}

/** Numeric repository id for a github.com clone URL, or null. */
export async function fetchGithubRepoIdFromUrl(
  repoUrl: string,
  accessToken: string
): Promise<number | null> {
  const u = repoUrl?.trim();
  const token = accessToken?.trim();
  if (!u || !token) return null;
  const m = u.match(/github\.com[/:]([^/]+)\/([^/.]+?)(?:\.git)?$/i);
  if (!m) return null;
  const owner = m[1];
  const repo = m[2];
  try {
    const resp = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": USER_AGENT,
        },
        signal: abortAfter(15_000),
      }
    );
    if (!resp.ok) return null;
    const data = (await resp.json()) as { id?: unknown };
    return typeof data.id === "number" && !Number.isNaN(data.id)
      ? data.id
      : null;
  } catch {
    return null;
  }
}
