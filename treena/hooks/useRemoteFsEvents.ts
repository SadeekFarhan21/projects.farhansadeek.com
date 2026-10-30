import { useEffect, useRef } from "react";
import { useStore } from "@/store";
import { useFileSystem } from "@/hooks/useFileSystem";
import {
  isRemoteWorkspacePath,
  remotePathToRel,
} from "@/lib/workspace/remotePaths";
import { subscribeRemoteFsEvents } from "@/lib/workspace/remoteWsBridge";

const REFRESH_DEBOUNCE_MS = 300;

/**
 * Phase 3: react to server-pushed `fs.event` — refresh remote tree and reload open file when safe.
 */
export function useRemoteFsEvents() {
  const remoteWorkspaceEnabled = useStore((s) => s.remoteWorkspaceEnabled);
  const { refreshFileTree, readFile } = useFileSystem();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!remoteWorkspaceEnabled) return;

    const unsub = subscribeRemoteFsEvents((evt) => {
      const scheduleRefresh = () => {
        if (refreshTimerRef.current != null) {
          clearTimeout(refreshTimerRef.current);
        }
        refreshTimerRef.current = setTimeout(() => {
          refreshTimerRef.current = null;
          void refreshFileTree();
        }, REFRESH_DEBOUNCE_MS);
      };

      scheduleRefresh();

      const s = useStore.getState();
      // Drop any cached content for the event path so the next open re-fetches.
      const evtAbsPath = `remote:/${evt.path.replace(/^\/+/, "").replace(/\/$/, "")}`;
      s.clearTabContent(evtAbsPath);

      const fp = s.currentFilePath;
      if (!fp || !isRemoteWorkspacePath(fp)) return;

      const openRel = remotePathToRel(fp);
      const evPath = evt.path.replace(/\/$/, "");
      const openNorm = openRel.replace(/\/$/, "");

      if (
        evt.kind === "unlink" &&
        (evPath === openNorm || openNorm.startsWith(`${evPath}/`))
      ) {
        s.clearCurrentFile();
        return;
      }

      if (evt.kind === "change" && evPath === openNorm) {
        const isAgentRunning = s.isGenerating;
        const clean = s.editBuffer === s.currentFileContent;
        if (clean || isAgentRunning) {
          // Silent reload — either no local edits, or agent is writing
          void readFile(fp).then((content) => {
            const st = useStore.getState();
            if (st.currentFilePath !== fp) return;
            st.setCurrentFile(fp, st.currentFileName, content);
            st.setEditBuffer(content);
            st.setTabContent(fp, content);
          });
        } else {
          s.setAgentStatus("Remote file changed on server (unsaved edits)");
        }
      }
    });

    return () => {
      unsub();
      if (refreshTimerRef.current != null) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [remoteWorkspaceEnabled, refreshFileTree, readFile]);
}
