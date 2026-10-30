import { useCallback } from "react";
import { Alert } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { useStore, FileNode } from "@/store";
import {
  REMOTE_PROJECT_ROOT,
  isRemoteWorkspacePath,
  joinRemotePath,
  remotePathToRel,
  remoteTreeToFileNodes,
  remoteWorkspaceDirToRel,
} from "@/lib/workspace/remotePaths";
import {
  buildRemoteWorkspaceWsUrl,
  getRemoteWsReadyState,
  remoteFsList,
  remoteFsMkdir,
  remoteFsRead,
  remoteFsReadBase64,
  remoteFsRename,
  remoteFsRm,
  remoteFsWrite,
} from "@/lib/workspace/remoteWsBridge";

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|bmp|ico|heic|heif)$/i;

const PROJECTS_DIR_PATH = FileSystem.documentDirectory + "projects/";

let warnedRemoteWsUrlMissing = false;
let remoteFileTreeRefreshInFlight = false;

function isBenignRemoteRefreshError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg === "Remote workspace not connected" ||
    msg === "Remote workspace connect timeout" ||
    msg === "Disconnected" ||
    msg === "WebSocket closed" ||
    msg === "Reconnecting" ||
    msg === "Remote FS timeout" ||
    msg.includes("Bridge session handshake timeout")
  );
}

function isRemoteMode(): boolean {
  return useStore.getState().remoteWorkspaceEnabled;
}

export function useFileSystem() {
  const setCurrentFile = useStore((s) => s.setCurrentFile);
  const setFileTree = useStore((s) => s.setFileTree);
  const setProjectRoot = useStore((s) => s.setProjectRoot);

  const ensureProjectsDir = useCallback(async () => {
    if (isRemoteMode()) return;
    const info = await FileSystem.getInfoAsync(PROJECTS_DIR_PATH);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(PROJECTS_DIR_PATH, {
        intermediates: true,
      });
    }
  }, []);

  const readFile = useCallback(async (path: string): Promise<string> => {
    if (isRemoteMode() && isRemoteWorkspacePath(path)) {
      return remoteFsRead(remotePathToRel(path));
    }
    return await FileSystem.readAsStringAsync(path, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  }, []);

  const readFileBase64 = useCallback(async (path: string): Promise<string> => {
    if (isRemoteMode() && isRemoteWorkspacePath(path)) {
      return remoteFsReadBase64(remotePathToRel(path));
    }
    return await FileSystem.readAsStringAsync(path, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }, []);

  const writeFile = useCallback(
    async (path: string, content: string): Promise<void> => {
      if (isRemoteMode() && isRemoteWorkspacePath(path)) {
        await remoteFsWrite(remotePathToRel(path), content);
        return;
      }
      await FileSystem.writeAsStringAsync(path, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    },
    []
  );

  const createFile = useCallback(
    async (dir: string, name: string): Promise<string> => {
      if (isRemoteMode() && isRemoteWorkspacePath(dir)) {
        const path = joinRemotePath(dir, name);
        await remoteFsWrite(remotePathToRel(path), "");
        return path;
      }
      const path = dir.endsWith("/") ? dir + name : dir + "/" + name;
      await FileSystem.writeAsStringAsync(path, "", {
        encoding: FileSystem.EncodingType.UTF8,
      });
      return path;
    },
    []
  );

  const createDirectory = useCallback(
    async (dir: string, name: string): Promise<string> => {
      if (isRemoteMode() && isRemoteWorkspacePath(dir)) {
        const path = joinRemotePath(dir, name);
        await remoteFsMkdir(remotePathToRel(path));
        return path;
      }
      const path = dir.endsWith("/") ? dir + name : dir + "/" + name;
      await FileSystem.makeDirectoryAsync(path, { intermediates: true });
      return path;
    },
    []
  );

  const deleteItem = useCallback(async (path: string): Promise<void> => {
    if (isRemoteMode() && isRemoteWorkspacePath(path)) {
      await remoteFsRm(remotePathToRel(path));
      return;
    }
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      await FileSystem.deleteAsync(path);
    }
  }, []);

  const renameItem = useCallback(
    async (oldPath: string, newName: string): Promise<void> => {
      if (isRemoteMode() && isRemoteWorkspacePath(oldPath)) {
        const parent = oldPath.substring(0, oldPath.lastIndexOf("/") + 1);
        const newPath = parent + newName;
        await remoteFsRename(remotePathToRel(oldPath), remotePathToRel(newPath));
        return;
      }
      const parent = oldPath.substring(0, oldPath.lastIndexOf("/") + 1);
      const newPath = parent + newName;
      await FileSystem.moveAsync({ from: oldPath, to: newPath });
    },
    []
  );

  const listDirectory = useCallback(
    async (
      dirPath: string,
      depth = 0,
      maxDepth = 5
    ): Promise<FileNode[]> => {
      if (isRemoteMode() && isRemoteWorkspacePath(dirPath)) {
        const rel = remoteWorkspaceDirToRel(dirPath);
        const tree = await remoteFsList(rel, Math.max(0, maxDepth - depth));
        return remoteTreeToFileNodes(tree, depth);
      }

      if (depth > maxDepth) return [];

      const info = await FileSystem.getInfoAsync(dirPath);
      if (!info.exists) return [];

      const entries = await FileSystem.readDirectoryAsync(dirPath);
      const nodes: FileNode[] = [];

      for (const name of entries) {
        if (name.startsWith(".") && depth === 0 && name !== ".gitignore")
          continue;

        const entryPath = dirPath.endsWith("/")
          ? dirPath + name
          : dirPath + "/" + name;
        const entryInfo = await FileSystem.getInfoAsync(entryPath);
        const isDir = entryInfo.isDirectory;

        const node: FileNode = {
          name,
          path: entryPath + (isDir ? "/" : ""),
          isDirectory: isDir,
          depth,
        };

        if (isDir) {
          node.children = await listDirectory(
            entryPath + "/",
            depth + 1,
            maxDepth
          );
        }

        nodes.push(node);
      }

      return nodes.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory)
          return a.isDirectory ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    },
    []
  );

  const openFile = useCallback(
    async (path: string, name: string) => {
      try {
        if (
          isRemoteMode() &&
          isRemoteWorkspacePath(path) &&
          getRemoteWsReadyState() !== WebSocket.OPEN
        ) {
          Alert.alert(
            "Remote workspace",
            "Not connected to the bridge. On iPhone: Settings → Privacy & Security → Local Network → enable Treena. Use the same Wi‑Fi as your PC, allow TCP 3001 in Windows Firewall, and keep the bridge running."
          );
          return;
        }
        // Images: skip the text read — ImageViewer handles the binary fetch.
        if (IMAGE_EXT_RE.test(name)) {
          setCurrentFile(path, name, "");
          return;
        }
        const cached = useStore.getState().tabContents[path];
        if (cached !== undefined) {
          setCurrentFile(path, name, cached);
          return;
        }
        const content = await readFile(path);
        useStore.getState().setTabContent(path, content);
        setCurrentFile(path, name, content);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === "Remote workspace not connected") {
          Alert.alert(
            "Remote workspace",
            "Lost connection to the bridge while opening the file. Check Wi‑Fi, firewall, and that the server is still running."
          );
          return;
        }
        console.error("Failed to open file:", err);
      }
    },
    [readFile, setCurrentFile]
  );

  const saveCurrentFile = useCallback(async () => {
    const state = useStore.getState();
    if (!state.currentFilePath) return;
    if (IMAGE_EXT_RE.test(state.currentFileName)) return;
    await writeFile(state.currentFilePath, state.currentFileContent);
    state.setTabContent(state.currentFilePath, state.currentFileContent);
  }, [writeFile]);

  const saveEditBuffer = useCallback(async () => {
    const state = useStore.getState();
    if (!state.currentFilePath) return;
    if (IMAGE_EXT_RE.test(state.currentFileName)) return;
    await writeFile(state.currentFilePath, state.editBuffer);
    state.setTabContent(state.currentFilePath, state.editBuffer);
  }, [writeFile]);

  const refreshFileTree = useCallback(
    async (projectDir?: string) => {
      try {
        if (isRemoteMode()) {
          const st = useStore.getState();
          const url = buildRemoteWorkspaceWsUrl(
            st.remoteWorkspaceWsUrl,
            st.workspaceBridgeToken
          );
          if (!url) {
            if (__DEV__ && !warnedRemoteWsUrlMissing) {
              console.warn("Remote workspace: set WebSocket URL in Settings");
              warnedRemoteWsUrlMissing = true;
            }
            return;
          }
          warnedRemoteWsUrlMissing = false;

          if (getRemoteWsReadyState() !== WebSocket.OPEN) {
            return;
          }
          // Bridge floods fs.event during clone+npm install on a fresh
          // workspace; each event schedules a refresh that competes with the
          // bridge's I/O and times out. Wait for the bridge to report ready.
          if (st.workspaceStatus === "cloning" || st.workspaceStatus === "error") {
            return;
          }
          if (remoteFileTreeRefreshInFlight) {
            return;
          }
          remoteFileTreeRefreshInFlight = true;
          try {
            const tree = remoteTreeToFileNodes(await remoteFsList("", 5));
            setFileTree(tree);
            setProjectRoot(REMOTE_PROJECT_ROOT);
          } finally {
            remoteFileTreeRefreshInFlight = false;
          }
          return;
        }

        let dir =
          projectDir || useStore.getState().projectRoot || PROJECTS_DIR_PATH;
        if (isRemoteWorkspacePath(dir)) {
          dir = PROJECTS_DIR_PATH;
        }
        await ensureProjectsDir();
        const tree = await listDirectory(dir);
        setFileTree(tree);
        const pr = useStore.getState().projectRoot;
        if (!pr || isRemoteWorkspacePath(pr)) {
          setProjectRoot(dir);
        }
      } catch (err: unknown) {
        if (isBenignRemoteRefreshError(err)) {
          return;
        }
        console.error("Failed to refresh file tree:", err);
      }
    },
    [ensureProjectsDir, listDirectory, setFileTree, setProjectRoot]
  );

  return {
    readFile,
    readFileBase64,
    writeFile,
    createFile,
    createDirectory,
    deleteItem,
    renameItem,
    listDirectory,
    openFile,
    saveCurrentFile,
    saveEditBuffer,
    refreshFileTree,
    ensureProjectsDir,
    PROJECTS_DIR: PROJECTS_DIR_PATH,
  };
}
