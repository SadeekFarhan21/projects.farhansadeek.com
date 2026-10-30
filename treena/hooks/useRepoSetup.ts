/**
 * Day 6.2 — Repo setup bridge listener.
 *
 * One-shot subscription to the bridge's `repo.setup` push messages. Mount
 * this hook ONCE at the top-level IDE component (app/index.tsx). It pumps
 * push payloads into the Zustand store's RepoSetupSlice so the
 * RepoSetupDrawer can render from store selectors anywhere it's mounted.
 *
 * On `stage: "ready"` push, automatically calls /repos/open with markReady:true
 * to flip DDB setupState. Mobile is the sole DDB writer; the bridge does NOT
 * call api.mjs back.
 *
 * The trigger side (`triggerRepoOpen`) lives in lib/userMachine.ts and is
 * stateless — callable from anywhere (event handlers in projects.tsx, etc.).
 *
 * NOTE: re-exports `RepoSetupPhase` so existing consumers
 * (components/RepoSetupDrawer.tsx) don't need import changes.
 */
import { useEffect } from "react";
import { useStore, type RepoSetupPhase } from "@/store";
import {
  openRepo as apiOpenRepo,
  getFlyApiBaseUrl,
  isFlyMode,
} from "@/lib/userMachine";
import {
  onRepoSetup,
  reconnectRemoteWsBridge,
  type RepoSetupPayload,
} from "@/lib/workspace/remoteWsBridge";

export type { RepoSetupPhase };

export function useRepoSetupListener() {
  const fly = isFlyMode();

  useEffect(() => {
    if (!fly) return;
    const unsubscribe = onRepoSetup((p: RepoSetupPayload) => {
      const state = useStore.getState();
      // Filter out pushes for repos other than the active one (the bridge
      // could in theory be running setup.run for an old repo whose drawer
      // we've moved on from).
      if (state.repoSetupActiveRepoUrl && p.repoUrl !== state.repoSetupActiveRepoUrl) {
        return;
      }

      if (p.stage === "cloning") {
        state.setRepoSetup({
          repoSetupPhase: "cloning",
          repoSetupMessage: p.message || "Cloning…",
          repoSetupError: null,
        });
      } else if (p.stage === "installing") {
        state.setRepoSetup({
          repoSetupPhase: "installing",
          repoSetupMessage: p.message || "Installing…",
          repoSetupError: null,
        });
      } else if (p.stage === "ready") {
        state.setRepoSetup({
          repoSetupPhase: "ready",
          repoSetupMessage: p.message || "Workspace ready",
          repoSetupError: null,
          repoSetupPartial: p.partial === true,
        });
        // Day 6.5: bridge sends repoName in every push. Pin the active repo
        // scope and redial the WS so subsequent path ops resolve against
        // /workspace/<repoName> instead of the volume root.
        if (p.repoName && state.currentRepoDir !== p.repoName) {
          state.setCurrentRepoDir(p.repoName);
          reconnectRemoteWsBridge();
        }
        // Flip DDB. Best-effort — local UI is the source of truth in-session.
        const apiBaseUrl = getFlyApiBaseUrl();
        if (apiBaseUrl && state.githubToken && p.repoUrl) {
          void apiOpenRepo(
            apiBaseUrl,
            state.githubToken,
            p.repoUrl,
            state.repoSetupActiveBranch,
            { markReady: true }
          ).catch((e) => {
            console.warn("[useRepoSetupListener] markReady failed:", e?.message || e);
          });
        }
      } else if (p.stage === "failed") {
        state.setRepoSetup({
          repoSetupPhase: "failed",
          repoSetupMessage: p.message || "Setup failed",
          repoSetupError: p.error || p.message || "Setup failed",
        });
      }
    });
    return unsubscribe;
  }, [fly]);
}
