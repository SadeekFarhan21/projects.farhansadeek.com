import { useStore } from "@/store";
import type { WorkspaceTransport } from "./types";
import { localWorkspaceTransport } from "./localTransport";
import { remoteWorkspaceTransportStub } from "./remoteTransportStub";

export type { WorkspaceMode, WorkspaceTransport } from "./types";
export { localWorkspaceTransport } from "./localTransport";
export { remoteWorkspaceTransportStub } from "./remoteTransportStub";
export {
  REMOTE_PROJECT_ROOT,
  isRemoteWorkspacePath,
} from "./remotePaths";
export { workspaceAuthKey } from "./bridgeIdentity";
export {
  buildRemoteWorkspaceWsUrl,
  connectRemoteWsBridge,
  disconnectRemoteWsBridge,
  getRemoteWorkspaceRootFileUri,
  normalizeWsUrl,
  remoteGitRemoteList,
  remoteLspRequest,
  remoteWorkspaceFileUriForRel,
  subscribeRemoteFsEvents,
  invokeRemoteAgentTool,
  remoteGitStatus,
  remoteGitLog,
  remoteGitCommit,
  remoteGitPull,
  remoteGitPush,
  remoteWorkspaceSearch,
  remoteWorkspaceDiagnostics,
} from "./remoteWsBridge";
export type {
  RemoteFsEvent,
  RemoteFsEventKind,
  WorkspaceSearchMatch,
  GitRemoteInfo,
  LspRpcResp,
} from "./remoteWsBridge";

export function getWorkspaceTransport(): WorkspaceTransport {
  if (useStore.getState().remoteWorkspaceEnabled) {
    return remoteWorkspaceTransportStub;
  }
  return localWorkspaceTransport;
}
