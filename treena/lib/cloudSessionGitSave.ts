import { useStore } from "@/store";
import { isRemoteWorkspacePath } from "@/lib/workspace/remotePaths";
import {
  remoteGitCheckout,
  remoteGitCommit,
  remoteGitPush,
  remoteGitStatus,
} from "@/lib/workspace/remoteWsBridge";
import { resolveGithubPatForRemoteGitOps } from "@/lib/gitRemotePat";

const AUTO_SAVE_MSG = "treena: auto-save before session end";

export function buildTreenaSessionBranchName(sessionId: string | null): string {
  const d = new Date().toISOString().slice(0, 10);
  const raw = sessionId?.replace(/[^a-zA-Z0-9]/g, "") ?? "";
  const short = raw.slice(0, 12) || "session";
  return `treena/${d}-${short}`;
}

export async function isCloudRemoteGitDirty(): Promise<boolean> {
  const s = useStore.getState();
  if (!s.remoteWorkspaceEnabled || !isRemoteWorkspacePath(s.projectRoot)) {
    return false;
  }
  try {
    const { changedPaths } = await remoteGitStatus();
    return changedPaths.length > 0;
  } catch {
    return false;
  }
}

export async function saveCloudWorkspaceToTreenaBranch(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const s = useStore.getState();
  if (!s.remoteWorkspaceEnabled || !isRemoteWorkspacePath(s.projectRoot)) {
    return { ok: true };
  }
  // Either ID drives the branch name. Fargate path uses cloudSessionId
  // (ephemeral per-tap); Fly path uses userMachineId (persistent per-user).
  const branch = buildTreenaSessionBranchName(s.cloudSessionId ?? s.userMachineId);
  try {
    await remoteGitCheckout(branch);
    const { changedPaths } = await remoteGitStatus();
    if (changedPaths.length === 0) {
      return { ok: true };
    }
    const token = await resolveGithubPatForRemoteGitOps();
    await remoteGitCommit(AUTO_SAVE_MSG, "Treena", "user@treena.app");
    await remoteGitPush(token, { branch, setUpstream: true });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
