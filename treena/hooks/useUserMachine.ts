/**
 * Fly per-user machine lifecycle hook (replaces useCloudSession on the Fly path).
 *
 * Mount → call POST /users/ensure to bootstrap the user's persistent machine
 * (idempotent — returning users see their existing row). Once a machineId is
 * known, poll GET /machines/me/status until state="started". The status
 * endpoint also auto-wakes a stopped machine server-side (Day 3.5 fix —
 * Fly's auto_start_machines doesn't wake force-pinned stopped machines, so
 * the API server calls startMachine for us).
 *
 * Once started, the hook wires the workspace slice (wsUrl + bridgeToken +
 * enabled flag) so the existing useRemoteWorkspaceConnection hook opens the
 * WS to the bridge. The fly-force-instance-id header is added automatically
 * inside connectRemoteWsBridge by parsing the `?machine=` query param.
 *
 * Differences from useCloudSession (deliberate):
 *   - NO 45-min background grace timer (machine is persistent, idle-stop on server)
 *   - NO clearCloudSession / DELETE /sessions calls (machine survives stop/start)
 *   - On AppState active, poll status (which re-wakes if stopped)
 *
 * Early-returns when EXPO_PUBLIC_USE_FLY is not "true" so the legacy Fargate
 * path remains untouched during cutover.
 */
import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useStore } from "@/store";
import {
  ensureUserMachine,
  getMachineStatus,
  getFlyApiBaseUrl,
  isFlyMode,
} from "@/lib/userMachine";
import {
  isCloudRemoteGitDirty,
  saveCloudWorkspaceToTreenaBranch,
} from "@/lib/cloudSessionGitSave";

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 60; // ~90s of polling worst case

export function useUserMachine() {
  const isFly = isFlyMode();
  const apiBaseUrl = getFlyApiBaseUrl();

  const githubToken = useStore((s) => s.githubToken);
  const userMachineId = useStore((s) => s.userMachineId);
  const userMachineState = useStore((s) => s.userMachineState);
  const setUserMachine = useStore((s) => s.setUserMachine);
  const setRemoteWorkspaceWsUrl = useStore((s) => s.setRemoteWorkspaceWsUrl);
  const setWorkspaceBridgeToken = useStore((s) => s.setWorkspaceBridgeToken);
  const setRemoteWorkspaceEnabled = useStore((s) => s.setRemoteWorkspaceEnabled);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAbortRef = useRef(false);

  const cancelPolling = useCallback(() => {
    pollAbortRef.current = true;
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  /**
   * Poll /machines/me/status until state="started". Server-side wake fires on
   * the first call if the machine is stopped (Day 3.5 pattern), so we don't
   * need a separate POST /machines/me/wake — just polling is enough.
   *
   * Once started, wire the workspace slice so useRemoteWorkspaceConnection
   * opens the WS. Idempotent on re-entry — a second concurrent poll is
   * cancelled by the next pollAbortRef toggle.
   */
  const pollUntilStarted = useCallback(async () => {
    if (!isFly || !apiBaseUrl || !githubToken) return;
    cancelPolling();
    pollAbortRef.current = false;
    let attempts = 0;

    const tick = async () => {
      if (pollAbortRef.current) return;
      attempts += 1;
      let status;
      try {
        status = await getMachineStatus(apiBaseUrl, githubToken);
      } catch {
        // Transient — retry until MAX_POLL_ATTEMPTS
        if (attempts >= MAX_POLL_ATTEMPTS) return;
        pollTimerRef.current = setTimeout(tick, POLL_INTERVAL_MS);
        return;
      }
      if (pollAbortRef.current) return;

      setUserMachine({
        userMachineId: status.machineId,
        userMachineState: status.state,
        userMachineRegion: status.region,
        userMachineWsUrl: status.wsUrl,
        userMachineBridgeToken: status.bridgeToken,
        userMachineFlyForceInstanceId: status.flyForceInstanceId,
      });

      if (status.state === "started" && status.wsUrl) {
        // Wire workspace slice so useRemoteWorkspaceConnection opens the WS.
        // The fly-force-instance-id header is auto-added by connectRemoteWsBridge
        // from the `?machine=` query param.
        setRemoteWorkspaceWsUrl(status.wsUrl);
        setWorkspaceBridgeToken(status.bridgeToken ?? "");
        setRemoteWorkspaceEnabled(true);
        return;
      }

      if (status.state === "failed" || status.state === "destroyed") {
        // Surface to caller via store; useRepoSetup or UI can react.
        return;
      }

      if (attempts >= MAX_POLL_ATTEMPTS) return;
      pollTimerRef.current = setTimeout(tick, POLL_INTERVAL_MS);
    };

    pollTimerRef.current = setTimeout(tick, 0);
  }, [
    isFly,
    apiBaseUrl,
    githubToken,
    setUserMachine,
    setRemoteWorkspaceWsUrl,
    setWorkspaceBridgeToken,
    setRemoteWorkspaceEnabled,
    cancelPolling,
  ]);

  // 1. Mount: ensure the machine exists (idempotent server-side).
  useEffect(() => {
    if (!isFly) return;
    if (!githubToken || !apiBaseUrl) return;
    if (userMachineId) return; // already bootstrapped (rehydrated from disk)

    let cancelled = false;
    void (async () => {
      try {
        const ensured = await ensureUserMachine(apiBaseUrl, githubToken);
        if (cancelled) return;
        setUserMachine({
          userMachineId: ensured.machineId,
          userMachineState: ensured.machineState,
          userMachineRegion: ensured.region,
          userMachineFlyForceInstanceId: ensured.machineId,
        });
      } catch {
        // Will retry on next AppState active event
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isFly, githubToken, apiBaseUrl, userMachineId, setUserMachine]);

  // 2. Once we have a machineId (fresh ensure OR rehydrated from disk), poll
  //    to confirm/wake. Always polls on mount — the rehydrated userMachineState
  //    can be stale (e.g., persisted as "started", but the machine idle-stopped
  //    server-side while the app was killed), so we cannot trust it as a
  //    short-circuit. State-changes during the poll loop are NOT in deps,
  //    which prevents the poll → setState → re-fire → restart cycle.
  useEffect(() => {
    if (!isFly || !userMachineId) return;
    void pollUntilStarted();
    return cancelPolling;
  }, [isFly, userMachineId, pollUntilStarted, cancelPolling]);

  // 3. AppState transitions: on `active`, re-poll status (server-side wake
  //    handles stopped machines). On `background`, push any uncommitted work
  //    to a treena/<date>-<userMachineId> branch so it survives whatever
  //    happens (idle-stop, machine restart, etc.). The machine itself is
  //    persistent — we never tear it down here.
  useEffect(() => {
    if (!isFly) return;
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        void pollUntilStarted();
        return;
      }
      if (next === "background") {
        // Read the toggle inside the handler so flipping it in Settings takes
        // effect immediately (capturing at effect setup would freeze the value).
        const autoSaveEnabled = useStore.getState().autoSaveBranchOnSessionEnd;
        if (!autoSaveEnabled) return;
        void (async () => {
          try {
            const dirty = await isCloudRemoteGitDirty();
            if (!dirty) return;
            const r = await saveCloudWorkspaceToTreenaBranch();
            if (!r.ok) {
              console.warn("[userMachine] background auto-save failed:", r.error);
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn("[userMachine] background auto-save threw:", msg);
          }
        })();
      }
    });
    return () => sub.remove();
  }, [isFly, pollUntilStarted]);

  return {
    userMachineId,
    userMachineState,
    isFlyMode: isFly,
  };
}
