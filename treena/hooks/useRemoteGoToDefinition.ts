import { useCallback } from "react";
import { useStore } from "@/store";
import {
  isRemoteWorkspacePath,
  remotePathToRel,
  REMOTE_PROJECT_ROOT,
} from "@/lib/workspace/remotePaths";
import {
  getRemoteWorkspaceRootFileUri,
  remoteLspRequest,
  remoteWorkspaceFileUriForRel,
} from "@/lib/workspace/remoteWsBridge";
import { useFileSystem } from "@/hooks/useFileSystem";

function languageIdForFile(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".tsx")) return "typescriptreact";
  if (lower.endsWith(".ts")) return "typescript";
  if (lower.endsWith(".jsx")) return "javascriptreact";
  if (lower.endsWith(".js")) return "javascript";
  return "typescript";
}

function textDocLoc(
  raw: unknown
): { uri: string; range?: { start: { line: number; character: number } } } | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.uri === "string") {
    return {
      uri: o.uri,
      range: o.range as { start: { line: number; character: number } } | undefined,
    };
  }
  return null;
}

function pickDefinitionUri(result: unknown): string | null {
  if (result == null) return null;
  if (Array.isArray(result)) {
    for (const item of result) {
      const loc = textDocLoc(item);
      if (loc?.uri) return loc.uri;
    }
    return null;
  }
  const loc = textDocLoc(result);
  return loc?.uri ?? null;
}

/**
 * LSP go-to-definition on the remote bridge (typescript-language-server).
 * Uses caret position: 0-based line and character.
 */
export function useRemoteGoToDefinition() {
  const currentFilePath = useStore((s) => s.currentFilePath);
  const currentFileName = useStore((s) => s.currentFileName);
  const editBuffer = useStore((s) => s.editBuffer);
  const { openFile } = useFileSystem();

  return useCallback(
    async (line0: number, character0: number) => {
      if (!currentFilePath || !isRemoteWorkspacePath(currentFilePath)) return;
      const rel = remotePathToRel(currentFilePath);
      const uri = remoteWorkspaceFileUriForRel(rel);
      const root = getRemoteWorkspaceRootFileUri();
      if (!root) return;

      const text = editBuffer;
      const languageId = languageIdForFile(currentFileName);

      try {
        await remoteLspRequest("textDocument/didOpen", {
          textDocument: { uri, languageId, text, version: 1 },
        });

        const def = await remoteLspRequest("textDocument/definition", {
          textDocument: { uri },
          position: { line: line0, character: character0 },
        });

        const targetUri = pickDefinitionUri(def);
        if (!targetUri || !targetUri.startsWith("file:")) return;

        const normRoot = root.endsWith("/") ? root.slice(0, -1) : root;
        if (!targetUri.startsWith(normRoot)) return;

        const encTail = targetUri.slice(normRoot.length + 1);
        const relPath = encTail.split("/").map(decodeURIComponent).join("/");
        const openPath = `${REMOTE_PROJECT_ROOT}${relPath}`;
        const name = relPath.split("/").pop() || relPath;
        await openFile(openPath, name);
      } catch {
        // LSP unavailable / timed out — silently no-op so we don't surface
        // a blocking unhandled-promise-rejection toast.
      }
    },
    [currentFilePath, currentFileName, editBuffer, openFile]
  );
}
