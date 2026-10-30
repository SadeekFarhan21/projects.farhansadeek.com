import { useStore } from "@/store";
import { isRemoteWorkspacePath } from "@/lib/workspace/remotePaths";
import { workspaceAuthKey } from "@/lib/workspace/bridgeIdentity";
import { normalizeGitFetchUrlKey } from "@/lib/gitFetchUrlKey";
import { remoteGitRemoteList } from "@/lib/workspace/remoteWsBridge";

/** Phase 7a: PAT for git pull/push — per bridge URL when remote, else global githubToken. */
export function getGithubPatForGitOps(): string | undefined {
  const s = useStore.getState();
  if (!isRemoteWorkspacePath(s.projectRoot)) {
    const t = s.githubToken.trim();
    return t || undefined;
  }
  const key = workspaceAuthKey(s.remoteWorkspaceWsUrl);
  const scoped = key ? (s.remoteGithubPatByKey[key] ?? "").trim() : "";
  const fallback = s.githubToken.trim();
  const v = scoped || fallback;
  return v || undefined;
}

/**
 * Phase 7+: prefers PAT from `remoteGithubPatByFetchUrl` for `origin` (or first remote),
 * then [getGithubPatForGitOps].
 */
export async function resolveGithubPatForRemoteGitOps(): Promise<string | undefined> {
  const s = useStore.getState();
  if (!isRemoteWorkspacePath(s.projectRoot)) {
    const t = s.githubToken.trim();
    return t || undefined;
  }
  try {
    const remotes = await remoteGitRemoteList();
    const pick = remotes.find((r) => r.name === "origin") ?? remotes[0];
    if (pick) {
      const k = normalizeGitFetchUrlKey(pick.fetchUrl);
      const byUrl = k ? (s.remoteGithubPatByFetchUrl[k] ?? "").trim() : "";
      if (byUrl) return byUrl;
    }
  } catch {
    /* use fallbacks */
  }
  return getGithubPatForGitOps();
}
