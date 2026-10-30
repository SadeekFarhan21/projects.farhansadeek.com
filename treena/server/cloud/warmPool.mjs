/**
 * Phase 2 — Warm pool of pre-launched Fargate bridge tasks.
 *
 * Architecture:
 *   - launchTask() spawns warm tasks with a CLAIM_TOKEN env var and no repo;
 *     bridge enters PRE_CLAIM mode (rejects WS until /claim arrives).
 *   - This module tracks task state in-memory and refills the pool on a timer.
 *   - api.mjs POST /sessions calls tryAcquireWarmTask(); if a READY task is
 *     available, it pops it and POSTs /claim to the bridge with the user's
 *     credentials. On success, hand the WS URL back to the user.
 *   - On failure or empty pool, api.mjs falls back to today's cold-launch path.
 *
 * State machine per task:
 *   LAUNCHING → bridge is booting; we're polling describeTask + /health
 *   READY     → bridge is up, public IP attached, waiting to be claimed
 *   (removed) → handed to a user via tryAcquireWarmTask, or auto-destroyed
 *
 * Defaults to disabled (WARM_POOL_MIN=0) so this code is dormant until the
 * operator opts in by setting WARM_POOL_MIN >= 1 on the API task.
 */
import http from "node:http";
import crypto from "node:crypto";
import { launchTask, describeTask } from "./ecs.mjs";

const MIN_POOL_SIZE = Number(process.env.WARM_POOL_MIN || 0);
const REFILL_INTERVAL_MS = 30_000;
const READY_POLL_INTERVAL_MS = 5_000;
const READY_TIMEOUT_MS = 5 * 60_000;

/** @typedef {{ taskArn: string, publicIp: string|null, claimToken: string, createdAt: number, status: "LAUNCHING"|"READY" }} WarmEntry */

/** @type {Map<string, WarmEntry>} */
const pool = new Map();
let refillTimer = null;
let started = false;

function genClaimToken() {
  return crypto.randomBytes(32).toString("hex");
}

function poolDepth() {
  let ready = 0;
  let launching = 0;
  for (const e of pool.values()) {
    if (e.status === "READY") ready++;
    else launching++;
  }
  return { ready, launching, total: ready + launching };
}

async function pingBridgeHealth(publicIp) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: publicIp,
        port: 3001,
        path: "/health",
        method: "GET",
        timeout: 2000,
      },
      (res) => {
        // Drain so the socket can be reused.
        res.resume();
        resolve(res.statusCode === 200);
      }
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function pollUntilReady(taskArn) {
  const start = Date.now();
  while (Date.now() - start < READY_TIMEOUT_MS) {
    const entry = pool.get(taskArn);
    if (!entry) return; // popped or evicted

    try {
      const { status, publicIp } = await describeTask(taskArn);
      if (status === "STOPPED") {
        pool.delete(taskArn);
        console.log(`[warmPool] task ${taskArn.slice(-12)} stopped during launch`);
        return;
      }
      if (status === "RUNNING" && publicIp) {
        if (await pingBridgeHealth(publicIp)) {
          // Re-check entry still in pool (could have been popped or evicted).
          const live = pool.get(taskArn);
          if (live) {
            live.publicIp = publicIp;
            live.status = "READY";
            console.log(
              `[warmPool] task ${taskArn.slice(-12)} READY at ${publicIp}`
            );
          }
          return;
        }
      }
    } catch (e) {
      console.warn(
        `[warmPool] describe/ping failed for ${taskArn.slice(-12)}:`,
        e?.message || e
      );
    }
    await new Promise((r) => setTimeout(r, READY_POLL_INTERVAL_MS));
  }
  // Timeout — drop it. Container will auto-destroy when no client connects.
  pool.delete(taskArn);
  console.warn(`[warmPool] task ${taskArn.slice(-12)} ready timeout`);
}

async function spawnOneWarmTask() {
  const claimToken = genClaimToken();
  let taskArn;
  try {
    taskArn = await launchTask({
      sessionId: null,
      bridgeToken: "",
      githubToken: null,
      repoUrl: null,
      claudeOauthToken: null,
      codexApiKey: null,
      claimToken,
    });
  } catch (e) {
    console.warn("[warmPool] spawn failed:", e?.message || e);
    return null;
  }
  pool.set(taskArn, {
    taskArn,
    publicIp: null,
    claimToken,
    createdAt: Date.now(),
    status: "LAUNCHING",
  });
  console.log(`[warmPool] spawning ${taskArn.slice(-12)} (depth now ${poolDepth().total})`);
  void pollUntilReady(taskArn);
  return taskArn;
}

async function refill() {
  if (MIN_POOL_SIZE <= 0) return;
  const { total } = poolDepth();
  const need = MIN_POOL_SIZE - total;
  if (need <= 0) return;
  for (let i = 0; i < need; i++) {
    void spawnOneWarmTask();
  }
}

/**
 * Atomically pop a READY task. Returns null if none ready.
 * @returns {WarmEntry|null}
 */
export function tryAcquireWarmTask() {
  if (MIN_POOL_SIZE <= 0) return null;
  for (const [taskArn, entry] of pool) {
    if (entry.status === "READY") {
      pool.delete(taskArn);
      // Fire refill in the background so the depth recovers without waiting
      // for the next interval.
      void refill();
      return entry;
    }
  }
  return null;
}

/**
 * POST /claim to the warm task with user-specific params. Resolves with
 * { taskArn, publicIp } on 200; rejects on non-2xx, network error, or timeout.
 *
 * @param {WarmEntry} entry
 * @param {{
 *   sessionId: string,
 *   bridgeToken: string,
 *   repoUrl: string|null,
 *   githubToken: string|null,
 *   claudeOauthToken: string|null,
 *   codexApiKey: string|null,
 * }} params
 */
export function claimWarmTask(entry, params) {
  return new Promise((resolve, reject) => {
    if (!entry.publicIp) {
      reject(new Error("warm entry has no publicIp"));
      return;
    }
    const body = JSON.stringify({
      claimToken: entry.claimToken,
      sessionId: params.sessionId,
      bridgeToken: params.bridgeToken,
      repoUrl: params.repoUrl || "",
      branch: params.branch || "",
      githubToken: params.githubToken || "",
      claudeOauthToken: params.claudeOauthToken || "",
      codexApiKey: params.codexApiKey || "",
    });
    const req = http.request(
      {
        hostname: entry.publicIp,
        port: 3001,
        path: "/claim",
        method: "POST",
        timeout: 10_000,
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          if (res.statusCode === 200) {
            resolve({ taskArn: entry.taskArn, publicIp: entry.publicIp });
            return;
          }
          let errMsg = `status ${res.statusCode}`;
          try {
            const j = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            if (j && j.error) errMsg = `${errMsg}: ${j.error}`;
          } catch {
            /* ignore */
          }
          reject(new Error(errMsg));
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("/claim timeout"));
    });
    req.write(body);
    req.end();
  });
}

export function startWarmPool() {
  if (started) return;
  started = true;
  if (MIN_POOL_SIZE <= 0) {
    console.log("[warmPool] disabled (WARM_POOL_MIN=0)");
    return;
  }
  console.log(`[warmPool] starting with min=${MIN_POOL_SIZE}`);
  void refill();
  refillTimer = setInterval(() => void refill(), REFILL_INTERVAL_MS);
}

export function stopWarmPool() {
  if (refillTimer) {
    clearInterval(refillTimer);
    refillTimer = null;
  }
  started = false;
}

export function getPoolStats() {
  return poolDepth();
}
