import { useStore } from "@/store";
import type { WorkspaceTransport } from "./types";

/**
 * Placeholder until Phase 1: WebSocket + node-pty bridge in cloud.
 * When remote mode is on, users see a clear message instead of silent local execution.
 */
export const remoteWorkspaceTransportStub: WorkspaceTransport = {
  mode: "remote",
  async executeTerminalLine(input: string) {
    const url = useStore.getState().remoteWorkspaceWsUrl?.trim() || "";
    return [
      "treena: remote workspace (not connected)",
      `Command was not run: ${input.slice(0, 120)}${input.length > 120 ? "…" : ""}`,
      url
        ? `Terminal uses the bridge WebSocket; FS uses the same connection (${url}).`
        : "Set a WebSocket URL in Settings → Workspace, or turn off Remote workspace to use the on-device shell.",
      "",
      "See cloud engine plan: pty + WS + container.",
    ].join("\n");
  },
};
