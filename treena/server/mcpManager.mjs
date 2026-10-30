/**
 * MCP (Model Context Protocol) manager for the workspace bridge.
 *
 * Reads `.treena/mcp.json` from the workspace, optional **runtime overlay** from the app
 * (`mcp.setRuntimeConfig`), spawns stdio or remote transports, discovers tools, and routes
 * tool calls from the agent.
 *
 * Tool names: `mcp__<serverName>__<toolName>`
 */

import fs from "node:fs/promises";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { WebSocketClientTransport } from "@modelcontextprotocol/sdk/client/websocket.js";

const CONFIG_FILE = ".treena/mcp.json";
const MAX_RESTART_ATTEMPTS = 3;
const RESTART_DELAY_MS = 5_000;

/** @type {string} */
let workspaceDir = "";

/** Effective config last applied (file ∪ runtime merge). */
/** @type {Record<string, object>} */
let currentConfig = {};

/** From `mcp.setRuntimeConfig` — when active, only these server names run (merged per-key with file). */
/** @type {Record<string, object>} */
let runtimeOverlay = {};
let runtimeFilterActive = false;

/**
 * @typedef {{
 *   status: "connected" | "error" | "starting";
 *   tools: { name: string; description: string; namespacedName: string; parameters: object }[];
 *   error?: string;
 * }} McpServerState
 */

/** @type {Map<string, {
 *   raw: object;
 *   client: Client | null;
 *   transport: { close: () => Promise<void> } | null;
 *   state: McpServerState;
 *   restartCount: number;
 *   restartTimer: ReturnType<typeof setTimeout> | null;
 * }>} */
const servers = new Map();

/** @type {Set<(status: Record<string, McpServerState>) => void>} */
const statusListeners = new Set();

export function init(cwd) {
  workspaceDir = cwd;
}

/**
 * Day 6.5: re-target the workspace dir at runtime (called when a WS connects
 * with an `activeRepoDir` query param). Idempotent if cwd unchanged. On
 * change, triggers a config reload so per-repo `.treena/mcp.json` is picked
 * up. Best-effort — caller should swallow errors.
 *
 * Module-level state means: with multiple WS clients on different repos,
 * last-connect wins. Acceptable single-tenant approximation per CLAUDE.md
 * ("Two devices same account → both connect to same machine, bridge handles
 * 2 WS clients" — both will typically be on the same repo).
 */
export async function setWorkspaceDir(cwd) {
  if (!cwd || cwd === workspaceDir) return;
  workspaceDir = cwd;
  await reloadConfig().catch(() => { /* best-effort */ });
}

export async function loadConfig() {
  const configPath = path.join(workspaceDir, CONFIG_FILE);
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.mcpServers === "object") {
      return parsed.mcpServers;
    }
  } catch {
    /* missing / invalid */
  }
  return {};
}

async function computeEffectiveConfig() {
  const file = await loadConfig();
  if (!runtimeFilterActive) {
    return { ...file };
  }
  /** @type {Record<string, object>} */
  const out = {};
  for (const name of Object.keys(runtimeOverlay)) {
    const f = file[name];
    const r = runtimeOverlay[name];
    out[name] = {
      ...(f && typeof f === "object" ? f : {}),
      ...(r && typeof r === "object" ? r : {}),
    };
  }
  return out;
}

/**
 * Replace / clear runtime MCP config from the mobile app.
 * @param {{ clear?: boolean; servers?: Record<string, object> }} payload
 */
export async function setRuntimeConfig(payload) {
  if (payload?.clear === true) {
    runtimeFilterActive = false;
    runtimeOverlay = {};
  } else if (payload?.servers && typeof payload.servers === "object") {
    runtimeFilterActive = true;
    runtimeOverlay = { ...payload.servers };
  } else {
    runtimeFilterActive = false;
    runtimeOverlay = {};
  }
  await reloadConfig();
}

export async function spawnAll() {
  const config = await computeEffectiveConfig();
  currentConfig = config;
  const names = Object.keys(config);
  if (names.length === 0) return;
  console.log(`[mcp] Starting ${names.length} server(s) (effective config)`);
  await Promise.allSettled(names.map((name) => spawnServer(name, config[name])));
}

export async function reloadConfig() {
  const newConfig = await computeEffectiveConfig();
  const oldNames = new Set(Object.keys(currentConfig));
  const newNames = new Set(Object.keys(newConfig));

  for (const name of oldNames) {
    if (!newNames.has(name)) {
      console.log(`[mcp] Server "${name}" removed, stopping`);
      await stopServer(name);
    }
  }

  for (const name of newNames) {
    const oldCfg = currentConfig[name];
    const newCfg = newConfig[name];
    const changed = !oldCfg || JSON.stringify(oldCfg) !== JSON.stringify(newCfg);

    if (changed) {
      if (oldCfg) {
        console.log(`[mcp] Server "${name}" config changed, restarting`);
        await stopServer(name);
      } else {
        console.log(`[mcp] New server "${name}", starting`);
      }
      await spawnServer(name, newCfg);
    }
  }

  currentConfig = newConfig;
  broadcastStatus();
}

export function getStatus() {
  /** @type {Record<string, McpServerState>} */
  const result = {};
  for (const [name, entry] of servers) {
    result[name] = { ...entry.state };
  }
  return result;
}

export function getAggregatedTools() {
  const tools = [];
  for (const [serverName, entry] of servers) {
    if (entry.state.status !== "connected") continue;
    for (const tool of entry.state.tools) {
      tools.push({
        type: "function",
        function: {
          name: tool.namespacedName,
          description: `[MCP: ${serverName}] ${tool.description}`,
          parameters: tool.parameters,
        },
      });
    }
  }
  return tools;
}

export async function callTool(namespacedName, args) {
  const parts = namespacedName.split("__");
  if (parts.length < 3 || parts[0] !== "mcp") {
    throw new Error(`Invalid MCP tool name: ${namespacedName}`);
  }
  const serverName = parts[1];
  const toolName = parts.slice(2).join("__");

  const entry = servers.get(serverName);
  if (!entry) {
    throw new Error(`MCP server "${serverName}" not found`);
  }
  if (entry.state.status !== "connected" || !entry.client) {
    throw new Error(
      `MCP server "${serverName}" is not connected (status: ${entry.state.status})`
    );
  }

  const result = await entry.client.callTool({
    name: toolName,
    arguments: args,
  });

  return result;
}

export function onStatusChange(fn) {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

export async function shutdownAll() {
  for (const name of [...servers.keys()]) {
    await stopServer(name);
  }
}

export function isMcpConfigPath(relPath) {
  const normalized = relPath.replace(/\\/g, "/");
  return normalized === CONFIG_FILE || normalized === ".treena\\mcp.json";
}

// ── env file ────────────────────────────────────────────────

async function parseEnvFile(absPath) {
  /** @type {Record<string, string>} */
  const env = {};
  let raw;
  try {
    raw = await fs.readFile(absPath, "utf-8");
  } catch {
    return env;
  }
  for (const line of raw.split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    let key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (key.startsWith("export ")) key = key.slice(7).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key) env[key] = val;
  }
  return env;
}

async function resolveStdioEnv(cfg) {
  /** @type {Record<string, string>} */
  const merged = { ...process.env };
  if (cfg.envFile && typeof cfg.envFile === "string") {
    const resolved = path.resolve(workspaceDir, cfg.envFile);
    const root = path.resolve(workspaceDir);
    const normR = path.normalize(resolved);
    const normRoot = path.normalize(root);
    if (!normR.startsWith(normRoot)) {
      throw new Error("envFile must be inside workspace root");
    }
    Object.assign(merged, await parseEnvFile(normR));
  }
  if (cfg.env && typeof cfg.env === "object") {
    for (const [k, v] of Object.entries(cfg.env)) {
      if (typeof v === "string") merged[k] = v;
    }
  }
  return merged;
}

function buildRequestInit(headers) {
  if (!headers || typeof headers !== "object") return undefined;
  /** @type {Record<string, string>} */
  const h = {};
  for (const [k, v] of Object.entries(headers)) {
    if (typeof v === "string" && v.length) h[k] = v;
  }
  return Object.keys(h).length ? { headers: h } : undefined;
}

/**
 * @param {object} raw
 * @returns {{ kind: "stdio"; command: string; args: string[]; envFile?: string; env?: object } | { kind: "remote"; url: string; headers?: object }}
 */
function normalizeServerConfig(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("invalid MCP server config");
  }
  if (typeof raw.url === "string" && raw.url.trim()) {
    return {
      kind: "remote",
      url: raw.url.trim(),
      headers: raw.headers,
    };
  }
  if (typeof raw.command === "string" && raw.command.trim()) {
    return {
      kind: "stdio",
      command: raw.command.trim(),
      args: Array.isArray(raw.args) ? raw.args.map(String) : [],
      envFile: typeof raw.envFile === "string" ? raw.envFile : undefined,
      env: raw.env,
    };
  }
  throw new Error("MCP server needs `command` (stdio) or `url` (remote)");
}

/**
 * Try streamable HTTP → SSE → WebSocket (ws/wss URLs only try WebSocket).
 * Handlers are attached before connect so disconnect events are not missed.
 */
async function connectRemoteWithBestTransport(urlStr, headers, attachHandlers) {
  const url = new URL(urlStr);
  const reqInit = buildRequestInit(headers);
  const opts = reqInit ? { requestInit: reqInit } : {};

  /** @type {Error[]} */
  const failures = [];

  const tryOrder = [];
  if (url.protocol === "ws:" || url.protocol === "wss:") {
    tryOrder.push(() => new WebSocketClientTransport(url));
  } else {
    tryOrder.push(
      () => new StreamableHTTPClientTransport(url, opts),
      () => new SSEClientTransport(url, opts)
    );
  }

  for (const make of tryOrder) {
    const transport = make();
    const client = new Client(
      { name: "treena-bridge", version: "1.0.0" },
      { capabilities: {} }
    );
    attachHandlers(transport);
    try {
      await client.connect(transport);
      return { client, transport };
    } catch (err) {
      failures.push(err instanceof Error ? err : new Error(String(err)));
      try {
        await transport.close();
      } catch {
        /* ignore */
      }
    }
  }
  const msg = failures.map((e) => e.message).join(" | ");
  throw new Error(`remote MCP connect failed: ${msg}`);
}

async function spawnServer(name, rawConfig) {
  if (servers.has(name)) {
    await stopServer(name);
  }

  let norm;
  try {
    norm = normalizeServerConfig(rawConfig);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[mcp] Invalid config for "${name}":`, msg);
    /** @type {typeof servers extends Map<string, infer V> ? V : never} */
    const badEntry = {
      raw: rawConfig,
      client: null,
      transport: null,
      state: { status: "error", tools: [], error: msg },
      restartCount: 0,
      restartTimer: null,
    };
    servers.set(name, badEntry);
    broadcastStatus();
    return;
  }

  /** @type {typeof servers extends Map<string, infer V> ? V : never} */
  const entry = {
    raw: rawConfig,
    client: null,
    transport: null,
    state: { status: "starting", tools: [], error: undefined },
    restartCount: 0,
    restartTimer: null,
  };
  servers.set(name, entry);

  try {
    let client;

    if (norm.kind === "stdio") {
      client = new Client(
        { name: "treena-bridge", version: "1.0.0" },
        { capabilities: {} }
      );
      const env = await resolveStdioEnv(norm);
      const transport = new StdioClientTransport({
        command: norm.command,
        args: norm.args,
        env,
        cwd: workspaceDir,
        stderr: "inherit",
      });
      entry.transport = transport;
      entry.client = client;

      transport.onclose = () => {
        if (entry.state.status === "connected") {
          console.log(`[mcp] Server "${name}" disconnected unexpectedly`);
          entry.state = {
            status: "error",
            tools: [],
            error: "Process exited unexpectedly",
          };
          entry.client = null;
          entry.transport = null;
          broadcastStatus();
          scheduleRestart(name);
        }
      };
      transport.onerror = (err) => {
        console.error(`[mcp] Server "${name}" transport error:`, err?.message || err);
      };

      await client.connect(transport);
    } else {
      const { client: rc, transport } = await connectRemoteWithBestTransport(
        norm.url,
        norm.headers,
        (tr) => {
          tr.onclose = () => {
            if (entry.state.status === "connected") {
              entry.state = {
                status: "error",
                tools: [],
                error: "Remote transport closed",
              };
              entry.client = null;
              entry.transport = null;
              broadcastStatus();
              scheduleRestart(name);
            }
          };
          tr.onerror = (err) => {
            console.error(`[mcp] Server "${name}" transport error:`, err?.message || err);
          };
        }
      );
      client = rc;
      entry.transport = transport;
      entry.client = client;
    }

    const toolsResult = await client.listTools();
    const tools = (toolsResult.tools || []).map((t) => ({
      name: t.name,
      description: t.description || t.name,
      namespacedName: `mcp__${name}__${t.name}`,
      parameters: t.inputSchema || { type: "object", properties: {} },
    }));

    entry.state = { status: "connected", tools, error: undefined };
    entry.restartCount = 0;
    console.log(
      `[mcp] Server "${name}" connected (${tools.length} tool${tools.length === 1 ? "" : "s"})`
    );
    broadcastStatus();
  } catch (err) {
    const msg = err?.message || String(err);
    console.error(`[mcp] Failed to start server "${name}":`, msg);
    entry.state = { status: "error", tools: [], error: msg };
    entry.client = null;
    entry.transport = null;
    broadcastStatus();
    scheduleRestart(name);
  }
}

async function stopServer(name) {
  const entry = servers.get(name);
  if (!entry) return;

  if (entry.restartTimer) {
    clearTimeout(entry.restartTimer);
    entry.restartTimer = null;
  }

  if (entry.client) {
    try {
      await entry.client.close();
    } catch {
      /* ignore */
    }
  }

  servers.delete(name);
}

function scheduleRestart(name) {
  const entry = servers.get(name);
  if (!entry) return;

  if (entry.restartCount >= MAX_RESTART_ATTEMPTS) {
    console.log(
      `[mcp] Server "${name}" exceeded max restart attempts (${MAX_RESTART_ATTEMPTS})`
    );
    return;
  }

  entry.restartCount += 1;
  const delay = RESTART_DELAY_MS * entry.restartCount;
  console.log(
    `[mcp] Will restart "${name}" in ${delay / 1000}s (attempt ${entry.restartCount}/${MAX_RESTART_ATTEMPTS})`
  );

  entry.restartTimer = setTimeout(async () => {
    entry.restartTimer = null;
    console.log(`[mcp] Restarting server "${name}"...`);
    const cfg = currentConfig[name] || entry.raw;
    await spawnServer(name, cfg);
  }, delay);
}

function broadcastStatus() {
  const status = getStatus();
  for (const fn of statusListeners) {
    try {
      fn(status);
    } catch {
      /* ignore */
    }
  }
}
