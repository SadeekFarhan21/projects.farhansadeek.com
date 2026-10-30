/**
 * Fly Machines API client (mobile side).
 *
 * Replaces lib/cloudSession.ts for the post-migration runtime model: each user
 * has one persistent Fly machine + volume; mobile bootstraps it via /users/ensure,
 * polls /machines/me/status until state="started" (Day 3.5 wake pattern), then
 * opens a WS to wss://treena-bridge.fly.dev pinned with fly-force-instance-id.
 *
 * AI token persistence (saveAiTokens) is shared with the legacy path — same
 * /user/ai-tokens endpoint, same DDB table — so we just re-export it.
 */

import Constants from "expo-constants";
import { useStore } from "@/store";
import {
  invokeRemoteAgentTool,
  reconnectRemoteWsBridge,
  waitForRemoteWsOpen,
} from "@/lib/workspace/remoteWsBridge";

export { saveAiTokens } from "./cloudSession";

function flyApiBaseUrl(): string {
  const useFly = Constants.expoConfig?.extra?.useFly === true;
  if (useFly) {
    return (Constants.expoConfig?.extra?.flyApiUrl as string) ?? "https://treena-api.fly.dev";
  }
  return (Constants.expoConfig?.extra?.cloudApiUrl as string) ?? "";
}

function abortAfter(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

function formatErr(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const o = body as { error?: string; details?: string };
    if (o.error && o.details) return `${o.error}: ${o.details}`;
    if (o.details) return o.details;
    if (o.error) return o.error;
  }
  return `HTTP ${status}`;
}

export type MachineState =
  | "creating"
  | "starting"
  | "started"
  | "stopping"
  | "stopped"
  | "hibernated"
  | "destroyed"
  | "failed";

export interface UsersEnsureResponse {
  machineId: string | null;
  machineState: MachineState;
  volumeId: string | null;
  region: string;
}

export interface MachineStatusResponse {
  machineId: string | null;
  state: MachineState;
  region: string;
  wsUrl: string | null;
  flyForceInstanceId: string | null;
  bridgeToken: string | null;
  /** True when THIS call kicked off a startMachine (Day 3.5 wake pattern). */
  wokeUp: boolean;
}

export interface RepoOpenResponse {
  setupState: "unset" | "cloning" | "installing" | "ready" | "failed";
  needsClone: boolean;
  /**
   * Day 6.5: bridge-side dir name (output of safeRepoDirName via the shared
   * `server/cloud/repoNames.mjs` module). Mobile uses this to set
   * `currentRepoDir` and pin the WS query string `activeRepoDir`. Single
   * source of truth — never derived on mobile.
   */
  repoName?: string;
}

/**
 * Bootstrap (or self-heal) the caller's persistent Fly machine. Returns
 * immediately — Fly volume + machine creation runs server-side in the
 * background. Mobile polls /machines/me/status to observe progress.
 *
 * Idempotent: returning users see their existing machine row. Failed rows
 * automatically retry on next call (ensureUserMachine state machine in api.mjs).
 */
export async function ensureUserMachine(
  apiBaseUrl: string,
  githubToken: string
): Promise<UsersEnsureResponse> {
  const resp = await fetch(`${apiBaseUrl}/users/ensure`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${githubToken}`,
    },
    body: JSON.stringify({}),
    signal: abortAfter(15_000),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(formatErr(body, resp.status));
  }
  return resp.json() as Promise<UsersEnsureResponse>;
}

/**
 * Read current state of the caller's machine. Has a server-side side-effect:
 * if state is "stopped", the API calls Fly's startMachine and returns
 * state="starting" + wokeUp=true. Mobile should keep polling until state is
 * "started" before opening the WS.
 */
export async function getMachineStatus(
  apiBaseUrl: string,
  githubToken: string
): Promise<MachineStatusResponse> {
  const resp = await fetch(`${apiBaseUrl}/machines/me/status`, {
    headers: { Authorization: `Bearer ${githubToken}` },
    signal: abortAfter(15_000),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(formatErr(body, resp.status));
  }
  return resp.json() as Promise<MachineStatusResponse>;
}

/**
 * Record that the user is opening a repo. Returns setup state so mobile can
 * decide whether to show the prep UI.
 *
 * For the normal open path: API returns `needsClone: true` for fresh repos.
 * Caller is then responsible for triggering the bridge's `setup.run` RPC.
 *
 * `opts.markReady === true`: short-circuit. Tells the API to flip DDB
 * `setupState` to "ready" — used by the mobile hook after observing the
 * bridge's `repo.setup` push with `stage: "ready"`. Mobile is the sole DDB
 * writer; the bridge does NOT call api.mjs back.
 */
export async function openRepo(
  apiBaseUrl: string,
  githubToken: string,
  repoUrl: string,
  branch?: string | null,
  opts?: { markReady?: boolean }
): Promise<RepoOpenResponse> {
  const resp = await fetch(`${apiBaseUrl}/repos/open`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${githubToken}`,
    },
    body: JSON.stringify({
      repoUrl,
      branch: branch || null,
      ...(opts?.markReady ? { markReady: true } : {}),
    }),
    signal: abortAfter(15_000),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(formatErr(body, resp.status));
  }
  return resp.json() as Promise<RepoOpenResponse>;
}

/**
 * Convenience: read the configured Fly API base URL for the build. Returns
 * the empty string if neither EXPO_PUBLIC_FLY_API_URL nor cloudApiUrl is set.
 */
export function getFlyApiBaseUrl(): string {
  return flyApiBaseUrl();
}

/**
 * Convenience: true if EXPO_PUBLIC_USE_FLY=true at build time.
 */
export function isFlyMode(): boolean {
  return Constants.expoConfig?.extra?.useFly === true;
}

/**
 * Day 6.2 — single entry point for "user opened a repo on the Fly path".
 *
 * Stateless. Reads apiBaseUrl + githubToken from the store, writes the prep
 * UI state progression to the store via setRepoSetup, then either:
 *   - early-returns "ready" (DDB row says setup already done), or
 *   - kicks off setup.run on the bridge (fire-and-forget — repo.setup pushes
 *     drive UI completion via useRepoSetupListener).
 *
 * Returns the API response on success or null on early failure (no fly mode,
 * missing token, or API error). Caller should check store's repoSetupError
 * for the message when null is returned.
 *
 * Safe to call from non-React code (e.g., from event handlers in screens
 * without their own hook subscription). The bridge's eventual repo.setup
 * pushes are handled by useRepoSetupListener mounted ONCE in app/index.tsx.
 */
export async function triggerRepoOpen(
  repoUrl: string,
  branch?: string | null
): Promise<RepoOpenResponse | null> {
  if (!isFlyMode()) return null;
  const apiBaseUrl = flyApiBaseUrl();
  const { githubToken, setRepoSetup } = useStore.getState();
  if (!apiBaseUrl || !githubToken) {
    setRepoSetup({
      repoSetupPhase: "failed",
      repoSetupMessage: "API or auth not configured",
      repoSetupError: "API or auth not configured",
    });
    return null;
  }
  if (!repoUrl) {
    setRepoSetup({
      repoSetupPhase: "failed",
      repoSetupMessage: "repoUrl is required",
      repoSetupError: "repoUrl is required",
    });
    return null;
  }

  setRepoSetup({
    repoSetupPhase: "unset",
    repoSetupMessage: "Preparing workspace…",
    repoSetupError: null,
    repoSetupActiveRepoUrl: repoUrl,
    repoSetupActiveBranch: branch || null,
    repoSetupPartial: false,
  });

  let resp: RepoOpenResponse;
  try {
    resp = await openRepo(apiBaseUrl, githubToken, repoUrl, branch);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    setRepoSetup({
      repoSetupPhase: "failed",
      repoSetupMessage: msg,
      repoSetupError: msg,
    });
    return null;
  }

  // Day 6.5: API returns repoName (derived via the shared repoNames.mjs
  // transform). Pin currentRepoDir + redial the WS so the bridge re-scopes
  // path ops to /workspace/<repoName>. Applies to BOTH ready and needsClone
  // branches: ready means we're entering an existing repo; needsClone means
  // setup.run will populate the dir but mobile WS already needs to be scoped
  // for the eventual file tree refresh after `repo.setup` ready push.
  const { setCurrentRepoDir } = useStore.getState();
  if (resp.repoName && useStore.getState().currentRepoDir !== resp.repoName) {
    setCurrentRepoDir(resp.repoName);
    reconnectRemoteWsBridge();
  }

  if (resp.setupState === "ready") {
    setRepoSetup({
      repoSetupPhase: "ready",
      repoSetupMessage: "Workspace ready",
    });
    return resp;
  }

  // needsClone — wait for WS, then bridge does the work; pushes drive UI completion.
  setRepoSetup({
    repoSetupPhase: "cloning",
    repoSetupMessage: "Waiting for workspace…",
  });
  try {
    await waitForRemoteWsOpen(30_000);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    setRepoSetup({
      repoSetupPhase: "failed",
      repoSetupMessage: msg,
      repoSetupError: msg,
    });
    return resp;
  }
  setRepoSetup({
    repoSetupPhase: "cloning",
    repoSetupMessage: "Cloning repository…",
  });
  void invokeRemoteAgentTool("setup.run", {
    repoUrl,
    githubToken,
    ...(branch ? { branch } : {}),
  }).catch((e) => {
    const msg = e instanceof Error ? e.message : String(e);
    // The bridge ack times out at 2min while install can take 10min — pushes
    // drive completion regardless. Only surface non-timeout failures.
    if (/timeout/i.test(msg)) return;
    console.warn("[triggerRepoOpen] setup.run RPC failed:", msg);
  });

  return resp;
}
