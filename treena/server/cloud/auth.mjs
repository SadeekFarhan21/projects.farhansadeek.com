/**
 * GitHub token validation with TTL cache.
 * Validates by calling GET https://api.github.com/user.
 */

/** @type {Map<string, { user: {id: number, login: string}, expiresAt: number }>} */
const cache = new Map();

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Validate a GitHub access token. Returns { id, login } or null.
 * @param {string} token
 * @returns {Promise<{id: number, login: string}|null>}
 */
export async function validateGithubToken(token) {
  if (!token) return null;

  const cached = cache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }

  try {
    const resp = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "treena-cloud-api",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!resp.ok) {
      cache.delete(token);
      return null;
    }

    const data = await resp.json();
    const user = { id: data.id, login: data.login };
    cache.set(token, { user, expiresAt: Date.now() + CACHE_TTL_MS });
    return user;
  } catch {
    return null;
  }
}

/**
 * Express middleware: validates Authorization header, attaches req.githubUser.
 */
export function githubAuthMiddleware() {
  return async (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    const token = auth.slice(7);
    const user = await validateGithubToken(token);
    if (!user) {
      return res.status(401).json({ error: "Invalid GitHub token" });
    }

    req.githubUser = user;
    req.githubToken = token;
    next();
  };
}
