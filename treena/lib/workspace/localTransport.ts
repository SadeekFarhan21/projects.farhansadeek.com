import { executeCommand } from "@/lib/terminal";
import type { WorkspaceTransport } from "./types";

export const localWorkspaceTransport: WorkspaceTransport = {
  mode: "local",
  executeTerminalLine: (input: string) => executeCommand(input),
};
