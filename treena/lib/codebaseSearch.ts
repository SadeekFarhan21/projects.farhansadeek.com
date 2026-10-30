import type { WorkspaceSearchMatch } from "@/lib/workspace/remoteWsBridge";

export function formatWorkspaceSearchContext(
  matches: WorkspaceSearchMatch[],
  maxLines = 80
): string {
  return matches
    .slice(0, maxLines)
    .map((m) => `${m.path}:${m.line}: ${m.text}`)
    .join("\n");
}
