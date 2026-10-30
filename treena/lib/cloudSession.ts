/**
 * Cloud session API client + GitHub repo fetching.
 */

function formatCloudApiError(body: unknown, httpStatus: number): string {
  if (body && typeof body === "object") {
    const o = body as { error?: string; details?: string };
    const err = o.error?.trim();
    const det = o.details?.trim();
    if (err && det) return `${err}: ${det}`;
    if (det) return det;
    if (err) return err;
  }
  return `HTTP ${httpStatus}`;
}

/** Hermes / RN do not implement AbortSignal.timeout(); use AbortController instead. */
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

export interface CloudSessionResponse {
  sessionId: string;
  status: "provisioning" | "ready" | "stopping" | "stopped" | "failed";
  bridgeToken?: string;
  wsUrl?: string | null;
  repoUrl?: string | null;
  publicIp?: string | null;
  createdAt?: number;
  error?: string | null;
}

export interface CloudSessionListItem {
  sessionId: string;
  repoUrl: string | null;
  status: "provisioning" | "ready" | "stopping" | "stopped" | "failed";
  wsUrl: string | null;
  publicIp: string | null;
  createdAt: number;
  error: string | null;
}

/**
 * Phase 3D: typed error thrown when the user has hit MAX_SESSIONS_PER_USER.
 * The client surfaces this as an "End [oldest] to start [new]?" prompt
 * instead of the bare 429.
 */
export class CloudSessionLimitError extends Error {
  activeSessions: Array<{ sessionId: string; repoUrl: string | null; createdAt: number }>;
  constructor(
    message: string,
    activeSessions: Array<{ sessionId: string; repoUrl: string | null; createdAt: number }>
  ) {
    super(message);
    this.name = "CloudSessionLimitError";
    this.activeSessions = activeSessions;
  }
}

export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  clone_url: string;
  default_branch: string;
  description: string | null;
  private: boolean;
  updated_at: string;
  language: string | null;
  stargazers_count: number;
}

/**
 * Create a new cloud session (provisions a Fargate container).
 *
 * Phase 3C: pass `branch` to clone from a non-main branch — used for resuming
 * from an auto-save branch (`treena/<date>-<sessionId>`).
 *
 * Phase 3D: on HTTP 429, throws CloudSessionLimitError with the user's currently
 * active sessions so the caller can prompt the user to end one before retrying.
 */
export async function createCloudSession(
  apiBaseUrl: string,
  githubToken: string,
  repoUrl: string | null,
  branch?: string | null
): Promise<CloudSessionResponse> {
  const resp = await fetch(`${apiBaseUrl}/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${githubToken}`,
    },
    body: JSON.stringify({ repoUrl, branch: branch || null }),
    signal: abortAfter(60_000),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    if (resp.status === 429 && body && typeof body === "object") {
      const o = body as {
        error?: string;
        activeSessions?: Array<{
          sessionId: string;
          repoUrl: string | null;
          createdAt: number;
        }>;
      };
      throw new CloudSessionLimitError(
        o.error || "Active session limit reached",
        Array.isArray(o.activeSessions) ? o.activeSessions : []
      );
    }
    throw new Error(formatCloudApiError(body, resp.status));
  }

  return resp.json() as Promise<CloudSessionResponse>;
}

/**
 * Phase 3C: list the authenticated user's recent cloud sessions. Used by
 * the projects screen to render Active / Resume? affordances.
 */
export async function listCloudSessions(
  apiBaseUrl: string,
  githubToken: string
): Promise<CloudSessionListItem[]> {
  const resp = await fetch(`${apiBaseUrl}/sessions`, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
    },
    signal: abortAfter(15_000),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(formatCloudApiError(body, resp.status));
  }
  const data = (await resp.json()) as { sessions?: CloudSessionListItem[] };
  return Array.isArray(data.sessions) ? data.sessions : [];
}

/**
 * Poll a cloud session for status updates.
 */
export async function pollCloudSession(
  apiBaseUrl: string,
  githubToken: string,
  sessionId: string
): Promise<CloudSessionResponse> {
  const resp = await fetch(`${apiBaseUrl}/sessions/${sessionId}`, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
    },
    signal: abortAfter(15_000),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(formatCloudApiError(body, resp.status));
  }

  return resp.json() as Promise<CloudSessionResponse>;
}

/**
 * Save AI CLI tokens (Claude Code, Codex) to the server for the authenticated user.
 * Tokens are stored in DynamoDB keyed by GitHub user ID.
 */
export async function saveAiTokens(
  apiBaseUrl: string,
  githubToken: string,
  tokens: { claudeOauthToken?: string; codexApiKey?: string }
): Promise<void> {
  await fetch(`${apiBaseUrl}/user/ai-tokens`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${githubToken}`,
    },
    body: JSON.stringify(tokens),
    signal: abortAfter(15_000),
  }).catch(() => {
    // Best effort — tokens will be captured again next session
  });
}

/**
 * Destroy a cloud session (stops the Fargate container).
 */
export async function destroyCloudSession(
  apiBaseUrl: string,
  githubToken: string,
  sessionId: string
): Promise<void> {
  await fetch(`${apiBaseUrl}/sessions/${sessionId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${githubToken}`,
    },
    signal: abortAfter(15_000),
  }).catch(() => {
    // Best effort — container auto-destroys anyway
  });
}

/**
 * Fetch the authenticated user's GitHub repositories.
 */
export async function fetchGithubRepos(
  githubToken: string
): Promise<GithubRepo[]> {
  const resp = await fetch(
    "https://api.github.com/user/repos?sort=updated&per_page=50&type=owner",
    {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
      },
      signal: abortAfter(15_000),
    }
  );

  if (!resp.ok) {
    throw new Error(`GitHub API error: ${resp.status}`);
  }

  return resp.json() as Promise<GithubRepo[]>;
}
