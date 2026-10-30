import { REMOTE_PROJECT_ROOT } from "@/lib/workspace/remotePaths";

/**
 * Short label for editor tabs: parent/basename when nested, else basename.
 * Strips the `remote:/` virtual root so remote paths label cleanly.
 */

function fileBasename(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

export function formatEditorTabLabel(path: string): string {
  const stripped = path.startsWith(REMOTE_PROJECT_ROOT)
    ? path.slice(REMOTE_PROJECT_ROOT.length)
    : path;
  const norm = stripped.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = norm.split("/").filter(Boolean);
  if (parts.length <= 1) {
    return fileBasename(path);
  }
  const base = parts[parts.length - 1]!;
  const parent = parts[parts.length - 2]!;
  return `${parent}/${base}`;
}
