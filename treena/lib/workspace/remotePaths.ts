import type { FileNode } from "@/store";

/** Virtual root for cloud workspace paths (Phase 2). */
export const REMOTE_PROJECT_ROOT = "remote:/";

export function isRemoteWorkspacePath(p: string): boolean {
  return p.startsWith("remote:/");
}

/** "remote:/src/foo.ts" | "remote:/src/" → posix rel from workspace root */
export function remotePathToRel(abs: string): string {
  if (!isRemoteWorkspacePath(abs)) {
    throw new Error("Not a remote workspace path");
  }
  return abs.slice(REMOTE_PROJECT_ROOT.length).replace(/\/+$/, "");
}

/** Directory path (e.g. `remote:/` or `remote:/src/`) → relative path for the bridge. */
export function remoteWorkspaceDirToRel(dirPath: string): string {
  if (dirPath === REMOTE_PROJECT_ROOT) return "";
  const normalized = dirPath.endsWith("/") ? dirPath.slice(0, -1) : dirPath;
  return remotePathToRel(normalized);
}

export function joinRemotePath(dirPath: string, name: string): string {
  const normalizedDir = dirPath.endsWith("/") ? dirPath : `${dirPath}/`;
  let relDir = remotePathToRel(normalizedDir);
  relDir = relDir.replace(/\/+$/, "");
  const rel = relDir ? `${relDir}/${name}` : name;
  return `${REMOTE_PROJECT_ROOT}${rel}`;
}

export interface RemoteTreeNode {
  name: string;
  relPath: string;
  isDirectory: boolean;
  children?: RemoteTreeNode[];
}

export function remoteTreeToFileNodes(
  tree: RemoteTreeNode[],
  depth = 0
): FileNode[] {
  return tree.map((n) => ({
    name: n.name,
    path: n.isDirectory
      ? `${REMOTE_PROJECT_ROOT}${n.relPath}/`
      : `${REMOTE_PROJECT_ROOT}${n.relPath}`,
    isDirectory: n.isDirectory,
    depth,
    children:
      n.children && n.children.length > 0
        ? remoteTreeToFileNodes(n.children, depth + 1)
        : undefined,
  }));
}
