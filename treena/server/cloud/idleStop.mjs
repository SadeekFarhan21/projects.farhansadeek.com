/**
 * Idle-stop daemon. Replaces reaper.mjs semantics for the Fly Machines model.
 *
 * Runs in-process with api.mjs (started by start() at boot). Every 60s:
 *   1. listMachines() once — single call, cheap
 *   2. For each `started` machine, decide whether to probe /busy:
 *      - idleSinceMs < 2min  → skip (definitely active)
 *      - idleSinceMs 2-4min  → probe every ~2.5min (probabilistic catch)
 *      - idleSinceMs >= 4min → probe every 30s (tighten approach to 5min cap)
 *   3. If !busy && idleSinceMs >= IDLE_STOP_MS, stopMachine + update DDB.
 *
 * Never destroys machines — that's account-deletion only. Volume + state
 * persist across stop/start cycles.
 *
 * Recovery: in-process, so api.mjs crash kills the daemon. Fly auto-restarts
 * api.mjs and the daemon resumes at the next tick. If down >1h, machines pile
 * up; bridge auto-destroy.mjs (WS-idle self-stop) is the second-layer defense.
 */
import { listMachines, stopMachine, FLY_FORCE_INSTANCE_HEADER } from "./fly.mjs";
import { updateUserMachine } from "./db.mjs";
import { emitMetric } from "./metrics.mjs";

// Mirror of api.mjs's structured event logger; small enough to inline rather
// than introduce a shared file just for this.
function logEvent(name, data = {}) {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      kind: "event",
      name,
      ...data,
    })
  );
}

const TICK_MS = 60_000;
const MISSED_TICK_THRESHOLD_MS = 90_000;
const IDLE_STOP_MS = 5 * 60_000;
const PROBE_TIMEOUT_MS = 3000;
const BRIDGE_BUSY_URL =
  process.env.FLY_BRIDGE_BUSY_URL || "https://treena-bridge.fly.dev/busy";

// In-memory tracking. Survives only as long as the api.mjs process; on restart
// we lose lastActivity history and treat every machine as freshly seen.
const tracking = new Map(); // machineId -> { lastSeen, lastActivity, lastProbedAt, userId }

let timer = null;
let lastTickAt = 0;

export function start() {
  if (timer) return timer;
  timer = setInterval(() => tick().catch((err) => {
    console.error("[idleStop] tick error:", err.message);
  }), TICK_MS);
  if (typeof timer.unref === "function") timer.unref();
  console.log(`[idleStop] started (interval=${TICK_MS}ms, idle-stop=${IDLE_STOP_MS}ms)`);
  return timer;
}

export function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

/**
 * Parse the userId from a machine's name. We name machines `user-<id>`
 * in fly.mjs createMachine; if the name doesn't match, return null.
 */
function userIdFromMachineName(name) {
  if (!name) return null;
  const m = /^user-(\d+)$/.exec(name);
  return m ? Number(m[1]) : null;
}

/**
 * Decide whether to probe /busy for a machine based on tiered cadence.
 */
function shouldProbe(now, idleSinceMs, lastProbedAt) {
  if (idleSinceMs < 2 * 60_000) return false;
  const sinceProbe = now - lastProbedAt;
  if (idleSinceMs < 4 * 60_000) {
    return sinceProbe >= 150_000; // every ~2.5 min in 2-4min window
  }
  return sinceProbe >= 30_000; // every 30s once we cross 4min
}

/**
 * Probe a single machine's /busy endpoint via Fly proxy.
 * Returns { active: boolean, idleSinceMs?: number } or null on error.
 *
 * Conservative: any probe failure treated as `active: true` so we don't
 * stop a machine just because the probe endpoint is unreachable.
 */
async function probeBusy(machineId) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(BRIDGE_BUSY_URL, {
      method: "GET",
      headers: { [FLY_FORCE_INSTANCE_HEADER]: machineId },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.warn(`[idleStop] /busy probe ${machineId}: ${res.status}`);
      return { active: true };
    }
    const body = await res.json().catch(() => ({}));
    return {
      active: !!body.active,
      idleSinceMs: typeof body.idleSinceMs === "number" ? body.idleSinceMs : undefined,
      reason: body.reason,
    };
  } catch (err) {
    console.warn(`[idleStop] /busy probe ${machineId} failed:`, err.message);
    return { active: true };
  } finally {
    clearTimeout(timeout);
  }
}

async function tick() {
  const now = Date.now();
  if (lastTickAt && now - lastTickAt > MISSED_TICK_THRESHOLD_MS) {
    console.warn(
      `[idleStop] missed tick: ${now - lastTickAt}ms since last (threshold ${MISSED_TICK_THRESHOLD_MS}ms)`
    );
  }
  lastTickAt = now;

  let machines;
  try {
    machines = await listMachines();
  } catch (err) {
    console.error("[idleStop] listMachines failed:", err.message);
    return;
  }

  // Periodic samplers — free since we already have the listMachines result.
  // Total active count + per-state breakdown so the dashboard can graph
  // started / stopped / starting / failed all at once.
  const stateCounts = {};
  let started = 0;
  for (const m of machines) {
    const s = m.state || "unknown";
    stateCounts[s] = (stateCounts[s] || 0) + 1;
    if (s === "started") started += 1;
  }
  emitMetric({
    name: "ActiveMachineCount",
    value: started,
    unit: "Count",
  });
  emitMetric({
    name: "TotalMachineCount",
    value: machines.length,
    unit: "Count",
  });
  for (const [state, count] of Object.entries(stateCounts)) {
    emitMetric({
      name: "MachinesByState",
      value: count,
      unit: "Count",
      dimensions: { State: state },
    });
  }

  const seen = new Set();

  for (const m of machines) {
    seen.add(m.id);
    if (m.state !== "started") continue;

    const userId = userIdFromMachineName(m.name);
    if (userId == null) {
      console.warn(`[idleStop] machine ${m.id} has unrecognized name '${m.name}', skipping`);
      continue;
    }

    let entry = tracking.get(m.id);
    if (!entry) {
      // First sight — assume active right now so we don't immediately probe
      entry = { lastSeen: now, lastActivity: now, lastProbedAt: 0, userId };
      tracking.set(m.id, entry);
    } else {
      entry.lastSeen = now;
      entry.userId = userId;
    }

    const idleSinceMs = now - entry.lastActivity;
    if (!shouldProbe(now, idleSinceMs, entry.lastProbedAt)) continue;

    entry.lastProbedAt = now;
    const result = await probeBusy(m.id);

    if (result.active) {
      // Reset our idle clock — bridge says it's busy.
      entry.lastActivity = now;
      continue;
    }

    // Prefer the bridge's own idle measure when present (more accurate than
    // our wall-clock estimate which only updates between probes).
    const effectiveIdleMs =
      typeof result.idleSinceMs === "number" ? result.idleSinceMs : idleSinceMs;
    if (effectiveIdleMs < IDLE_STOP_MS) continue;

    try {
      await stopMachine(m.id);
      logEvent("machine.stop.success", {
        githubUserId: userId,
        machineId: m.id,
        idleMs: effectiveIdleMs,
      });
      emitMetric({
        name: "MachineStopCount",
        value: 1,
        unit: "Count",
        dimensions: { Reason: "idle" },
      });
      emitMetric({
        name: "MachineIdleAtStopMs",
        value: effectiveIdleMs,
        unit: "Milliseconds",
      });
      try {
        await updateUserMachine(userId, {
          status: "stopped",
          lastStoppedAt: now,
        });
      } catch (err) {
        console.error(`[idleStop] DDB update failed for user ${userId}:`, err.message);
      }
      tracking.delete(m.id);
    } catch (err) {
      console.error(`[idleStop] stopMachine ${m.id} failed:`, err.message);
      emitMetric({
        name: "MachineStopFailureCount",
        value: 1,
        unit: "Count",
      });
    }
  }

  // Drop tracking entries for machines no longer in the list (destroyed,
  // moved, or just gone). Keep them for one tick of grace in case of a
  // transient listMachines glitch.
  for (const [machineId, entry] of tracking) {
    if (!seen.has(machineId) && now - entry.lastSeen > 2 * TICK_MS) {
      tracking.delete(machineId);
    }
  }
}

/**
 * One-shot manual sweep — exposed so a CLI script (`npm run idle-sweep`) can
 * invoke a single pass during extended outages, or for testing.
 */
export async function runOnce() {
  await tick();
}
