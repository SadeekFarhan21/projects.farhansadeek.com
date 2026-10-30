import { useCallback, useEffect, useRef } from "react";
import { Alert, AppState, Keyboard } from "react-native";
import { router } from "expo-router";
import { useStore } from "@/store";
import { remoteFsRead } from "@/lib/workspace/remoteWsBridge";
import { isRemoteWorkspacePath } from "@/lib/workspace/remotePaths";
import {
  buildTreenaSessionBranchName,
  isCloudRemoteGitDirty,
  saveCloudWorkspaceToTreenaBranch,
} from "@/lib/cloudSessionGitSave";
import {
  createCloudSession,
  pollCloudSession,
  destroyCloudSession,
  saveAiTokens,
  CloudSessionLimitError,
} from "@/lib/cloudSession";
import { fetchGithubRepoIdFromUrl } from "@/lib/githubUser";
import {
  getCachedGithubUserId,
  saveMcpPolicyForUser,
} from "@/lib/mcpLocalPersistence";
import { getCurrentMcpRepoKey, mergeGhPolicyIntoGhrepo } from "@/lib/mcpRepoKey";

const MAX_POLL_ATTEMPTS = 90;
const INITIAL_POLL_MS = 1000;
const POLL_MULTIPLIER = 1.5;
const MAX_POLL_MS = 5000;
/**
 * Time in background before auto-stopping the cloud session.
 * Slightly below default `AUTO_DESTROY_GRACE_MS` on the server so the app
 * does not tear down first while the task is still alive.
 */
const BG_GRACE_MS = 45 * 60_000;

export function useCloudSession() {
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(false);

  const cloudApiBaseUrl = useStore((s) => s.cloudApiBaseUrl);
  const githubToken = useStore((s) => s.githubToken);
  const cloudSessionId = useStore((s) => s.cloudSessionId);
  const cloudSessionStatus = useStore((s) => s.cloudSessionStatus);

  const cancelPolling = useCallback(() => {
    abortRef.current = true;
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const destroySessionCore = useCallback(async () => {
    cancelPolling();

    const state = useStore.getState();
    const sessionId = state.cloudSessionId;
    const apiUrl = state.cloudApiBaseUrl;
    const token = state.githubToken;

    if (sessionId && apiUrl && token) {
      destroyCloudSession(apiUrl, token, sessionId);
    }

    state.setRemoteWorkspaceEnabled(false);
    state.clearCloudSession();
    state.clearCurrentFile();
    state.clearBrowserTabs();
    state.setActiveTabType("file");
    router.replace("/projects");
  }, [cancelPolling]);

  const stopSession = useCallback(
    async (options?: { interactive?: boolean }) => {
      const interactive = options?.interactive ?? false;
      const state = useStore.getState();
      const autoSave = state.autoSaveBranchOnSessionEnd;
      const branch = buildTreenaSessionBranchName(state.cloudSessionId);

      let dirty = false;
      if (
        state.remoteWorkspaceEnabled &&
        isRemoteWorkspacePath(state.projectRoot)
      ) {
        dirty = await isCloudRemoteGitDirty();
      }

      if (interactive) {
        if (dirty && !autoSave) {
          await new Promise<void>((resolve) => {
            Alert.alert(
              "Unsaved changes",
              `Save work to ${branch} on GitHub before ending this workspace?`,
              [
                { text: "Cancel", style: "cancel", onPress: () => resolve() },
                {
                  text: "End without saving",
                  style: "destructive",
                  onPress: () =>
                    void destroySessionCore().finally(() => resolve()),
                },
                {
                  text: "Save and end",
                  onPress: () =>
                    void (async () => {
                      const r = await saveCloudWorkspaceToTreenaBranch();
                      if (!r.ok) {
                        Alert.alert("Save failed", r.error, [
                          {
                            text: "Stay",
                            style: "cancel",
                            onPress: () => resolve(),
                          },
                          {
                            text: "End without saving",
                            style: "destructive",
                            onPress: () =>
                              void destroySessionCore().finally(() =>
                                resolve()
                              ),
                          },
                        ]);
                        return;
                      }
                      await destroySessionCore();
                      resolve();
                    })(),
                },
              ]
            );
          });
          return;
        }
        if (dirty && autoSave) {
          await new Promise<void>((resolve) => {
            Alert.alert(
              "End session",
              `Unsaved changes will be saved to ${branch}, then this workspace stops.`,
              [
                { text: "Cancel", style: "cancel", onPress: () => resolve() },
                {
                  text: "End session",
                  style: "destructive",
                  onPress: () =>
                    void (async () => {
                      const r = await saveCloudWorkspaceToTreenaBranch();
                      if (!r.ok) {
                        console.warn(
                          "[cloudSession] save failed:",
                          r.error
                        );
                      }
                      await destroySessionCore();
                      resolve();
                    })(),
                },
              ]
            );
          });
          return;
        }
        await new Promise<void>((resolve) => {
          Alert.alert(
            "End session",
            "Stop this workspace and return to projects?",
            [
              { text: "Cancel", style: "cancel", onPress: () => resolve() },
              {
                text: "End Session",
                style: "destructive",
                onPress: () =>
                  void destroySessionCore().finally(() => resolve()),
              },
            ]
          );
        });
        return;
      }

      if (
        state.remoteWorkspaceEnabled &&
        isRemoteWorkspacePath(state.projectRoot) &&
        dirty &&
        autoSave
      ) {
        const r = await saveCloudWorkspaceToTreenaBranch();
        if (!r.ok) {
          console.warn("[cloudSession] background auto-save failed:", r.error);
        }
      }
      await destroySessionCore();
    },
    [destroySessionCore]
  );

  /** Try to read AI CLI credentials from the VM and persist to server (DynamoDB). */
  const captureAiTokens = useCallback(async () => {
    // Wait for the bridge connection to be established
    await new Promise((r) => setTimeout(r, 10_000));
    const state = useStore.getState();
    const apiUrl = state.cloudApiBaseUrl;
    const token = state.githubToken;
    const tokens: { claudeOauthToken?: string; codexApiKey?: string } = {};

    // Claude Code: ~/.claude/.credentials.json
    try {
      const raw = await remoteFsRead("/home/node/.claude/.credentials.json");
      if (raw) {
        const creds = JSON.parse(raw);
        const refreshToken = creds?.claudeAiOauth?.refreshToken;
        if (refreshToken && typeof refreshToken === "string") {
          tokens.claudeOauthToken = refreshToken;
        }
      }
    } catch {
      // Not authenticated yet — expected on first use
    }

    // Codex CLI: ~/.codex/auth.json
    try {
      const raw = await remoteFsRead("/home/node/.codex/auth.json");
      if (raw) {
        const auth = JSON.parse(raw);
        const key = auth?.token || auth?.api_key;
        if (key && typeof key === "string") {
          tokens.codexApiKey = key;
        }
      }
    } catch {
      // Not authenticated yet — expected on first use
    }

    // Save to server (DynamoDB) if we found any tokens
    if (apiUrl && token && (tokens.claudeOauthToken || tokens.codexApiKey)) {
      saveAiTokens(apiUrl, token, tokens);
    }
  }, []);

  const startSession = useCallback(
    async (repoUrl: string | null, branch?: string | null) => {
      const state = useStore.getState();
      const apiUrl = state.cloudApiBaseUrl;
      const token = state.githubToken;

      if (!apiUrl || !token) {
        state.setCloudSession({
          cloudSessionStatus: "failed",
          cloudSessionError: "Cloud API URL or GitHub token not configured",
          cloudSessionPublicIp: null,
        });
        return;
      }

      // Clean up any existing session
      if (state.cloudSessionId) {
        await stopSession({ interactive: false });
      }

      state.setCloudSession({
        cloudSessionStatus: "provisioning",
        cloudSessionRepoUrl: repoUrl,
        cloudSessionError: null,
        cloudSessionPublicIp: null,
      });

      try {
        const resp = await createCloudSession(apiUrl, token, repoUrl, branch ?? null);

        state.setCloudSession({
          cloudSessionId: resp.sessionId,
          cloudSessionBridgeToken: resp.bridgeToken ?? null,
          cloudSessionStatus: "provisioning",
        });

        // Start polling
        abortRef.current = false;
        let attempt = 0;
        let delay = INITIAL_POLL_MS;

        const poll = async () => {
          if (abortRef.current) return;
          attempt++;

          try {
            const session = await pollCloudSession(
              apiUrl,
              token,
              resp.sessionId
            );

            if (abortRef.current) return;

            if (session.status === "ready" && session.wsUrl) {
              const repoUrl = state.cloudSessionRepoUrl;
              let cloudSessionGithubRepoId: number | null = null;
              if (repoUrl?.trim()) {
                cloudSessionGithubRepoId = await fetchGithubRepoIdFromUrl(
                  repoUrl,
                  token
                );
              }
              if (cloudSessionGithubRepoId != null) {
                const legacyKey = getCurrentMcpRepoKey({
                  cloudSessionRepoUrl: state.cloudSessionRepoUrl,
                  repoName: state.repoName,
                  remoteWorkspaceEnabled: true,
                  remoteWorkspaceWsUrl: session.wsUrl,
                });
                const ghrepoKey = `ghrepo:${cloudSessionGithubRepoId}`;
                const pol = state.mcpRepoPolicy;
                const merged = mergeGhPolicyIntoGhrepo(pol, legacyKey, ghrepoKey);
                if (merged !== pol) {
                  state.setMcpRepoPolicy(merged);
                  const uid = await getCachedGithubUserId();
                  if (uid != null) {
                    await saveMcpPolicyForUser(uid, merged);
                  }
                }
              }
              state.setCloudSession({
                cloudSessionStatus: "ready",
                cloudSessionWsUrl: session.wsUrl,
                cloudSessionPublicIp: session.publicIp?.trim() || null,
                ...(cloudSessionGithubRepoId != null
                  ? { cloudSessionGithubRepoId }
                  : {}),
              });
              state.setRemoteWorkspaceWsUrl(session.wsUrl);
              state.setWorkspaceBridgeToken(resp.bridgeToken ?? "");
              state.setRemoteWorkspaceEnabled(true);
              state.setTerminalPanelOpen(false);
              state.setTerminalExpanded(false);
              state.setAgentChatOpen(false);
              router.replace("/");
              requestAnimationFrame(() => Keyboard.dismiss());

              // Capture AI CLI tokens from VM after a delay
              // (user may authenticate during the session)
              captureAiTokens();
              return;
            }

            if (session.status === "failed") {
              state.setCloudSession({
                cloudSessionStatus: "failed",
                cloudSessionError: session.error || "Container failed to start",
                cloudSessionPublicIp: null,
              });
              return;
            }

            if (session.status === "stopped") {
              state.setCloudSession({
                cloudSessionStatus: "stopped",
                cloudSessionError: "Session was stopped",
                cloudSessionPublicIp: null,
              });
              return;
            }
          } catch (err) {
            // Polling error — retry unless max attempts
            if (attempt >= MAX_POLL_ATTEMPTS) {
              state.setCloudSession({
                cloudSessionStatus: "failed",
                cloudSessionError: "Timed out waiting for container",
                cloudSessionPublicIp: null,
              });
              return;
            }
          }

          if (attempt >= MAX_POLL_ATTEMPTS) {
            state.setCloudSession({
              cloudSessionStatus: "failed",
              cloudSessionError: "Timed out waiting for container",
              cloudSessionPublicIp: null,
            });
            return;
          }

          // Schedule next poll with backoff
          delay = Math.min(delay * POLL_MULTIPLIER, MAX_POLL_MS);
          pollTimerRef.current = setTimeout(poll, delay);
        };

        pollTimerRef.current = setTimeout(poll, delay);
      } catch (err) {
        // Phase 3D: surface the active-session-limit case to the caller so it
        // can show the smart "End [oldest]?" prompt instead of an error banner.
        if (err instanceof CloudSessionLimitError) {
          state.setCloudSession({
            cloudSessionStatus: "idle",
            cloudSessionError: null,
            cloudSessionPublicIp: null,
          });
          throw err;
        }
        state.setCloudSession({
          cloudSessionStatus: "failed",
          cloudSessionError:
            err instanceof Error ? err.message : "Failed to create session",
          cloudSessionPublicIp: null,
        });
      }
    },
    [stopSession]
  );

  // Auto-cleanup on app background (not inactive — iOS fires inactive for system UI)
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background") {
        const sessionId = useStore.getState().cloudSessionId;
        if (sessionId) {
          if (bgTimerRef.current) {
            clearTimeout(bgTimerRef.current);
            bgTimerRef.current = null;
          }
          bgTimerRef.current = setTimeout(() => {
            void stopSession({ interactive: false });
          }, BG_GRACE_MS);
        }
      } else if (nextState === "active") {
        // Came back — cancel the background cleanup if within grace
        if (bgTimerRef.current) {
          clearTimeout(bgTimerRef.current);
          bgTimerRef.current = null;
        }
      }
    });

    return () => {
      sub.remove();
      cancelPolling();
      if (bgTimerRef.current) clearTimeout(bgTimerRef.current);
    };
  }, [stopSession, cancelPolling]);

  return {
    startSession,
    stopSession,
    cloudSessionId,
    cloudSessionStatus,
    isProvisioning: cloudSessionStatus === "provisioning",
  };
}
