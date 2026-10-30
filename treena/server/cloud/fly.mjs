/**
 * Fly Machines API client. Replaces the ECS path in ecs.mjs for the
 * post-migration runtime model: one persistent Fly Machine + Volume per user.
 *
 * Volumes hold the user's cloned repos, node_modules, and branch state.
 * Machines are stop/start cycled; the volume + state persist across cycles.
 * Machines are only destroyed on account deletion (out of scope here).
 *
 * API reference: https://fly.io/docs/machines/api/
 */

const FLY_API_BASE = process.env.FLY_API_BASE || "https://api.machines.dev/v1";
const FLY_API_TOKEN = process.env.FLY_API_TOKEN || "";
const BRIDGE_APP = process.env.FLY_BRIDGE_APP || "treena-bridge";
const DEFAULT_REGION = process.env.FLY_DEFAULT_REGION || "iad";
const DEFAULT_VOLUME_GB = Number(process.env.FLY_DEFAULT_VOLUME_GB || 10);

// Day 6.3: bridge image is auto-resolved from the latest fly-deploy-launched
// machine in the bridge app (see getCurrentBridgeImage). The legacy
// `:latest` default that lived here was always wrong (Fly doesn't auto-tag
// :latest); keeping it caused silent breakage on every bridge deploy. The
// FLY_BRIDGE_IMAGE env var stays as a redundant manual-override backup —
// auto-resolve is primary, env var is the safety net. Defense in depth.
const IMAGE_CACHE_TTL_MS = 60_000;
let imageCache = { image: null, expiresAt: 0 };

const VM_GUEST = {
  cpu_kind: "shared",
  cpus: 1,
  memory_mb: 1024,
};

function ensureToken() {
  if (!FLY_API_TOKEN) {
    throw new Error(
      "FLY_API_TOKEN is not set — required for Fly Machines API calls"
    );
  }
}

/**
 * Sleep helper for retry backoff.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Low-level Fly REST call with retry on 429 / 5xx and per-request timeout.
 *
 * Retries:
 *   - 429: respect Retry-After header (default 1s), up to 3 attempts
 *   - 5xx: 1 retry after 1s
 *   - timeout / network error: 1 retry after 1s
 *   - other non-2xx: throw immediately with body details
 *
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs=30000] Per-request timeout. On expiry, fetch
 *   aborts and throws; backgroundProvision's catch then marks the row failed.
 */
async function flyApi(method, path, body, opts = {}) {
  ensureToken();
  const url = `${FLY_API_BASE}${path}`;
  const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : DEFAULT_TIMEOUT_MS;
  let attempt = 0;
  let lastErr = null;

  while (attempt < 4) {
    attempt += 1;
    let res;
    try {
      res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${FLY_API_TOKEN}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body == null ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      // AbortError / TimeoutError from AbortSignal.timeout, or other network
      // failure. Surface a structured timeout message so backgroundProvision's
      // catch can mark the row failed cleanly.
      const isTimeout = err?.name === "TimeoutError" || err?.name === "AbortError";
      lastErr = isTimeout
        ? new Error(`Fly API ${method} ${path} timed out after ${timeoutMs}ms`)
        : err;
      if (attempt >= 2) break;
      await sleep(1000);
      continue;
    }

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after") || 1);
      lastErr = new Error(`Fly API 429 (retry ${attempt}/3, after ${retryAfter}s)`);
      if (attempt >= 4) break;
      await sleep(retryAfter * 1000);
      continue;
    }

    if (res.status >= 500 && res.status < 600) {
      lastErr = new Error(`Fly API ${res.status}`);
      if (attempt >= 2) break;
      await sleep(1000);
      continue;
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Fly API ${method} ${path} ${res.status}: ${text || res.statusText}`
      );
    }

    if (res.status === 204) return null;
    return res.json();
  }

  throw lastErr || new Error(`Fly API ${method} ${path} failed`);
}

/**
 * Create a Fly Volume for a user.
 *
 * @param {object} args
 * @param {number|string} args.userId  GitHub user ID, used in the volume name
 * @param {number} [args.sizeGb=10]    Volume size; can be resized later up to limit
 * @param {string} [args.region]       Fly region; defaults to iad
 * @returns {Promise<{volumeId: string, region: string, sizeGb: number}>}
 */
export async function createVolume({ userId, sizeGb = DEFAULT_VOLUME_GB, region = DEFAULT_REGION } = {}) {
  if (!userId && userId !== 0) throw new Error("createVolume requires userId");
  const name = `user_${userId}_workspace`;
  const result = await flyApi("POST", `/apps/${BRIDGE_APP}/volumes`, {
    name,
    region,
    size_gb: sizeGb,
  });
  return {
    volumeId: result.id,
    region: result.region,
    sizeGb: result.size_gb,
  };
}

/**
 * Create a Fly Machine in stopped state, mounted to the user's volume.
 * Pass `skip_launch: true` so the machine is created but not started — start
 * is a separate API call so the orchestrator can finalize env/secrets first.
 *
 * @param {object} args
 * @param {number|string} args.userId
 * @param {string} args.volumeId
 * @param {object} [args.env]          Container env overrides
 * @param {string} [args.region]
 * @param {string} [args.image]        Override the bridge image (rare; for
 *                                     normal use, leave undefined and let
 *                                     getCurrentBridgeImage() auto-resolve
 *                                     from the latest fly-deploy-launched
 *                                     machine).
 * @returns {Promise<{machineId: string, region: string, state: string}>}
 */
export async function createMachine({ userId, volumeId, env = {}, region = DEFAULT_REGION, image } = {}) {
  if (!userId && userId !== 0) throw new Error("createMachine requires userId");
  if (!volumeId) throw new Error("createMachine requires volumeId");

  // Day 6.3: auto-resolve image from latest bridge release if not explicitly
  // overridden. Cached 60s; falls back to FLY_BRIDGE_IMAGE env on failure.
  const resolvedImage = image || (await getCurrentBridgeImage());

  const name = `user-${userId}`;
  const config = {
    image: resolvedImage,
    env: {
      WORKSPACE_DIR: "/workspace",
      PORT: "3001",
      TRUST_PROXY: "1",
      ...env,
    },
    mounts: [
      {
        volume: volumeId,
        path: "/workspace",
      },
    ],
    guest: VM_GUEST,
    auto_destroy: false,
    // CRITICAL: Fly's HTTP proxy only routes to machines that declare a
    // `services` block. The [http_service] in fly.toml only generates this
    // for machines created by `fly deploy` — API-created per-user machines
    // need to declare services explicitly or fly-force-instance-id requests
    // hang and 503 after 30s.
    services: [
      {
        protocol: "tcp",
        internal_port: 3001,
        autostart: true,
        autostop: false,
        min_machines_running: 0,
        ports: [
          { port: 80, handlers: ["http"], force_https: true },
          { port: 443, handlers: ["http", "tls"] },
        ],
      },
    ],
    // CRITICAL: Fly's HTTP proxy uses fly_process_group to scope routing per
    // process. Without this, the machine isn't included in the [http_service]
    // routing pool even with `services` declared.
    metadata: {
      fly_process_group: "app",
    },
  };

  const result = await flyApi("POST", `/apps/${BRIDGE_APP}/machines`, {
    name,
    region,
    config,
    skip_launch: true,
  });
  return {
    machineId: result.id,
    region: result.region,
    state: result.state,
  };
}

/**
 * Start a stopped Fly Machine. No-op if already running.
 */
export async function startMachine(machineId) {
  if (!machineId) throw new Error("startMachine requires machineId");
  return flyApi("POST", `/apps/${BRIDGE_APP}/machines/${machineId}/start`);
}

/**
 * Stop a running Fly Machine. Volume + state preserved.
 */
export async function stopMachine(machineId) {
  if (!machineId) throw new Error("stopMachine requires machineId");
  return flyApi("POST", `/apps/${BRIDGE_APP}/machines/${machineId}/stop`, {
    signal: "SIGTERM",
    timeout: 30,
  });
}

/**
 * Destroy a machine. ONLY use this on account deletion — for normal
 * "session ended" flows, call stopMachine. Force=true to skip the
 * "machine must be stopped" check.
 */
export async function destroyMachine(machineId) {
  if (!machineId) throw new Error("destroyMachine requires machineId");
  return flyApi("DELETE", `/apps/${BRIDGE_APP}/machines/${machineId}?force=true`);
}

/**
 * Destroy a volume. Same caveat as destroyMachine — only on account deletion.
 */
export async function destroyVolume(volumeId) {
  if (!volumeId) throw new Error("destroyVolume requires volumeId");
  return flyApi("DELETE", `/apps/${BRIDGE_APP}/volumes/${volumeId}`);
}

/**
 * Get current state of a machine.
 * @returns {Promise<{id, state, region, private_ip, ...}>}
 */
export async function getMachine(machineId) {
  if (!machineId) throw new Error("getMachine requires machineId");
  return flyApi("GET", `/apps/${BRIDGE_APP}/machines/${machineId}`);
}

/**
 * List all machines in the bridge app. Used by the idle-stop daemon.
 * Single call — do not per-machine fetch in the daemon's hot loop.
 */
export async function listMachines() {
  const result = await flyApi("GET", `/apps/${BRIDGE_APP}/machines`);
  return Array.isArray(result) ? result : [];
}

/**
 * Resolve the current bridge image for new per-user machine creates.
 *
 * Day 6.3: Fly has no `/releases` endpoint and no app-level "current image"
 * field, so we read it from the latest fly-deploy-launched machine in the
 * bridge app. fly-deploy stamps `metadata.fly_release_version` on machines
 * it creates; per-user machines created via `createMachine` here do NOT have
 * that field, so it's a clean discriminator.
 *
 * Strategy: list machines, filter to those with fly_release_version, sort
 * by version desc, return the top one's `config.image`.
 *
 * Cache: 60s in-memory. Accepts up to a 60s window where new users right
 * after a bridge deploy may be created with the prior image — acceptable.
 *
 * Fallback: process.env.FLY_BRIDGE_IMAGE (kept as a redundant manual-pin
 * safety net per the deploy docs). Throws if both auto-resolve and env are
 * unavailable.
 *
 * Image normalization: strips `@sha256:...` digest suffix if present so the
 * Fly API receives a clean `<repo>:<tag>` ref. Both forms are valid OCI but
 * the tag-only form matches what `fly deploy` originally pushes.
 */
export async function getCurrentBridgeImage() {
  const now = Date.now();
  if (imageCache.image && imageCache.expiresAt > now) {
    return imageCache.image;
  }
  try {
    const machines = await listMachines();
    const candidates = machines.filter(
      (m) =>
        m &&
        m.config &&
        m.config.image &&
        m.config.metadata &&
        m.config.metadata.fly_release_version
    );
    if (candidates.length === 0) {
      throw new Error(
        `no fly-deploy-launched machine in app '${BRIDGE_APP}' (no machine has metadata.fly_release_version)`
      );
    }
    candidates.sort(
      (a, b) =>
        Number(b.config.metadata.fly_release_version) -
        Number(a.config.metadata.fly_release_version)
    );
    const rawImage = candidates[0].config.image;
    const image = rawImage.replace(/@sha256:[a-f0-9]+$/i, "");
    imageCache = { image, expiresAt: now + IMAGE_CACHE_TTL_MS };
    return image;
  } catch (err) {
    const fallback = process.env.FLY_BRIDGE_IMAGE;
    if (fallback) {
      console.warn(
        `[fly] getCurrentBridgeImage auto-resolve failed (${err && err.message ? err.message : err}); falling back to FLY_BRIDGE_IMAGE env`
      );
      return fallback;
    }
    throw new Error(
      `Could not resolve bridge image (no FLY_BRIDGE_IMAGE fallback set): ${err && err.message ? err.message : err}`
    );
  }
}

/**
 * Update a machine's env (e.g., rotate FLY_API_TOKEN, refresh GitHub PAT).
 * Fly's update endpoint replaces the full machine config + restarts the machine,
 * so we read current config, merge env, and write back.
 */
export async function updateMachineEnv(machineId, envPatch) {
  if (!machineId) throw new Error("updateMachineEnv requires machineId");
  const machine = await getMachine(machineId);
  const config = machine.config || {};
  const newConfig = {
    ...config,
    env: { ...(config.env || {}), ...envPatch },
  };
  return flyApi("POST", `/apps/${BRIDGE_APP}/machines/${machineId}`, {
    config: newConfig,
  });
}

/**
 * Build the wsUrl mobile clients use to reach a specific machine via Fly's
 * proxy. Fly auto-starts stopped machines on incoming requests when
 * auto_start_machines = true (set in fly.toml).
 */
export function buildBridgeWsUrl(machineId, bridgeToken) {
  const params = new URLSearchParams();
  if (bridgeToken) params.set("token", bridgeToken);
  if (machineId) params.set("machine", machineId);
  const qs = params.toString();
  return `wss://${BRIDGE_APP}.fly.dev${qs ? "?" + qs : ""}`;
}

/**
 * The Fly proxy header that pins a request to a specific machine instance.
 * Mobile clients should send this on the WS upgrade so the right machine wakes.
 */
export const FLY_FORCE_INSTANCE_HEADER = "fly-force-instance-id";
