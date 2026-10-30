/**
 * Auto-destroy module for Fly Machines bridge containers.
 *
 * When all WebSocket clients disconnect and stay disconnected for `graceMs`,
 * the machine stops itself via Fly's Machines API. The volume is preserved.
 * Mobile clients later opening a WS to wss://treena-bridge.fly.dev wake the
 * machine via Fly's auto_start_machines.
 *
 * Required env on the bridge container:
 *   - FLY_MACHINE_ID     (auto-injected by Fly into every machine)
 *   - FLY_API_TOKEN      (set as a Fly secret on treena-bridge)
 *   - FLY_BRIDGE_APP     (defaults to "treena-bridge")
 */

const FLY_API_BASE = process.env.FLY_API_BASE || "https://api.machines.dev/v1";

/**
 * @param {import("ws").WebSocketServer} wss
 * @param {{
 *   graceMs?: number,
 *   unexpectedGraceMs?: number,
 *   beforeStop?: () => Promise<unknown>,
 *   isLastDisconnectGraceful?: () => boolean,
 * }} [opts]
 */
export function startAutoDestroy(
  wss,
  {
    graceMs = 25 * 60_000,
    unexpectedGraceMs,
    beforeStop,
    isLastDisconnectGraceful,
  } = {}
) {
  const machineId = process.env.FLY_MACHINE_ID || "";
  const appName = process.env.FLY_BRIDGE_APP || "treena-bridge";
  const apiToken = process.env.FLY_API_TOKEN || "";

  if (!machineId) {
    console.error("[auto-destroy] FLY_MACHINE_ID not set, auto-destroy disabled");
    return;
  }
  if (!apiToken) {
    console.error("[auto-destroy] FLY_API_TOKEN not set, auto-destroy disabled");
    return;
  }

  const effectiveUnexpectedMs =
    typeof unexpectedGraceMs === "number" && unexpectedGraceMs > 0
      ? unexpectedGraceMs
      : graceMs;

  let destroyTimer = null;
  let destroyed = false;

  function clientCount() {
    return wss.clients.size;
  }

  function scheduleDestroy() {
    if (destroyed) return;
    if (destroyTimer) return;
    const graceful =
      typeof isLastDisconnectGraceful === "function"
        ? !!isLastDisconnectGraceful()
        : true;
    const ms = graceful ? graceMs : effectiveUnexpectedMs;
    console.log(
      `[auto-destroy] 0 clients (${graceful ? "graceful" : "unexpected"}), will self-stop in ${ms / 1000}s`
    );
    destroyTimer = setTimeout(() => doStop(), ms);
  }

  function cancelDestroy() {
    if (destroyTimer) {
      clearTimeout(destroyTimer);
      destroyTimer = null;
      console.log("[auto-destroy] Client reconnected, cancelled self-stop");
    }
  }

  async function doStop() {
    if (destroyed) return;
    destroyed = true;
    console.log("[auto-destroy] Grace period expired, stopping machine...");

    if (typeof beforeStop === "function") {
      try {
        await beforeStop();
      } catch (e) {
        console.error("[auto-destroy] beforeStop failed:", e?.message || e);
      }
    }

    try {
      const url = `${FLY_API_BASE}/apps/${appName}/machines/${machineId}/stop`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ signal: "SIGTERM", timeout: 30 }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(
          `[auto-destroy] Fly stop failed ${res.status}: ${body || res.statusText}`
        );
      } else {
        console.log("[auto-destroy] Fly stop request sent, exiting");
      }
    } catch (err) {
      console.error("[auto-destroy] Fly stop failed:", err?.message || err);
    }

    process.exit(0);
  }

  wss.on("connection", () => {
    cancelDestroy();
  });

  // Re-check on every wss "close" / "connection" event in case clients drop
  // between server-level events. Same pattern as the prior ECS implementation.
  const origEmit = wss.emit.bind(wss);
  wss.emit = function (event, ...args) {
    const result = origEmit(event, ...args);
    if (event === "close" || event === "connection") {
      setImmediate(() => {
        if (clientCount() === 0) scheduleDestroy();
      });
    }
    return result;
  };

  wss.on("connection", (ws) => {
    ws.on("close", () => {
      setImmediate(() => {
        if (clientCount() === 0) scheduleDestroy();
      });
    });
  });

  if (clientCount() === 0) scheduleDestroy();

  console.log(
    `[auto-destroy] Enabled (grace=${graceMs / 1000}s, machineId=${machineId.slice(0, 12)}, app=${appName})`
  );
}
