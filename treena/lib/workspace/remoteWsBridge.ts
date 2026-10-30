import type { RemoteTreeNode } from "./remotePaths";
import type { GitLogEntry } from "@/lib/git";
import type { EditorDiagnostic, GitFileStatus, McpServerInfo } from "@/store";
import { useStore } from "@/store";
import { parseGitStatusPorcelain } from "@/lib/gitPorcelain";

export function normalizeWsUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (t.startsWith("ws://") || t.startsWith("wss://")) return t;
  return `ws://${t}`;
}

/**
 * Phase 6: optional bridge shared secret. Removes any existing `token` query param,
 * then appends the value from secure settings when non-empty.
 */
export function buildRemoteWorkspaceWsUrl(
  rawBaseUrl: string,
  bridgeToken?: string | null
): string {
  const base = normalizeWsUrl(rawBaseUrl.trim());
  if (!base) return "";
  // Day 6.5: pin the bridge's per-WS active repo scope at handshake time via
  // `?activeRepoDir=<name>`. Read from the persisted store; null/missing →
  // bridge enters legacyMode (volume-root scope, pre-Day-6.5 behavior).
  // Source of truth for the dir name is the bridge (broadcasts in repo.setup
  // pushes) and the api.mjs /repos/open response — never derived locally.
  const activeRepoDir = useStore.getState().currentRepoDir;
  try {
    const u = new URL(base);
    u.searchParams.delete("token");
    const t = bridgeToken?.trim();
    if (t) u.searchParams.set("token", t);
    u.searchParams.delete("activeRepoDir");
    if (activeRepoDir) u.searchParams.set("activeRepoDir", activeRepoDir);
    return u.toString();
  } catch {
    const t = bridgeToken?.trim();
    let url = base;
    if (t) {
      const sep = url.includes("?") ? "&" : "?";
      url = `${url}${sep}token=${encodeURIComponent(t)}`;
    }
    if (activeRepoDir) {
      const sep = url.includes("?") ? "&" : "?";
      url = `${url}${sep}activeRepoDir=${encodeURIComponent(activeRepoDir)}`;
    }
    return url;
  }
}

type FsResp =
  | { ok: true; tree?: RemoteTreeNode[]; content?: string }
  | { ok: false; err?: string };

type TerminalMsg = { t: "out"; d: string } | { t: "err"; m: string };

let socket: WebSocket | null = null;
let currentUrl: string | null = null;
/** Periodic noop frames so proxies / middleboxes see activity while the app is foregrounded. */
let wsKeepAliveTimer: ReturnType<typeof setInterval> | null = null;

/* ── Auto-reconnect state ── */
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
let intentionalDisconnect = false;
let lastDisconnectedUrl: string | null = null;
let lastDisconnectedJwt: string | null = null;
const MAX_RECONNECT_ATTEMPTS = 8;
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 16_000;

function clearReconnectTimer() {
  if (reconnectTimer != null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect() {
  clearReconnectTimer();
  if (intentionalDisconnect) return;
  if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) return;
  const delay = Math.min(
    RECONNECT_BASE_MS * Math.pow(2, reconnectAttempt),
    RECONNECT_MAX_MS,
  );
  reconnectAttempt++;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (intentionalDisconnect || socket) return;
    const url = lastDisconnectedUrl;
    const jwt = lastDisconnectedJwt;
    if (url) connectRemoteWsBridge(url, jwt);
  }, delay);
}

export function isReconnecting(): boolean {
  return reconnectTimer != null;
}

/**
 * Forces an immediate reconnect attempt, resetting exponential backoff state.
 * Use this on AppState foreground so brief backgrounding doesn't accumulate
 * attempts or leave the user waiting on a slow backoff timer.
 */
export function forceRemoteBridgeReconnect(): void {
  if (intentionalDisconnect) return;
  clearReconnectTimer();
  reconnectAttempt = 0;
  if (socket) return;
  const url = lastDisconnectedUrl;
  const jwt = lastDisconnectedJwt;
  if (url) connectRemoteWsBridge(url, jwt);
}

function clearWsKeepAlive() {
  if (wsKeepAliveTimer != null) {
    clearInterval(wsKeepAliveTimer);
    wsKeepAliveTimer = null;
  }
}
/** Sent as first client message when server uses JWT (see `session.auth`). */
let pendingSessionJwt: string | null = null;
let lastConnectedSessionJwt: string | null = null;
/** From last `session.ok` — use to build `file://` URIs for LSP. */
let bridgeRootFileUri: string | null = null;

export type RemoteBridgeSessionState = "idle" | "pending" | "ready" | "error";
let bridgeSessionResolved = false;
let bridgeSessionState: RemoteBridgeSessionState = "idle";
type SessionWait = { resolve: () => void; reject: (e: Error) => void };
const sessionWaiters: SessionWait[] = [];
let sessionHandshakeTimer: ReturnType<typeof setTimeout> | undefined;
const bridgeSessionListeners = new Set<
  (state: RemoteBridgeSessionState) => void
>();

function setBridgeSessionState(next: RemoteBridgeSessionState) {
  if (bridgeSessionState === next) return;
  bridgeSessionState = next;
  for (const fn of bridgeSessionListeners) fn(next);
}

function resetBridgeSession(nextState: RemoteBridgeSessionState = "pending") {
  bridgeSessionResolved = false;
  bridgeRootFileUri = null;
  setBridgeSessionState(nextState);
}

function clearSessionHandshakeTimer() {
  if (sessionHandshakeTimer !== undefined) {
    clearTimeout(sessionHandshakeTimer);
    sessionHandshakeTimer = undefined;
  }
}

function scheduleSessionHandshakeTimeout() {
  clearSessionHandshakeTimer();
  sessionHandshakeTimer = setTimeout(() => {
    if (!bridgeSessionResolved) {
      rejectBridgeSessionWaiters("Bridge session handshake timeout");
    }
  }, 25_000);
}

function resolveBridgeSession() {
  bridgeSessionResolved = true;
  setBridgeSessionState("ready");
  clearSessionHandshakeTimer();
  for (const w of sessionWaiters) w.resolve();
  sessionWaiters.length = 0;
}

function rejectBridgeSessionWaiters(reason: string) {
  clearSessionHandshakeTimer();
  bridgeSessionResolved = false;
  setBridgeSessionState("error");
  const err = new Error(reason);
  const copy = sessionWaiters.splice(0);
  for (const w of copy) w.reject(err);
}

function waitBridgeSession(): Promise<void> {
  if (bridgeSessionResolved) return Promise.resolve();
  return new Promise((resolve, reject) => {
    sessionWaiters.push({ resolve, reject });
  });
}

/** Resolve after `session.ok` (or immediately if already ready). */
export function waitRemoteBridgeSession(): Promise<void> {
  return waitBridgeSession();
}

let nextFsId = 1;
const pendingFs = new Map<
  number,
  { resolve: (v: FsResp) => void; reject: (e: Error) => void; t: ReturnType<typeof setTimeout> }
>();

const terminalListeners = new Set<(msg: TerminalMsg | { t: "raw"; data: string }) => void>();
const terminalIdListeners = new Map<string, Set<(msg: TerminalMsg | { t: "raw"; data: string }) => void>>();

const connectionListeners = new Set<(e: { kind: "open" | "close" | "error" }) => void>();

export type RemoteFsEventKind = "add" | "change" | "unlink";

export type RemoteFsEvent = {
  t: "fs.event";
  kind: RemoteFsEventKind;
  path: string;
  oldPath?: string;
};

const fsEventListeners = new Set<(e: RemoteFsEvent) => void>();

// ── MCP status ──
type McpStatusPayload = Record<string, McpServerInfo>;
const mcpStatusListeners = new Set<(servers: McpStatusPayload) => void>();

export function onMcpStatus(fn: (servers: McpStatusPayload) => void): () => void {
  mcpStatusListeners.add(fn);
  return () => mcpStatusListeners.delete(fn);
}

// ── Workspace bootstrap status (bridge-first boot) ──
export type WorkspaceBootstrapStatus = "empty" | "cloning" | "ready" | "error";
export interface WorkspaceStatusPayload {
  status: WorkspaceBootstrapStatus;
  repoUrl: string | null;
  error: string | null;
}
const workspaceStatusListeners = new Set<(p: WorkspaceStatusPayload) => void>();

export function onWorkspaceStatus(
  fn: (p: WorkspaceStatusPayload) => void
): () => void {
  workspaceStatusListeners.add(fn);
  return () => workspaceStatusListeners.delete(fn);
}

// ── Repo setup pushes (Day 6.1) ──
// Bridge emits `repo.setup` pushes during setup.run (clone + install). The
// useRepoSetup hook subscribes to drive the prep drawer UI.
export type RepoSetupStage = "cloning" | "installing" | "ready" | "failed";
export interface RepoSetupPayload {
  repoUrl: string;
  stage: RepoSetupStage;
  message: string;
  error?: string;
  /** Day 6.1 multi-ecosystem: true if "ready" reached but at least one
   *  installer (e.g. Python while JS succeeded) failed. Machine is usable;
   *  the message includes which installers failed. */
  partial?: boolean;
  /**
   * Day 6.5: bridge-side dir name (output of safeRepoDirName). Mobile uses
   * this to set `currentRepoDir` and pin the WS query string `activeRepoDir`.
   * Single source of truth — never derive on mobile.
   */
  repoName?: string;
}
const repoSetupListeners = new Set<(p: RepoSetupPayload) => void>();

export function onRepoSetup(
  fn: (p: RepoSetupPayload) => void
): () => void {
  repoSetupListeners.add(fn);
  return () => repoSetupListeners.delete(fn);
}

// ── Phase 3A: graceful-vs-unexpected disconnect signaling ──
// Synchronously emit `client.bg` over the existing socket when AppState
// transitions to background; emit `client.fg` on return. iOS suspends background
// network within ~30s so this MUST be sent before any await yields.
//
// `client.bg` recency tells the bridge a WS close was an expected backgrounding
// (long auto-destroy timeout) vs an unexpected close like force-kill (short).
export function sendClientBgSignal(): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  try {
    socket.send(JSON.stringify({ t: "client.bg", at: Date.now() }));
  } catch {
    /* ignore — best-effort signal */
  }
}

export function sendClientFgSignal(): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  try {
    socket.send(JSON.stringify({ t: "client.fg", at: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function requestMcpRefresh(): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ t: "mcp.refresh" }));
}

/** Push app-side MCP server definitions to the bridge (merged with `.treena/mcp.json`). */
export function sendMcpRuntimeConfig(payload: {
  clear?: boolean;
  servers?: Record<string, unknown>;
}): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(
    JSON.stringify({
      t: "mcp.setRuntimeConfig",
      clear: payload.clear === true,
      servers: payload.servers,
    })
  );
}

export function subscribeRemoteFsEvents(fn: (e: RemoteFsEvent) => void): () => void {
  fsEventListeners.add(fn);
  return () => fsEventListeners.delete(fn);
}

export function subscribeRemoteConnection(
  fn: (e: { kind: "open" | "close" | "error" }) => void
): () => void {
  connectionListeners.add(fn);
  return () => connectionListeners.delete(fn);
}

export function waitForRemoteWsOpen(timeoutMs = 30_000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      unsub();
      reject(new Error("Timeout waiting for remote workspace connection"));
    }, timeoutMs);
    const unsub = subscribeRemoteConnection((e) => {
      if (e.kind === "open") {
        clearTimeout(timer);
        unsub();
        resolve();
      }
    });
  });
}

export function getRemoteBridgeSessionState(): RemoteBridgeSessionState {
  return bridgeSessionState;
}

export function subscribeRemoteBridgeSession(
  fn: (state: RemoteBridgeSessionState) => void
): () => void {
  bridgeSessionListeners.add(fn);
  return () => bridgeSessionListeners.delete(fn);
}

function emitConnection(e: { kind: "open" | "close" | "error" }) {
  for (const fn of connectionListeners) fn(e);
}

type AgentToolPending = {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
  t: ReturnType<typeof setTimeout>;
};

const pendingAgentTools = new Map<string, AgentToolPending>();

function rejectAllAgentTools(reason: string) {
  for (const [, p] of pendingAgentTools) {
    clearTimeout(p.t);
    p.reject(new Error(reason));
  }
  pendingAgentTools.clear();
}

export type GitRemoteInfo = { name: string; fetchUrl: string };

type GitRpcResp =
  | {
      ok: true;
      branch?: string;
      lines?: string[];
      entries?: GitLogEntry[];
      oid?: string;
      output?: string;
      remotes?: GitRemoteInfo[];
    }
  | { ok: false; err?: string };

let nextGitId = 1;
const pendingGit = new Map<
  number,
  {
    resolve: (v: GitRpcResp) => void;
    reject: (e: Error) => void;
    t: ReturnType<typeof setTimeout>;
  }
>();

export type WorkspaceSearchMatch = { path: string; line: number; text: string };

type WorkspaceRpcResp =
  | {
      ok: true;
      matches?: WorkspaceSearchMatch[];
      diagnostics?: EditorDiagnostic[];
    }
  | { ok: false; err?: string };

let nextWorkspaceId = 1;
const pendingWorkspace = new Map<
  number,
  {
    resolve: (v: WorkspaceRpcResp) => void;
    reject: (e: Error) => void;
    t: ReturnType<typeof setTimeout>;
  }
>();

export type LspRpcResp =
  | { ok: true; result?: unknown }
  | { ok: false; err?: string };

let nextLspId = 1;
const pendingLsp = new Map<
  number,
  {
    resolve: (v: LspRpcResp) => void;
    reject: (e: Error) => void;
    t: ReturnType<typeof setTimeout>;
  }
>();

function rejectAllWorkspacePending(reason: string) {
  for (const [, p] of pendingWorkspace) {
    clearTimeout(p.t);
    p.reject(new Error(reason));
  }
  pendingWorkspace.clear();
}

function rejectAllGitPending(reason: string) {
  for (const [, p] of pendingGit) {
    clearTimeout(p.t);
    p.reject(new Error(reason));
  }
  pendingGit.clear();
}

function rejectAllLspPending(reason: string) {
  for (const [, p] of pendingLsp) {
    clearTimeout(p.t);
    p.reject(new Error(reason));
  }
  pendingLsp.clear();
}

function rejectAllPending(reason: string) {
  for (const [, p] of pendingFs) {
    clearTimeout(p.t);
    p.reject(new Error(reason));
  }
  pendingFs.clear();
  rejectAllAgentTools(reason);
  rejectAllGitPending(reason);
  rejectAllWorkspacePending(reason);
  rejectAllLspPending(reason);
  rejectBridgeSessionWaiters(reason);
}

function dispatchIncoming(raw: string) {
  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    for (const fn of terminalListeners) {
      fn({ t: "raw", data: raw });
    }
    return;
  }

  if (msg.t === "session.ok") {
    bridgeRootFileUri =
      typeof msg.rootFileUri === "string" && msg.rootFileUri
        ? msg.rootFileUri
        : null;
    resolveBridgeSession();
    return;
  }
  if (msg.t === "session.err") {
    bridgeRootFileUri = null;
    const m = String(msg.m ?? "session error");
    const code = typeof msg.code === "string" ? msg.code : "";
    for (const fn of terminalListeners) fn({ t: "err", m: code ? `${code}: ${m}` : m });
    rejectBridgeSessionWaiters(m);
    return;
  }

  if (msg.t === "mcp.status" && msg.servers && typeof msg.servers === "object") {
    const servers = msg.servers as McpStatusPayload;
    for (const fn of mcpStatusListeners) fn(servers);
    return;
  }

  if (msg.t === "workspace.status" && typeof msg.status === "string") {
    const status = msg.status as WorkspaceBootstrapStatus;
    if (
      status === "empty" ||
      status === "cloning" ||
      status === "ready" ||
      status === "error"
    ) {
      const payload: WorkspaceStatusPayload = {
        status,
        repoUrl: typeof msg.repoUrl === "string" ? msg.repoUrl : null,
        error: typeof msg.error === "string" ? msg.error : null,
      };
      for (const fn of workspaceStatusListeners) fn(payload);
    }
    return;
  }

  if (msg.t === "repo.setup" && typeof msg.stage === "string" && typeof msg.repoUrl === "string") {
    const stage = msg.stage as RepoSetupStage;
    if (stage === "cloning" || stage === "installing" || stage === "ready" || stage === "failed") {
      const payload: RepoSetupPayload = {
        repoUrl: msg.repoUrl,
        stage,
        message: typeof msg.message === "string" ? msg.message : "",
        ...(typeof msg.error === "string" ? { error: msg.error } : {}),
        ...(msg.partial === true ? { partial: true } : {}),
        ...(typeof msg.repoName === "string" ? { repoName: msg.repoName } : {}),
      };
      for (const fn of repoSetupListeners) fn(payload);
    }
    return;
  }

  if (msg.t === "lsp.resp" && typeof msg.id === "number") {
    const id = msg.id;
    const p = pendingLsp.get(id);
    if (p) {
      clearTimeout(p.t);
      pendingLsp.delete(id);
      if (msg.ok === true) {
        p.resolve({ ok: true, result: msg.result });
      } else {
        p.resolve({ ok: false, err: String(msg.err ?? "lsp error") });
      }
    }
    return;
  }

  if (msg.t === "fs.event" && typeof msg.path === "string") {
    const kind = msg.kind;
    if (kind === "add" || kind === "change" || kind === "unlink") {
      const ev: RemoteFsEvent = { t: "fs.event", kind, path: msg.path };
      if (typeof msg.oldPath === "string") ev.oldPath = msg.oldPath;
      for (const fn of fsEventListeners) fn(ev);
    }
    return;
  }

  if (msg.t === "git.resp" && typeof msg.id === "number") {
    const id = msg.id;
    const p = pendingGit.get(id);
    if (p) {
      clearTimeout(p.t);
      pendingGit.delete(id);
      if (msg.ok === true) {
        p.resolve({
          ok: true,
          branch: typeof msg.branch === "string" ? msg.branch : undefined,
          lines: Array.isArray(msg.lines) ? (msg.lines as string[]) : undefined,
          entries: Array.isArray(msg.entries)
            ? (msg.entries as GitLogEntry[])
            : undefined,
          oid: typeof msg.oid === "string" ? msg.oid : undefined,
          output: typeof msg.output === "string" ? msg.output : undefined,
          remotes: Array.isArray(msg.remotes)
            ? (msg.remotes as GitRemoteInfo[])
            : undefined,
        });
      } else {
        p.resolve({ ok: false, err: String(msg.err ?? "git error") });
      }
    }
    return;
  }

  if (msg.t === "workspace.resp" && typeof msg.id === "number") {
    const id = msg.id;
    const p = pendingWorkspace.get(id);
    if (p) {
      clearTimeout(p.t);
      pendingWorkspace.delete(id);
      if (msg.ok === true) {
        p.resolve({
          ok: true,
          matches: Array.isArray(msg.matches)
            ? (msg.matches as WorkspaceSearchMatch[])
            : undefined,
          diagnostics: Array.isArray(msg.diagnostics)
            ? (msg.diagnostics as EditorDiagnostic[])
            : undefined,
        });
      } else {
        p.resolve({ ok: false, err: String(msg.err ?? "workspace rpc error") });
      }
    }
    return;
  }

  if (msg.t === "agent.tool_result" && typeof msg.id === "string") {
    const id = msg.id;
    const p = pendingAgentTools.get(id);
    if (p) {
      clearTimeout(p.t);
      pendingAgentTools.delete(id);
      if (msg.ok === true) {
        p.resolve(msg.result);
      } else {
        p.reject(new Error(String(msg.err ?? "agent tool failed")));
      }
    }
    return;
  }

  if (msg.t === "fs.resp" && typeof msg.id === "number") {
    const id = msg.id;
    const p = pendingFs.get(id);
    if (p) {
      clearTimeout(p.t);
      pendingFs.delete(id);
      if (msg.ok === true) {
        p.resolve({
          ok: true,
          tree: msg.tree as RemoteTreeNode[] | undefined,
          content: typeof msg.content === "string" ? msg.content : undefined,
        });
      } else {
        p.resolve({ ok: false, err: String(msg.err ?? "fs error") });
      }
    }
    return;
  }

  if (msg.t === "out" && typeof msg.d === "string") {
    const tid = typeof (msg as any).terminalId === "string" ? (msg as any).terminalId : "t1";
    const idSet = terminalIdListeners.get(tid);
    if (idSet) for (const fn of idSet) fn({ t: "out", d: msg.d });
    for (const fn of terminalListeners) fn({ t: "out", d: msg.d });
    return;
  }
  if (msg.t === "err" && msg.m != null) {
    for (const fn of terminalListeners)
      fn({ t: "err", m: String(msg.m) });
    for (const [, set] of terminalIdListeners)
      for (const fn of set) fn({ t: "err", m: String(msg.m) });
  }
}

function attachSocketHandlers(ws: WebSocket) {
  ws.onopen = () => {
    if (socket === ws && pendingSessionJwt) {
      try {
        ws.send(JSON.stringify({ t: "session.auth", jwt: pendingSessionJwt }));
      } catch {
        /* ignore */
      }
    }
    if (socket === ws) {
      reconnectAttempt = 0;
      clearReconnectTimer();
      clearWsKeepAlive();
      wsKeepAliveTimer = setInterval(() => {
        if (socket === ws && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ t: "noop" }));
          } catch {
            /* ignore */
          }
        }
      }, 10_000);
      emitConnection({ kind: "open" });
    }
  };
  ws.onerror = () => {
    if (socket === ws) emitConnection({ kind: "error" });
  };
  ws.onmessage = (ev) => {
    dispatchIncoming(String(ev.data));
  };
  ws.onclose = () => {
    if (socket !== ws) return;
    clearWsKeepAlive();
    lastDisconnectedUrl = currentUrl;
    lastDisconnectedJwt = lastConnectedSessionJwt;
    socket = null;
    currentUrl = null;
    rejectAllPending("WebSocket closed");
    resetBridgeSession("idle");
    emitConnection({ kind: "close" });
    scheduleReconnect();
  };
}

export function connectRemoteWsBridge(
  url: string,
  sessionJwt?: string | null
): void {
  intentionalDisconnect = false;
  clearReconnectTimer();
  const u = normalizeWsUrl(url);
  if (!u) {
    disconnectRemoteWsBridge();
    return;
  }
  const normJwt = sessionJwt?.trim() ? sessionJwt.trim() : null;
  pendingSessionJwt = normJwt;
  if (
    socket &&
    currentUrl === u &&
    socket.readyState === WebSocket.OPEN &&
    lastConnectedSessionJwt === normJwt
  ) {
    return;
  }
  if (socket) {
    const old = socket;
    socket = null;
    currentUrl = null;
    clearWsKeepAlive();
    try {
      old.close();
    } catch {
      /* ignore */
    }
  }
  rejectAllPending("Reconnecting");
  resetBridgeSession("pending");
  lastConnectedSessionJwt = normJwt;
  currentUrl = u;
  scheduleSessionHandshakeTimeout();
  // Fly proxy routing: when the URL encodes `?machine=<id>` (the Fly path —
  // see lib/userMachine.ts and api.mjs `buildBridgeWsUrl`), pass it as the
  // `fly-force-instance-id` header on the WS upgrade. Without the header, the
  // proxy load-balances across all machines in the app — wrong for the
  // per-user model where each request must hit one specific machine.
  let flyForceInstanceId: string | null = null;
  try {
    const parsed = new URL(u);
    flyForceInstanceId = parsed.searchParams.get("machine");
  } catch {
    /* legacy ws://host:port URLs without query params — no header */
  }
  // RN's WebSocket constructor accepts a third options arg with custom headers,
  // but the DOM lib types only expose two args. Cast to bypass the DOM type.
  const WSCtor = WebSocket as unknown as new (
    url: string,
    protocols?: string | string[],
    options?: { headers?: Record<string, string> }
  ) => WebSocket;
  const ws = flyForceInstanceId
    ? new WSCtor(u, undefined, {
        headers: { "fly-force-instance-id": flyForceInstanceId },
      })
    : new WSCtor(u);
  socket = ws;
  attachSocketHandlers(ws);
}

export function getRemoteWorkspaceRootFileUri(): string | null {
  return bridgeRootFileUri;
}

/** Build `file:` URI for LSP / bridge (requires prior `session.ok` with `rootFileUri`). */
export function remoteWorkspaceFileUriForRel(relPath: string): string {
  const root = bridgeRootFileUri;
  if (!root) throw new Error("Remote workspace root URI not ready");
  const norm = relPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const rootNoSlash = root.endsWith("/") ? root.slice(0, -1) : root;
  const parts = norm.split("/").filter(Boolean);
  return `${rootNoSlash}/${parts.map(encodeURIComponent).join("/")}`;
}

export function disconnectRemoteWsBridge(): void {
  intentionalDisconnect = true;
  clearReconnectTimer();
  lastDisconnectedUrl = null;
  lastDisconnectedJwt = null;
  currentUrl = null;
  lastConnectedSessionJwt = null;
  clearWsKeepAlive();
  if (socket) {
    const old = socket;
    socket = null;
    try {
      old.close();
    } catch {
      /* ignore */
    }
  }
  rejectAllPending("Disconnected");
  resetBridgeSession("idle");
}

/**
 * Day 6.5: close + redial with a freshly-built URL. Use when store-derived
 * URL params change mid-session (e.g., `currentRepoDir` updated after a
 * `repo.setup` ready push or `/repos/open` ready response). The new URL
 * picks up the new `activeRepoDir` query param so the bridge re-scopes.
 *
 * Skips the scheduleReconnect backoff path — closes intentionally then
 * immediately re-dials. If the WS isn't currently dialed, no-op.
 */
export function reconnectRemoteWsBridge(): void {
  const st = useStore.getState();
  const baseUrl = st.remoteWorkspaceWsUrl;
  if (!baseUrl) return;
  const newUrl = buildRemoteWorkspaceWsUrl(baseUrl, st.workspaceBridgeToken);
  if (!newUrl) return;
  const jwt = st.workspaceSessionJwt || null;
  // Suppress auto-reconnect during the close so we don't race the redial.
  const wasIntentional = intentionalDisconnect;
  intentionalDisconnect = true;
  clearReconnectTimer();
  if (socket) {
    const old = socket;
    socket = null;
    try { old.close(); } catch { /* ignore */ }
  }
  rejectAllPending("Switching workspace scope");
  resetBridgeSession("idle");
  currentUrl = null;
  intentionalDisconnect = wasIntentional;
  reconnectAttempt = 0;
  connectRemoteWsBridge(newUrl, jwt);
}

export function getRemoteWsReadyState(): number | null {
  if (!socket) return null;
  return socket.readyState;
}

export function sendRemoteTerminalIn(data: string, terminalId = "t1"): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  void waitBridgeSession().then(
    () => {
      if (socket?.readyState === WebSocket.OPEN) {
        try {
          socket.send(JSON.stringify({ t: "in", d: data, terminalId }));
        } catch {
          /* ignore */
        }
      }
    },
    () => {
      /* session failed — drop input */
    }
  );
  return true;
}

export function sendRemoteTerminalResize(cols: number, rows: number, terminalId = "t1"): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  if (cols <= 0 || rows <= 0) return false;
  void waitBridgeSession().then(
    () => {
      if (socket?.readyState === WebSocket.OPEN) {
        try {
          socket.send(JSON.stringify({ t: "resize", cols, rows, terminalId }));
        } catch {
          /* ignore */
        }
      }
    },
    () => {}
  );
  return true;
}

export function subscribeRemoteTerminal(
  fn: (msg: TerminalMsg | { t: "raw"; data: string }) => void,
  terminalId?: string,
): () => void {
  if (terminalId) {
    let set = terminalIdListeners.get(terminalId);
    if (!set) {
      set = new Set();
      terminalIdListeners.set(terminalId, set);
    }
    set.add(fn);
    return () => {
      set!.delete(fn);
      if (set!.size === 0) terminalIdListeners.delete(terminalId);
    };
  }
  terminalListeners.add(fn);
  return () => terminalListeners.delete(fn);
}

function fsRpc(
  payload: Record<string, unknown>,
  timeoutMs = 60000
): Promise<FsResp> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error("Remote workspace not connected"));
      return;
    }
    const rs0 = socket.readyState;
    if (rs0 === WebSocket.CLOSING || rs0 === WebSocket.CLOSED) {
      reject(new Error("Remote workspace not connected"));
      return;
    }

    const waitOpen = () => {
      if (!socket) {
        reject(new Error("Remote workspace not connected"));
        return;
      }
      const rs = socket.readyState;
      if (rs === WebSocket.OPEN) send();
      else if (rs === WebSocket.CLOSING || rs === WebSocket.CLOSED) {
        reject(new Error("Remote workspace not connected"));
      } else {
        const ws = socket!;
        const onOpen = () => {
          ws.removeEventListener("open", onOpen);
          ws.removeEventListener("close", onClose);
          clearTimeout(to);
          send();
        };
        const onClose = () => {
          ws.removeEventListener("open", onOpen);
          ws.removeEventListener("close", onClose);
          clearTimeout(to);
          reject(new Error("Remote workspace not connected"));
        };
        const to = setTimeout(() => {
          ws.removeEventListener("open", onOpen);
          ws.removeEventListener("close", onClose);
          reject(new Error("Remote workspace connect timeout"));
        }, 20000);
        ws.addEventListener("open", onOpen);
        ws.addEventListener("close", onClose);
      }
    };

    const send = () => {
      waitBridgeSession()
        .then(() => {
          const id = nextFsId++;
          const t = setTimeout(() => {
            pendingFs.delete(id);
            reject(new Error("Remote FS timeout"));
          }, timeoutMs);
          pendingFs.set(id, {
            resolve,
            reject,
            t,
          });
          try {
            socket!.send(JSON.stringify({ ...payload, id }));
          } catch (e) {
            clearTimeout(t);
            pendingFs.delete(id);
            reject(e instanceof Error ? e : new Error(String(e)));
          }
        })
        .catch((e) =>
          reject(e instanceof Error ? e : new Error(String(e)))
        );
    };

    waitOpen();
  });
}

export async function remoteFsList(
  relPath: string,
  maxDepth = 5
): Promise<RemoteTreeNode[]> {
  const r = await fsRpc({ t: "fs.list", path: relPath, maxDepth });
  if (!r.ok) throw new Error(r.err ?? "fs.list failed");
  return r.tree ?? [];
}

export async function remoteFsRead(relPath: string): Promise<string> {
  const r = await fsRpc({ t: "fs.read", path: relPath });
  if (!r.ok) throw new Error(r.err ?? "fs.read failed");
  return r.content ?? "";
}

export async function remoteFsReadBase64(relPath: string): Promise<string> {
  await waitRemoteBridgeSession();
  const r = await fsRpc({ t: "fs.read_b64", path: relPath });
  if (!r.ok) {
    const err = r.err ?? "fs.read_b64 failed";
    if (/unknown message type|unknown t|not supported/i.test(err)) {
      throw new Error(
        "Bridge does not support binary reads — redeploy the cloud container."
      );
    }
    throw new Error(err);
  }
  return r.content ?? "";
}

export async function remoteFsWrite(
  relPath: string,
  content: string
): Promise<void> {
  const r = await fsRpc({ t: "fs.write", path: relPath, content });
  if (!r.ok) throw new Error(r.err ?? "fs.write failed");
}

export async function remoteFsMkdir(relPath: string): Promise<void> {
  const r = await fsRpc({ t: "fs.mkdir", path: relPath });
  if (!r.ok) throw new Error(r.err ?? "fs.mkdir failed");
}

export async function remoteFsRm(relPath: string): Promise<void> {
  const r = await fsRpc({ t: "fs.rm", path: relPath });
  if (!r.ok) throw new Error(r.err ?? "fs.rm failed");
}

export async function remoteFsRename(
  fromRel: string,
  toRel: string
): Promise<void> {
  const r = await fsRpc({ t: "fs.rename", from: fromRel, to: toRel });
  if (!r.ok) throw new Error(r.err ?? "fs.rename failed");
}

function gitRpc(
  payload: Record<string, unknown>,
  timeoutMs = 120_000
): Promise<GitRpcResp> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error("Remote workspace not connected"));
      return;
    }
    const rs0 = socket.readyState;
    if (rs0 === WebSocket.CLOSING || rs0 === WebSocket.CLOSED) {
      reject(new Error("Remote workspace not connected"));
      return;
    }

    const waitOpen = () => {
      if (!socket) {
        reject(new Error("Remote workspace not connected"));
        return;
      }
      const rs = socket.readyState;
      if (rs === WebSocket.OPEN) send();
      else if (rs === WebSocket.CLOSING || rs === WebSocket.CLOSED) {
        reject(new Error("Remote workspace not connected"));
      } else {
        const ws = socket!;
        const onOpen = () => {
          ws.removeEventListener("open", onOpen);
          ws.removeEventListener("close", onClose);
          clearTimeout(to);
          send();
        };
        const onClose = () => {
          ws.removeEventListener("open", onOpen);
          ws.removeEventListener("close", onClose);
          clearTimeout(to);
          reject(new Error("Remote workspace not connected"));
        };
        const to = setTimeout(() => {
          ws.removeEventListener("open", onOpen);
          ws.removeEventListener("close", onClose);
          reject(new Error("Remote workspace connect timeout"));
        }, 20_000);
        ws.addEventListener("open", onOpen);
        ws.addEventListener("close", onClose);
      }
    };

    const send = () => {
      waitBridgeSession()
        .then(() => {
          const id = nextGitId++;
          const t = setTimeout(() => {
            pendingGit.delete(id);
            reject(new Error("Remote git timeout"));
          }, timeoutMs);
          pendingGit.set(id, {
            resolve,
            reject,
            t,
          });
          try {
            socket!.send(JSON.stringify({ ...payload, id }));
          } catch (e) {
            clearTimeout(t);
            pendingGit.delete(id);
            reject(e instanceof Error ? e : new Error(String(e)));
          }
        })
        .catch((e) =>
          reject(e instanceof Error ? e : new Error(String(e)))
        );
    };

    waitOpen();
  });
}

export async function remoteGitRemoteList(): Promise<GitRemoteInfo[]> {
  const r = await gitRpc({ t: "git.remote_list" });
  if (!r.ok) throw new Error(r.err ?? "git.remote_list failed");
  return r.remotes ?? [];
}

export async function remoteGitStatus(): Promise<{
  branch: string;
  statuses: Record<string, GitFileStatus>;
  changedPaths: string[];
}> {
  const r = await gitRpc({ t: "git.status" });
  if (!r.ok) throw new Error(r.err ?? "git.status failed");
  const lines = r.lines ?? [];
  const { statuses, changedPaths } = parseGitStatusPorcelain(lines);
  return {
    branch: r.branch ?? "HEAD",
    statuses,
    changedPaths,
  };
}

export async function remoteGitLog(depth = 20): Promise<GitLogEntry[]> {
  const r = await gitRpc({ t: "git.log", depth });
  if (!r.ok) throw new Error(r.err ?? "git.log failed");
  return r.entries ?? [];
}

export async function remoteGitCommit(
  message: string,
  authorName?: string,
  authorEmail?: string
): Promise<{ oid?: string; output?: string }> {
  const r = await gitRpc({
    t: "git.commit",
    message,
    authorName,
    authorEmail,
  });
  if (!r.ok) throw new Error(r.err ?? "git.commit failed");
  return { oid: r.oid, output: r.output };
}

export async function remoteGitCheckout(branch: string): Promise<void> {
  const b = branch.trim();
  if (!b) throw new Error("missing branch");
  const r = await gitRpc({ t: "git.checkout", branch: b });
  if (!r.ok) throw new Error(r.err ?? "git.checkout failed");
}

const GIT_REMOTE_RPC_TIMEOUT_MS = 120_000;

export async function remoteGitPull(token?: string): Promise<void> {
  const r = await gitRpc(
    { t: "git.pull", token: token ?? "" },
    GIT_REMOTE_RPC_TIMEOUT_MS
  );
  if (!r.ok) throw new Error(r.err ?? "git.pull failed");
}

export async function remoteGitPush(
  token?: string,
  opts?: { branch?: string; setUpstream?: boolean }
): Promise<void> {
  const branch = opts?.branch?.trim() ?? "";
  const setUpstream = Boolean(opts?.setUpstream && branch);
  const r = await gitRpc(
    {
      t: "git.push",
      token: token ?? "",
      ...(setUpstream ? { setUpstream: true, branch } : {}),
    },
    GIT_REMOTE_RPC_TIMEOUT_MS
  );
  if (!r.ok) throw new Error(r.err ?? "git.push failed");
}



function workspaceRpc(
  payload: Record<string, unknown>,
  timeoutMs = 60_000
): Promise<WorkspaceRpcResp> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error("Remote workspace not connected"));
      return;
    }
    const rs0 = socket.readyState;
    if (rs0 === WebSocket.CLOSING || rs0 === WebSocket.CLOSED) {
      reject(new Error("Remote workspace not connected"));
      return;
    }

    const waitOpen = () => {
      if (!socket) {
        reject(new Error("Remote workspace not connected"));
        return;
      }
      const rs = socket.readyState;
      if (rs === WebSocket.OPEN) send();
      else if (rs === WebSocket.CLOSING || rs === WebSocket.CLOSED) {
        reject(new Error("Remote workspace not connected"));
      } else {
        const ws = socket!;
        const onOpen = () => {
          ws.removeEventListener("open", onOpen);
          ws.removeEventListener("close", onClose);
          clearTimeout(to);
          send();
        };
        const onClose = () => {
          ws.removeEventListener("open", onOpen);
          ws.removeEventListener("close", onClose);
          clearTimeout(to);
          reject(new Error("Remote workspace not connected"));
        };
        const to = setTimeout(() => {
          ws.removeEventListener("open", onOpen);
          ws.removeEventListener("close", onClose);
          reject(new Error("Remote workspace connect timeout"));
        }, 20_000);
        ws.addEventListener("open", onOpen);
        ws.addEventListener("close", onClose);
      }
    };

    const send = () => {
      waitBridgeSession()
        .then(() => {
          const id = nextWorkspaceId++;
          const t = setTimeout(() => {
            pendingWorkspace.delete(id);
            reject(new Error("Remote workspace RPC timeout"));
          }, timeoutMs);
          pendingWorkspace.set(id, {
            resolve,
            reject,
            t,
          });
          try {
            socket!.send(JSON.stringify({ ...payload, id }));
          } catch (e) {
            clearTimeout(t);
            pendingWorkspace.delete(id);
            reject(e instanceof Error ? e : new Error(String(e)));
          }
        })
        .catch((e) =>
          reject(e instanceof Error ? e : new Error(String(e)))
        );
    };

    waitOpen();
  });
}

function lspRpc(
  method: string,
  params: Record<string, unknown>,
  timeoutMs = 60_000
): Promise<LspRpcResp> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error("Remote workspace not connected"));
      return;
    }
    const rs0 = socket.readyState;
    if (rs0 === WebSocket.CLOSING || rs0 === WebSocket.CLOSED) {
      reject(new Error("Remote workspace not connected"));
      return;
    }

    const waitOpen = () => {
      if (!socket) {
        reject(new Error("Remote workspace not connected"));
        return;
      }
      const rs = socket.readyState;
      if (rs === WebSocket.OPEN) send();
      else if (rs === WebSocket.CLOSING || rs === WebSocket.CLOSED) {
        reject(new Error("Remote workspace not connected"));
      } else {
        const ws = socket!;
        const onOpen = () => {
          ws.removeEventListener("open", onOpen);
          ws.removeEventListener("close", onClose);
          clearTimeout(to);
          send();
        };
        const onClose = () => {
          ws.removeEventListener("open", onOpen);
          ws.removeEventListener("close", onClose);
          clearTimeout(to);
          reject(new Error("Remote workspace not connected"));
        };
        const to = setTimeout(() => {
          ws.removeEventListener("open", onOpen);
          ws.removeEventListener("close", onClose);
          reject(new Error("Remote workspace connect timeout"));
        }, 20_000);
        ws.addEventListener("open", onOpen);
        ws.addEventListener("close", onClose);
      }
    };

    const send = () => {
      waitBridgeSession()
        .then(() => {
          const id = nextLspId++;
          const t = setTimeout(() => {
            pendingLsp.delete(id);
            reject(new Error("Remote LSP timeout"));
          }, timeoutMs);
          pendingLsp.set(id, {
            resolve,
            reject,
            t,
          });
          try {
            socket!.send(JSON.stringify({ t: "lsp.req", id, method, params }));
          } catch (e) {
            clearTimeout(t);
            pendingLsp.delete(id);
            reject(e instanceof Error ? e : new Error(String(e)));
          }
        })
        .catch((e) =>
          reject(e instanceof Error ? e : new Error(String(e)))
        );
    };

    waitOpen();
  });
}

/** JSON-RPC forwarded to `typescript-language-server` on the bridge (after session.ok). */
export async function remoteLspRequest(
  method: string,
  params: Record<string, unknown>
): Promise<unknown> {
  const r = await lspRpc(method, params, 60_000);
  if (!r.ok) throw new Error(r.err ?? "lsp.req failed");
  return r.result;
}

export async function remoteWorkspaceSearch(options: {
  pattern: string;
  path?: string;
  max_matches?: number;
}): Promise<WorkspaceSearchMatch[]> {
  const r = await workspaceRpc({
    t: "workspace.search",
    pattern: options.pattern,
    path: options.path ?? "",
    max_matches: options.max_matches ?? 80,
  });
  if (!r.ok) throw new Error(r.err ?? "workspace.search failed");
  return r.matches ?? [];
}

export async function remoteWorkspaceDiagnostics(
  relPath: string
): Promise<EditorDiagnostic[]> {
  const r = await workspaceRpc(
    { t: "diagnostics.file", path: relPath },
    90_000
  );
  if (!r.ok) throw new Error(r.err ?? "diagnostics.file failed");
  return r.diagnostics ?? [];
}

const AGENT_TOOL_TIMEOUT_MS = 120_000;

/**
 * Phase 4: run one agent tool on the bridge (same WebSocket as FS/PTY).
 */
export function invokeRemoteAgentTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error("Remote workspace not connected"));
      return;
    }
    const rs0 = socket.readyState;
    if (rs0 === WebSocket.CLOSING || rs0 === WebSocket.CLOSED) {
      reject(new Error("Remote workspace not connected"));
      return;
    }

    const id = `at_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;

    const sendToolInner = () => {
      const timer = setTimeout(() => {
        pendingAgentTools.delete(id);
        reject(new Error("Agent tool timeout"));
      }, AGENT_TOOL_TIMEOUT_MS);
      pendingAgentTools.set(id, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
        t: timer,
      });
      try {
        socket!.send(
          JSON.stringify({ t: "agent.tool", id, name, args })
        );
      } catch (e) {
        clearTimeout(timer);
        pendingAgentTools.delete(id);
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    };

    const sendTool = () => {
      waitBridgeSession()
        .then(sendToolInner)
        .catch((e) =>
          reject(e instanceof Error ? e : new Error(String(e)))
        );
    };

    if (socket.readyState === WebSocket.OPEN) {
      sendTool();
      return;
    }

    const ws = socket!;
    const onOpen = () => {
      ws.removeEventListener("open", onOpen);
      ws.removeEventListener("close", onClose);
      clearTimeout(to);
      sendTool();
    };
    const onClose = () => {
      ws.removeEventListener("open", onOpen);
      ws.removeEventListener("close", onClose);
      clearTimeout(to);
      reject(new Error("Remote workspace not connected"));
    };
    const to = setTimeout(() => {
      ws.removeEventListener("open", onOpen);
      ws.removeEventListener("close", onClose);
      reject(new Error("Remote workspace connect timeout"));
    }, 20_000);
    ws.addEventListener("open", onOpen);
    ws.addEventListener("close", onClose);
  });
}
