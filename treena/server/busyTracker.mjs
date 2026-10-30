/**
 * Bridge activity tracker. Drives the GET /busy endpoint that the api.mjs
 * idle-stop daemon polls before stopping a Fly machine.
 *
 * "Busy" sources, in order of cost-of-being-wrong:
 *   - Connected WS clients     → user is actively using the IDE
 *   - Running tracked children → an agent or terminal command is in flight
 *   - workspaceStatus=cloning  → bootstrap (clone + npm install) is running
 *
 * Long-lived processes (LSP, PTY shells) are intentionally NOT tracked here:
 *   - PTY = user has terminal open = WS connected = already counted
 *   - LSP = persistent daemon = would make machine always-busy
 *
 * lastActivityAt is bumped whenever a WS message arrives or a tracked child
 * process spawns/exits. When all "busy" sources are clear, idleSinceMs = now -
 * lastActivityAt, which the idle-stop daemon uses to gate stopMachine.
 */

let _wss = null;
const _runningProcs = new Set(); // entries: { pid, label, since }
let _lastActivityAt = Date.now();

export function attachWss(wss) {
  _wss = wss;
}

export function bumpActivity(_reason) {
  _lastActivityAt = Date.now();
}

/**
 * Track a child process. Adds it to the running set and auto-removes on exit.
 * Safe to call with anything that emits "exit" or "close" — node:child_process
 * spawn() and node-pty processes both qualify.
 */
export function trackChildProcess(child, label) {
  if (!child) return;
  const entry = { pid: child.pid, label: label || "", since: Date.now() };
  _runningProcs.add(entry);
  bumpActivity("child-spawn");
  const remove = () => {
    _runningProcs.delete(entry);
    bumpActivity("child-exit");
  };
  if (typeof child.once === "function") {
    child.once("exit", remove);
    child.once("close", remove);
  }
}

/**
 * @param {{workspaceStatus?: string}} [ctx]
 * @returns {{active: boolean, reason: string|null, idleSinceMs: number, wsClients: number, procs: number, workspaceStatus?: string}}
 */
export function getBusyState(ctx = {}) {
  const wsClients = _wss ? _wss.clients.size : 0;
  const procs = _runningProcs.size;
  const cloning = ctx.workspaceStatus === "cloning";
  const reasons = [];
  if (wsClients > 0) reasons.push(`ws=${wsClients}`);
  if (procs > 0) reasons.push(`procs=${procs}`);
  if (cloning) reasons.push("cloning");
  const active = reasons.length > 0;
  return {
    active,
    reason: active ? reasons.join(",") : null,
    idleSinceMs: active ? 0 : Date.now() - _lastActivityAt,
    wsClients,
    procs,
    workspaceStatus: ctx.workspaceStatus,
  };
}
