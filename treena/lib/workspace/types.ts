/**
 * Abstraction for local device FS/shell vs cloud workspace (pty + remote FS).
 * Phase 0: terminal line execution only. Phase 2: remote list/read/write via WS bridge.
 * Phase 3+: watcher sync.
 * Phase 4: agent.tool via bridge when remote (see useAgent + remoteWsBridge).
 */
export type WorkspaceMode = "local" | "remote";

export interface WorkspaceTransport {
  readonly mode: WorkspaceMode;

  /**
   * One-shot command execution (local: simulated shell; remote: will stream over WS in Phase 1).
   */
  executeTerminalLine(input: string): Promise<string>;
}
