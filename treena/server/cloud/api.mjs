/**
 * Cloud API: REST service for orchestrating cloud workspaces.
 *
 * Two runtime modes selected by USE_FLY env:
 *   - USE_FLY=false (default): legacy Fargate path (POST /sessions etc.)
 *   - USE_FLY=true: Fly Machines path (POST /users/ensure, GET /machines/me/status,
 *                   POST /repos/open). Old /sessions endpoints become deprecation
 *                   shims that resolve to the user's persistent Fly machine.
 *
 * Both paths share GitHub auth (auth.mjs) and AI-token storage (db.mjs).
 */
import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import {
  createSession,
  getSession,
  getSessionsByUser,
  updateSession,
} from "./sessions.mjs";
import { launchTask, describeTask, stopTask } from "./ecs.mjs";
import { githubAuthMiddleware } from "./auth.mjs";
import {
  getAiTokens,
  putAiTokens,
  getUserMachine,
  putUserMachine,
  updateUserMachine,
  getUserRepo,
  putUserRepo,
  updateUserRepo,
} from "./db.mjs";
import { startReaper } from "./reaper.mjs";
import {
  claimWarmTask,
  getPoolStats,
  startWarmPool,
  tryAcquireWarmTask,
} from "./warmPool.mjs";
import {
  createMachine,
  createVolume,
  getMachine,
  startMachine,
  buildBridgeWsUrl,
  FLY_FORCE_INSTANCE_HEADER,
} from "./fly.mjs";
import { start as startIdleStop } from "./idleStop.mjs";
import { start as startMetrics, emitMetric } from "./metrics.mjs";
import { safeRepoDirName, parseRepoUrl } from "./repoNames.mjs";

/**
 * One-line JSON event log for log aggregator parsing. Use for any state
 * transition that's worth tracing post-hoc (machine.create.success,
 * repo.setup.start, etc.). Keep field names short and use ISO timestamps so
 * Athena / Loki / etc. can query without preprocessing.
 */
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

const app = express();
const PORT = Number(process.env.PORT || 8080);
const MAX_SESSIONS_PER_USER = 2;
const USE_FLY = process.env.USE_FLY === "true";
const FLY_CREATING_STALE_MS = 2 * 60 * 1000;
const DEFAULT_REGION = process.env.FLY_DEFAULT_REGION || "iad";
const DEFAULT_VOLUME_GB = Number(process.env.FLY_DEFAULT_VOLUME_GB || 10);

/**
 * Bootstrap (or self-heal) the user's persistent Fly machine. Returns
 * immediately — never blocks on Fly create. Background provision runs
 * asynchronously and writes the final machineId/volumeId to DDB.
 */
async function ensureUserMachine(githubUserId, githubToken) {
  const existing = await getUserMachine(githubUserId);
  const now = Date.now();

  // Case 1: no row yet — fresh first-time create.
  if (!existing) {
    const bridgeToken = crypto.randomBytes(32).toString("hex");
    const newRow = {
      githubUserId,
      status: "creating",
      bridgeToken,
      region: DEFAULT_REGION,
      volumeSizeGb: DEFAULT_VOLUME_GB,
      createdAt: now,
    };
    await putUserMachine(githubUserId, newRow);
    void backgroundProvision(githubUserId, githubToken, newRow).catch((err) => {
      console.error(`[api] backgroundProvision failed for ${githubUserId}:`, err.message);
    });
    return newRow;
  }

  const status = existing.status;
  const ageMs = now - (existing.createdAt || 0);

  // Case 2: settled states — return as-is, don't disturb.
  if (status === "stopped" || status === "started" || status === "hibernated") {
    return existing;
  }

  // Case 3: creation in flight, still within stale window — return as-is.
  if (status === "creating" && ageMs <= FLY_CREATING_STALE_MS) {
    return existing;
  }

  // Case 4: retry path — failed OR stale creating. Reuse the existing
  // bridgeToken / volumeId / machineId; backgroundProvision resumes from
  // wherever the row left off (its `if (!volumeId)` / `if (!machineId)`
  // guards skip work that's already done).
  await updateUserMachine(githubUserId, {
    status: "creating",
    createdAt: now,
    lastError: null,
  });
  const retryRow = {
    ...existing,
    status: "creating",
    createdAt: now,
    lastError: null,
  };
  void backgroundProvision(githubUserId, githubToken, retryRow).catch((err) => {
    console.error(`[api] backgroundProvision retry failed for ${githubUserId}:`, err.message);
  });
  return retryRow;
}

/**
 * Out-of-band Fly create. Idempotent — completes whatever's missing on the
 * row (volume first, then machine), then marks status=stopped. Errors are
 * recorded to lastError so /users/ensure can self-heal on the next call.
 */
async function backgroundProvision(githubUserId, githubToken, row) {
  const startedAt = Date.now();
  logEvent("machine.create.start", { githubUserId });
  try {
    let volumeId = row.volumeId;
    if (!volumeId) {
      const created = await createVolume({
        userId: githubUserId,
        sizeGb: row.volumeSizeGb || DEFAULT_VOLUME_GB,
        region: row.region || DEFAULT_REGION,
      });
      volumeId = created.volumeId;
      await updateUserMachine(githubUserId, {
        volumeId,
        region: created.region,
        volumeSizeGb: created.sizeGb,
      });
      logEvent("machine.create.volume", {
        githubUserId,
        volumeId,
        sizeGb: created.sizeGb,
      });
    }

    let machineId = row.machineId;
    if (!machineId) {
      const aiTokens = await getAiTokens(githubUserId).catch(() => ({}));
      const env = {
        BRIDGE_TOKEN: row.bridgeToken,
        TREENA_GITHUB_USER_ID: String(githubUserId),
      };
      if (githubToken) env.GITHUB_TOKEN = githubToken;
      if (aiTokens.claudeOauthToken) env.CLAUDE_CODE_OAUTH_TOKEN = aiTokens.claudeOauthToken;
      if (aiTokens.codexApiKey) env.OPENAI_API_KEY = aiTokens.codexApiKey;

      const created = await createMachine({
        userId: githubUserId,
        volumeId,
        env,
        region: row.region || DEFAULT_REGION,
      });
      machineId = created.machineId;
    }

    await updateUserMachine(githubUserId, {
      machineId,
      status: "stopped",
      lastError: null,
    });

    const durationMs = Date.now() - startedAt;
    logEvent("machine.create.success", { githubUserId, machineId, durationMs });
    emitMetric({
      name: "MachineCreateLatencyMs",
      value: durationMs,
      unit: "Milliseconds",
      dimensions: { Outcome: "success" },
    });
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    logEvent("machine.create.failure", {
      githubUserId,
      durationMs,
      error: err.message,
    });
    emitMetric({
      name: "MachineCreateFailureCount",
      value: 1,
      unit: "Count",
    });
    emitMetric({
      name: "MachineCreateLatencyMs",
      value: durationMs,
      unit: "Milliseconds",
      dimensions: { Outcome: "failure" },
    });
    await updateUserMachine(githubUserId, {
      status: "failed",
      lastError: err.message,
    }).catch((e2) => {
      console.error(`[api] failed to write failure row for ${githubUserId}:`, e2.message);
    });
  }
}

function errorDetails(err) {
  if (err instanceof Error) return err.message;
  return String(err);
}

app.use(cors());
app.use(express.json());

// Health check (unauthenticated)
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// All session and user routes require GitHub auth
app.use("/sessions", githubAuthMiddleware());
app.use("/user", githubAuthMiddleware());
app.use("/users", githubAuthMiddleware());
app.use("/machines", githubAuthMiddleware());
app.use("/repos", githubAuthMiddleware());

// ── Fly Machines path ──────────────────────────────────────

/**
 * POST /users/ensure — Bootstrap (or self-heal) the caller's persistent Fly
 * machine + volume. Returns immediately; mobile polls /machines/me/status.
 *
 * Idempotent: returning users see their existing machine row.
 */
app.post("/users/ensure", async (req, res) => {
  try {
    const { id: githubUserId } = req.githubUser;
    const row = await ensureUserMachine(githubUserId, req.githubToken);
    res.json({
      machineId: row.machineId || null,
      machineState: row.status,
      volumeId: row.volumeId || null,
      region: row.region || DEFAULT_REGION,
    });
  } catch (err) {
    console.error("[api] POST /users/ensure error:", err);
    res.status(500).json({
      error: "Failed to ensure user machine",
      details: errorDetails(err),
    });
  }
});

/**
 * GET /machines/me/status — Current state of the caller's machine.
 * Returns wsUrl + bridgeToken so mobile can open the WS directly. Fly proxy
 * auto-starts the machine on incoming WS (auto_start_machines=true).
 *
 * If status=creating, also probes Fly to detect when the background provision
 * completed without us writing back to DDB (rare; covers the gap between Fly
 * create returning and our DDB update).
 */
app.get("/machines/me/status", async (req, res) => {
  try {
    const { id: githubUserId } = req.githubUser;
    const row = await getUserMachine(githubUserId);
    if (!row) {
      return res.status(404).json({ error: "No machine for user — call /users/ensure first" });
    }

    let state = row.status;
    let wokeUp = false;

    // Probe live Fly state if we know the machineId. This catches both:
    //   - background provision completed but DDB hasn't been updated yet
    //   - machine drift (DDB says stopped, Fly says started or vice versa)
    //   - and lets us trigger an explicit wake on stopped machines below
    //
    // CRITICAL: Fly's auto_start_machines does NOT auto-start when the request
    // uses fly-force-instance-id targeting a specific stopped machine — it just
    // returns 503. Since each user has exactly one machine and mobile MUST pin
    // routing to it, we wake the machine here ourselves rather than relying on
    // proxy auto-start. Mobile then polls until state="started" before opening
    // the WS so the upgrade lands on a running bridge.
    if (row.machineId) {
      let flyState = null;
      try {
        const machine = await getMachine(row.machineId);
        flyState = machine.state;
      } catch {
        // Fly transient — keep state from DDB and skip wake
      }
      if (flyState === "started") {
        state = "started";
      } else if (flyState === "starting") {
        state = "starting";
      } else if (flyState === "stopped") {
        const startStartedAt = Date.now();
        try {
          await startMachine(row.machineId);
          state = "starting";
          wokeUp = true;
          const durationMs = Date.now() - startStartedAt;
          logEvent("machine.start.requested", {
            githubUserId,
            machineId: row.machineId,
            durationMs,
          });
          // Latency here is "time to ack the start request" — Fly returns
          // before the machine is fully booted. End-to-end wake latency
          // (request → state="started") is captured by mobile-side timing.
          emitMetric({
            name: "MachineStartLatencyMs",
            value: durationMs,
            unit: "Milliseconds",
            dimensions: { Outcome: "success" },
          });
        } catch (e) {
          const durationMs = Date.now() - startStartedAt;
          logEvent("machine.start.failure", {
            githubUserId,
            machineId: row.machineId,
            durationMs,
            error: e.message,
          });
          emitMetric({
            name: "MachineStartFailureCount",
            value: 1,
            unit: "Count",
          });
          state = "stopped";
        }
      } else if (flyState === "stopping") {
        state = "stopping";
      } else if (flyState === "destroyed") {
        // Drift — machine was destroyed out-of-band. Mobile should re-run
        // /users/ensure which will see machineId pointing to a destroyed
        // machine; ensureUserMachine doesn't currently self-heal that, but
        // signaling state=destroyed is at least visible to the client.
        state = "destroyed";
      }
    }

    res.json({
      machineId: row.machineId || null,
      state,
      region: row.region || DEFAULT_REGION,
      wsUrl: row.machineId
        ? buildBridgeWsUrl(row.machineId, row.bridgeToken)
        : null,
      flyForceInstanceId: row.machineId || null,
      bridgeToken: row.bridgeToken || null,
      wokeUp,
    });
  } catch (err) {
    console.error("[api] GET /machines/me/status error:", err);
    res.status(500).json({
      error: "Failed to get machine status",
      details: errorDetails(err),
    });
  }
});

/**
 * POST /repos/open — Record that the caller is opening this repo and decide
 * whether the mobile client needs to trigger setup.run on the bridge.
 *
 * Body: { repoUrl: string, branch?: string, markReady?: boolean }
 *
 * Three flows:
 *
 * 1. `markReady: true` — mobile signals that bridge's repo.setup push reported
 *    stage="ready". Flip DDB setupState to "ready" and return immediately.
 *    Mobile is the sole DDB writer; bridge does NOT call api.mjs back.
 *
 * 2. Existing row, setupState="ready" — return as-is, just bump lastOpenedAt.
 *
 * 3. New row OR setupState in (unset|failed|cloning-stale) — write a fresh
 *    "cloning" row with setupStartedAt=now, return needsClone:true so the
 *    caller fires setup.run via the bridge WS.
 *
 * Stuck-state recovery: if existing row has setupState="cloning" AND
 * setupStartedAt is >5min ago, treat as failed and re-trigger (the bridge
 * either crashed mid-setup or the previous mobile invocation died).
 */
const REPO_SETUP_STUCK_MS = 5 * 60_000;

app.post("/repos/open", async (req, res) => {
  try {
    const { id: githubUserId } = req.githubUser;
    const { repoUrl, branch, markReady } = req.body || {};
    if (!repoUrl) {
      return res.status(400).json({ error: "repoUrl is required" });
    }

    // Day 6.5: derive repoName via the shared transform so mobile gets the
    // same dir name the bridge will create (bridge clones to
    // /workspace/<repoName>). Mobile uses this to pin the WS query string
    // `activeRepoDir`. Drift between this and bridge would mis-route the
    // file tree — the shared module is the single source of truth.
    let repoName;
    try {
      repoName = safeRepoDirName(parseRepoUrl(repoUrl).repo);
      if (!repoName) throw new Error("invalid repo name");
    } catch (e) {
      return res.status(400).json({ error: e?.message || "invalid repoUrl" });
    }

    const now = Date.now();

    // Flow 1: mark-ready short-circuit. Bridge has finished setup; flip DDB.
    if (markReady === true) {
      const existing = await getUserRepo(githubUserId, repoUrl);
      if (existing) {
        await updateUserRepo(githubUserId, repoUrl, {
          setupState: "ready",
          lastError: null,
          lastOpenedAt: now,
          installedAt: now,
          ...(branch && branch !== existing.currentBranch ? { currentBranch: branch } : {}),
        });
      } else {
        // Edge case: markReady before any setup row exists (rare — mobile
        // probably cloned through some other path). Write a fresh ready row.
        await putUserRepo(githubUserId, repoUrl, {
          setupState: "ready",
          lastOpenedAt: now,
          installedAt: now,
          currentBranch: branch || null,
        });
      }
      logEvent("repo.open", {
        githubUserId,
        repoUrl,
        setupState: "ready",
        markReady: true,
        firstTime: !existing,
      });
      return res.json({ setupState: "ready", needsClone: false, repoName });
    }

    // Flow 2/3: normal open
    const existing = await getUserRepo(githubUserId, repoUrl);
    const isStuckCloning =
      existing &&
      existing.setupState === "cloning" &&
      now - (existing.setupStartedAt || 0) > REPO_SETUP_STUCK_MS;

    // Already-ready: nothing to do beyond bumping lastOpenedAt.
    if (existing && existing.setupState === "ready" && !isStuckCloning) {
      const patch = { lastOpenedAt: now };
      if (branch && branch !== existing.currentBranch) patch.currentBranch = branch;
      await updateUserRepo(githubUserId, repoUrl, patch);
      logEvent("repo.open", {
        githubUserId,
        repoUrl,
        setupState: "ready",
        markReady: false,
        firstTime: false,
      });
      return res.json({ setupState: "ready", needsClone: false, repoName });
    }

    // Stuck-state recovery: log what we recovered from before the rewrite.
    if (isStuckCloning) {
      logEvent("repo.open.stuck-recovery", {
        githubUserId,
        repoUrl,
        prevSetupStartedAt: existing.setupStartedAt,
        ageMs: now - (existing.setupStartedAt || 0),
      });
    }

    // Fresh setup trigger: write cloning + setupStartedAt, mobile fires setup.run.
    const fields = {
      setupState: "cloning",
      setupStartedAt: now,
      lastOpenedAt: now,
      currentBranch: branch || (existing && existing.currentBranch) || null,
      lastError: isStuckCloning ? "stuck-state recovery" : null,
    };

    if (existing) {
      await updateUserRepo(githubUserId, repoUrl, fields);
    } else {
      await putUserRepo(githubUserId, repoUrl, fields);
    }

    logEvent("repo.open", {
      githubUserId,
      repoUrl,
      setupState: "cloning",
      markReady: false,
      firstTime: !existing,
      recovered: !!isStuckCloning,
    });
    res.json({ setupState: "cloning", needsClone: true, repoName });
  } catch (err) {
    console.error("[api] POST /repos/open error:", err);
    res.status(500).json({
      error: "Failed to open repo",
      details: errorDetails(err),
    });
  }
});

// ── Fargate path (and deprecation shims) ───────────────────

/**
 * POST /sessions — Provision a new cloud workspace.
 * Body: { repoUrl?: string }
 * AI tokens are auto-fetched from DynamoDB for the authenticated user.
 */
app.post("/sessions", async (req, res) => {
  // Pre-launch deprecation shim: 1-week courtesy for in-flight TestFlight
  // builds during cutover. Removed in week 2 alongside ECS code.
  if (USE_FLY) {
    try {
      const { id: githubUserId } = req.githubUser;
      const row = await ensureUserMachine(githubUserId, req.githubToken);
      return res.status(201).json({
        sessionId: row.machineId || `pending-${githubUserId}`,
        status: row.machineId ? "ready" : "provisioning",
        bridgeToken: row.bridgeToken,
        wsUrl: row.machineId
          ? buildBridgeWsUrl(row.machineId, row.bridgeToken)
          : null,
        publicIp: null,
      });
    } catch (err) {
      console.error("[api] POST /sessions (Fly shim) error:", err);
      return res.status(500).json({
        error: "Failed to ensure machine",
        details: errorDetails(err),
      });
    }
  }

  try {
    const { id: githubUserId, login: githubLogin } = req.githubUser;
    const { repoUrl, branch } = req.body || {};

    // Enforce per-user session limit. The client is expected to surface a
    // smart "End oldest session?" prompt on its end (Phase 3D) so users
    // never see the bare 429, but we still enforce here as the source of truth.
    const existing = getSessionsByUser(githubUserId).filter(
      (s) => s.status === "provisioning" || s.status === "ready"
    );
    if (existing.length >= MAX_SESSIONS_PER_USER) {
      return res.status(429).json({
        error: `Max ${MAX_SESSIONS_PER_USER} active sessions per user`,
        activeSessions: existing.map((s) => ({
          sessionId: s.id,
          repoUrl: s.repoUrl,
          createdAt: s.createdAt,
        })),
      });
    }

    const session = createSession({ githubUserId, githubLogin, repoUrl });

    // Fetch stored AI tokens for this user from DynamoDB
    const aiTokens = await getAiTokens(githubUserId);

    // Phase 2: try the warm pool first. On hit, the warm task already has a
    // public IP and the bridge is up; we just /claim it with the user's creds
    // and the WS URL is immediately usable. On miss or claim failure, fall
    // back to today's cold-launch path — same behavior as before this change.
    let taskArn = null;
    let publicIp = null;
    let warmHit = false;
    const warmEntry = tryAcquireWarmTask();
    if (warmEntry) {
      try {
        const claimed = await claimWarmTask(warmEntry, {
          sessionId: session.id,
          bridgeToken: session.bridgeToken,
          repoUrl: repoUrl || null,
          branch: branch || null,
          githubToken: req.githubToken || null,
          claudeOauthToken: aiTokens.claudeOauthToken || null,
          codexApiKey: aiTokens.codexApiKey || null,
        });
        taskArn = claimed.taskArn;
        publicIp = claimed.publicIp;
        warmHit = true;
        const stats = getPoolStats();
        console.log(
          `[api] warm-pool hit: session=${session.id} task=${taskArn.slice(-12)} (depth ready=${stats.ready} total=${stats.total})`
        );
      } catch (err) {
        console.warn(
          `[api] warm-pool claim failed (${errorDetails(err)}); falling back to cold-launch`
        );
        // The warm task has a stale claim token now (or was never reachable).
        // Best-effort kill so it doesn't sit consuming Fargate quota.
        try {
          await stopTask(warmEntry.taskArn, "warm-pool claim failed");
        } catch {
          /* ignore */
        }
      }
    }

    if (!warmHit) {
      taskArn = await launchTask({
        sessionId: session.id,
        bridgeToken: session.bridgeToken,
        githubToken: req.githubToken,
        repoUrl: repoUrl || null,
        branch: branch || null,
        claudeOauthToken: aiTokens.claudeOauthToken || null,
        codexApiKey: aiTokens.codexApiKey || null,
      });
    }

    // Warm hits already have publicIp + a running bridge; jump straight to
    // "ready" so the client doesn't waste poll cycles on describeTask.
    if (warmHit && publicIp) {
      updateSession(session.id, {
        taskArn,
        publicIp,
        status: "ready",
        wsUrl: `ws://${publicIp}:3001`,
      });
    } else {
      updateSession(session.id, { taskArn });
    }

    res.status(201).json({
      sessionId: session.id,
      status: getSession(session.id).status,
      bridgeToken: session.bridgeToken,
    });
  } catch (err) {
    console.error("[api] POST /sessions error:", err);
    res.status(500).json({
      error: "Failed to create session",
      details: errorDetails(err),
    });
  }
});

/**
 * GET /sessions — List the authenticated user's recent sessions.
 *
 * Phase 3C: client uses this on the projects screen to render Active /
 * Resume? affordances and to enforce the smart concurrent-session cap (3D).
 */
app.get("/sessions", (req, res) => {
  try {
    const { id: githubUserId } = req.githubUser;
    const list = getSessionsByUser(githubUserId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((s) => ({
        sessionId: s.id,
        repoUrl: s.repoUrl,
        status: s.status,
        wsUrl: s.wsUrl,
        publicIp: s.publicIp,
        createdAt: s.createdAt,
        error: s.error,
      }));
    res.json({ sessions: list });
  } catch (err) {
    console.error("[api] GET /sessions error:", err);
    res.status(500).json({ error: "Failed to list sessions" });
  }
});

/**
 * GET /sessions/:id — Poll session status.
 * Returns public IP and wsUrl when ready.
 */
app.get("/sessions/:id", async (req, res) => {
  try {
    const session = getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    if (session.githubUserId !== req.githubUser.id) {
      return res.status(403).json({ error: "Not your session" });
    }

    // Update poll timestamp
    updateSession(session.id, { lastPolledAt: Date.now() });

    // If still provisioning, check ECS task status
    if (session.status === "provisioning" && session.taskArn) {
      const task = await describeTask(session.taskArn);

      if (task.status === "RUNNING" && task.publicIp) {
        const wsUrl = `ws://${task.publicIp}:3001`;
        updateSession(session.id, {
          status: "ready",
          publicIp: task.publicIp,
          wsUrl,
        });
      } else if (task.status === "STOPPED") {
        updateSession(session.id, {
          status: "failed",
          error: task.stoppedReason || "Task stopped unexpectedly",
        });
      }
      // Otherwise still PENDING/PROVISIONING — no change
    }

    // Re-fetch after potential update
    const current = getSession(session.id);
    res.json({
      sessionId: current.id,
      status: current.status,
      wsUrl: current.wsUrl,
      bridgeToken: current.bridgeToken,
      repoUrl: current.repoUrl,
      publicIp: current.publicIp,
      createdAt: current.createdAt,
      error: current.error,
    });
  } catch (err) {
    console.error("[api] GET /sessions/:id error:", err);
    res.status(500).json({
      error: "Failed to get session",
      details: errorDetails(err),
    });
  }
});

/**
 * DELETE /sessions/:id — Tear down a cloud session.
 */
app.delete("/sessions/:id", async (req, res) => {
  // Pre-launch deprecation shim: machine is persistent, idle-stop handles
  // cleanup. Old DELETE calls become no-ops.
  if (USE_FLY) {
    return res.json({ sessionId: req.params.id, status: "stopping", ok: true });
  }

  try {
    const session = getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    if (session.githubUserId !== req.githubUser.id) {
      return res.status(403).json({ error: "Not your session" });
    }

    if (session.taskArn && session.status !== "stopped") {
      try {
        await stopTask(session.taskArn, "user-requested");
      } catch (err) {
        console.error("[api] StopTask failed:", err.message);
      }
    }

    updateSession(session.id, { status: "stopping" });

    res.json({ sessionId: session.id, status: "stopping" });
  } catch (err) {
    console.error("[api] DELETE /sessions/:id error:", err);
    res.status(500).json({ error: "Failed to stop session" });
  }
});

/**
 * PUT /user/ai-tokens — Store AI CLI tokens (Claude Code, Codex) for the authenticated user.
 * Body: { claudeOauthToken?: string, codexApiKey?: string }
 */
app.put("/user/ai-tokens", async (req, res) => {
  try {
    const { id: githubUserId } = req.githubUser;
    const { claudeOauthToken, codexApiKey } = req.body || {};

    if (!claudeOauthToken && !codexApiKey) {
      return res.status(400).json({ error: "No tokens provided" });
    }

    await putAiTokens(githubUserId, {
      claudeOauthToken: claudeOauthToken || undefined,
      codexApiKey: codexApiKey || undefined,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("[api] PUT /user/ai-tokens error:", err);
    res.status(500).json({ error: "Failed to save tokens" });
  }
});

// Start runtime-appropriate daemons
if (USE_FLY) {
  startMetrics();
  startIdleStop();
  console.log("[api] Fly Machines mode (USE_FLY=true)");
} else {
  startReaper();
  startWarmPool();
  console.log("[api] Fargate mode (legacy)");
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`treena-cloud-api: listening on 0.0.0.0:${PORT}`);
});
