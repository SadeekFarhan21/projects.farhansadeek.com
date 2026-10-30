/**
 * Reaper: periodic cleanup of orphaned/expired cloud sessions.
 * Runs every 60 seconds.
 */
import { getAllSessions, updateSession, deleteSession } from "./sessions.mjs";
import { stopTask } from "./ecs.mjs";

const REAP_INTERVAL_MS = 60_000;
const POLL_STALE_MS = 10 * 60 * 1000; // 10 min without poll
const PROVISION_TIMEOUT_MS = 5 * 60 * 1000; // 5 min stuck provisioning
const MAX_SESSION_AGE_MS = 2 * 60 * 60 * 1000; // 2 hour hard cap
const CLEANUP_DELAY_MS = 30 * 60 * 1000; // 30 min before deleting records

export function startReaper() {
  const timer = setInterval(() => reap(), REAP_INTERVAL_MS);
  timer.unref(); // don't keep process alive just for reaper
  console.log("[reaper] Started (interval=60s)");
  return timer;
}

async function reap() {
  const now = Date.now();
  const sessions = getAllSessions();

  for (const session of sessions) {
    try {
      // Hard lifetime cap
      if (
        session.status === "ready" &&
        now - session.createdAt > MAX_SESSION_AGE_MS
      ) {
        console.log(
          `[reaper] Session ${session.id} exceeded max age, stopping`
        );
        await safeStop(session, "reaper: max session age exceeded");
        continue;
      }

      // Ready but not polled recently — client likely gone
      if (
        session.status === "ready" &&
        now - session.lastPolledAt > POLL_STALE_MS
      ) {
        console.log(
          `[reaper] Session ${session.id} stale (no poll in ${POLL_STALE_MS / 1000}s), stopping`
        );
        await safeStop(session, "reaper: stale session");
        continue;
      }

      // Stuck in provisioning
      if (
        session.status === "provisioning" &&
        now - session.createdAt > PROVISION_TIMEOUT_MS
      ) {
        console.log(
          `[reaper] Session ${session.id} stuck provisioning, marking failed`
        );
        await safeStop(session, "reaper: provision timeout");
        updateSession(session.id, { status: "failed", error: "Provision timeout" });
        continue;
      }

      // Clean up old stopped/failed records
      if (
        (session.status === "stopped" || session.status === "failed") &&
        now - session.createdAt > CLEANUP_DELAY_MS
      ) {
        deleteSession(session.id);
        continue;
      }
    } catch (err) {
      console.error(`[reaper] Error processing session ${session.id}:`, err.message);
    }
  }
}

async function safeStop(session, reason) {
  if (session.taskArn) {
    try {
      await stopTask(session.taskArn, reason);
    } catch (err) {
      console.error(`[reaper] StopTask failed for ${session.id}:`, err.message);
    }
  }
  updateSession(session.id, { status: "stopping" });
}
