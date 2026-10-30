import { useEffect } from "react";
import { useStore } from "@/store";
import {
  isRemoteWorkspacePath,
  remotePathToRel,
} from "@/lib/workspace/remotePaths";
import { remoteWorkspaceDiagnostics } from "@/lib/workspace/remoteWsBridge";

/** Phase 7c: TypeScript diagnostics for open remote file (server runs tsc on saved file). */
export function useRemoteFileDiagnostics() {
  const currentFilePath = useStore((s) => s.currentFilePath);
  const currentFileContent = useStore((s) => s.currentFileContent);
  const setRemoteDiagnosticsForPath = useStore(
    (s) => s.setRemoteDiagnosticsForPath
  );

  useEffect(() => {
    if (!currentFilePath || !isRemoteWorkspacePath(currentFilePath)) {
      return;
    }
    const rel = remotePathToRel(currentFilePath);
    let cancelled = false;
    const t = setTimeout(() => {
      void (async () => {
        try {
          const diags = await remoteWorkspaceDiagnostics(rel);
          if (!cancelled) setRemoteDiagnosticsForPath(rel, diags);
        } catch {
          if (!cancelled) setRemoteDiagnosticsForPath(rel, []);
        }
      })();
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [currentFilePath, currentFileContent, setRemoteDiagnosticsForPath]);
}
