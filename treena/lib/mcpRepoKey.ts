import { workspaceAuthKey as wsKey } from "@/lib/workspace/bridgeIdentity";

type RepoKeyState = {
  cloudSessionRepoUrl: string | null;
  repoName: string;
  remoteWorkspaceEnabled: boolean;
  remoteWorkspaceWsUrl: string;
};

/** Derive `owner/repo` from a GitHub clone URL when possible. */
export function repoUrlToRepoKey(url: string): string | null {
  const u = url.trim();
  if (!u) return null;
  const m = u.match(/github\.com[/:]([^/]+)\/([^/.]+?)(?:\.git)?$/i);
  if (m) return `${m[1]}/${m[2]}`.toLowerCase();
  return null;
}

/**
 * Stable key for per-repo MCP enablement (matches plan: origin / cloud repo first).
 */
export function getCurrentMcpRepoKey(s: RepoKeyState): string {
  const fromCloud = s.cloudSessionRepoUrl
    ? repoUrlToRepoKey(s.cloudSessionRepoUrl)
    : null;
  if (fromCloud) return `gh:${fromCloud}`;

  const name = s.repoName?.trim();
  if (name && s.remoteWorkspaceEnabled) {
    return `repo:${name.toLowerCase()}`;
  }

  if (s.remoteWorkspaceEnabled) {
    const k = wsKey(s.remoteWorkspaceWsUrl);
    if (k) return `ws:${k}`;
  }

  return "local";
}

export type McpPolicyRepoState = RepoKeyState & {
  cloudSessionGithubRepoId: number | null;
};

/**
 * Prefer stable GitHub repository id for cloud sessions (rename-safe); else URL/name/ws/local.
 */
export function getMcpPolicyRepoKey(s: McpPolicyRepoState): string {
  if (
    s.cloudSessionGithubRepoId != null &&
    Number.isFinite(s.cloudSessionGithubRepoId)
  ) {
    return `ghrepo:${s.cloudSessionGithubRepoId}`;
  }
  return getCurrentMcpRepoKey(s);
}

/** When `ghrepo:id` becomes available, copy policy from legacy `gh:owner/repo` if needed. */
export function mergeGhPolicyIntoGhrepo(
  policy: Record<string, string[]>,
  legacyGhKey: string,
  ghrepoKey: string
): Record<string, string[]> {
  if (legacyGhKey === ghrepoKey) return policy;
  const next = { ...policy };
  const fromLegacy = next[legacyGhKey];
  const existing = next[ghrepoKey];
  if (
    fromLegacy &&
    fromLegacy.length > 0 &&
    (!existing || existing.length === 0)
  ) {
    next[ghrepoKey] = [...fromLegacy];
    delete next[legacyGhKey];
  }
  return next;
}
