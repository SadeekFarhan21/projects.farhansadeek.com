import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useStore } from "@/store";
import {
  buildRemoteWorkspaceWsUrl,
  connectRemoteWsBridge,
  disconnectRemoteWsBridge,
  forceRemoteBridgeReconnect,
  getRemoteWsReadyState,
  onMcpStatus,
  onWorkspaceStatus,
  sendClientBgSignal,
  sendClientFgSignal,
  waitRemoteBridgeSession,
} from "@/lib/workspace/remoteWsBridge";
import { syncMcpRuntimeConfigToBridge } from "@/lib/mcpBridgeSync";

export function useRemoteWorkspaceConnection() {
  const remoteWorkspaceEnabled = useStore((s) => s.remoteWorkspaceEnabled);
  const remoteWorkspaceWsUrl = useStore((s) => s.remoteWorkspaceWsUrl);
  const workspaceBridgeToken = useStore((s) => s.workspaceBridgeToken);
  const workspaceSessionJwt = useStore((s) => s.workspaceSessionJwt);
  const setMcpServers = useStore((s) => s.setMcpServers);
  const setWorkspaceStatus = useStore((s) => s.setWorkspaceStatus);
  const mcpCatalogJson = useStore((s) => s.mcpCatalogJson);
  const mcpRepoPolicy = useStore((s) => s.mcpRepoPolicy);
  const cloudSessionRepoUrl = useStore((s) => s.cloudSessionRepoUrl);
  const cloudSessionGithubRepoId = useStore((s) => s.cloudSessionGithubRepoId);
  const repoName = useStore((s) => s.repoName);

  useEffect(() => {
    return onMcpStatus((servers) => setMcpServers(servers));
  }, [setMcpServers]);

  useEffect(() => {
    return onWorkspaceStatus((p) => setWorkspaceStatus(p.status, p.error));
  }, [setWorkspaceStatus]);

  useEffect(() => {
    if (!remoteWorkspaceEnabled) {
      disconnectRemoteWsBridge();
      return;
    }
    const url = buildRemoteWorkspaceWsUrl(
      remoteWorkspaceWsUrl,
      workspaceBridgeToken
    );
    if (!url) {
      disconnectRemoteWsBridge();
      return;
    }
    connectRemoteWsBridge(url, workspaceSessionJwt);
  }, [
    remoteWorkspaceEnabled,
    remoteWorkspaceWsUrl,
    workspaceBridgeToken,
    workspaceSessionJwt,
  ]);

  // AppState transitions: signal graceful background to the bridge (Phase 3A),
  // and reconnect on return since iOS may have silently killed the socket.
  useEffect(() => {
    if (!remoteWorkspaceEnabled) return;
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        // Phase 3A — emit BEFORE any await/yield. iOS suspends background
        // network within seconds; this signal must reach the bridge first so
        // the close that follows is classified as graceful, not unexpected.
        sendClientBgSignal();
        return;
      }
      if (nextState !== "active") return;
      sendClientFgSignal();
      const rs = getRemoteWsReadyState();
      if (rs === WebSocket.OPEN || rs === WebSocket.CONNECTING) {
        // Socket still alive — nothing else to do.
        return;
      }
      const url = buildRemoteWorkspaceWsUrl(
        useStore.getState().remoteWorkspaceWsUrl,
        useStore.getState().workspaceBridgeToken,
      );
      if (!url) return;
      // If we have a prior URL, force-reconnect (cancels pending backoff);
      // otherwise fall back to a fresh connect.
      forceRemoteBridgeReconnect();
      if (getRemoteWsReadyState() === null || getRemoteWsReadyState() === WebSocket.CLOSED) {
        connectRemoteWsBridge(url, useStore.getState().workspaceSessionJwt);
      }
    });
    return () => sub.remove();
  }, [remoteWorkspaceEnabled]);

  useEffect(() => {
    if (!remoteWorkspaceEnabled) return;
    let cancelled = false;
    void waitRemoteBridgeSession()
      .then(() => {
        if (!cancelled) syncMcpRuntimeConfigToBridge();
      })
      .catch(() => {
        /* session err — skip MCP push */
      });
    return () => {
      cancelled = true;
    };
  }, [
    remoteWorkspaceEnabled,
    remoteWorkspaceWsUrl,
    workspaceBridgeToken,
    workspaceSessionJwt,
    mcpCatalogJson,
    mcpRepoPolicy,
    cloudSessionRepoUrl,
    cloudSessionGithubRepoId,
    repoName,
  ]);
}
