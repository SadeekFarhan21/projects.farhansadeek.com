/**
 * Map terminal-printed dev-server URLs to the remote workspace host so the
 * in-app browser loads the microVM (or LAN bridge), not the phone loopback.
 *
 * Uses direct http(s)://host:devPort/... so asset requests (/, /assets/...) resolve
 * on the same origin as the dev server. Path-based proxying on the bridge port
 * would break root-absolute paths.
 */

const LOOPBACK_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "::1",
]);

function isLoopbackHost(host: string): boolean {
  const h = host.trim().toLowerCase();
  return LOOPBACK_HOSTS.has(h) || h === "[::1]";
}

function looksLikeIpv4(s: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(s);
}

function parseWsUrl(rawWsUrl: string | null | undefined): { host: string; port: string } | null {
  const trimmed = (rawWsUrl || "").trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    const host = (u.hostname || "").trim();
    if (!host || isLoopbackHost(host)) return null;
    const port = u.port || "3001";
    return { host, port };
  } catch {
    return null;
  }
}

/**
 * Rewrite http(s) loopback URLs to the remote workspace host and dev server port.
 */
export function resolveTerminalBrowseUrl(
  rawUrl: string,
  ctx: {
    cloudSessionStatus: "idle" | "provisioning" | "ready" | "stopping" | "stopped" | "failed";
    cloudSessionPublicIp: string | null;
    cloudSessionWsUrl?: string | null;
    remoteWorkspaceEnabled?: boolean;
    remoteWorkspaceWsUrl?: string | null;
  }
): { loadUrl: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { loadUrl: trimmed };
  }

  const cloudReady =
    ctx.cloudSessionStatus === "ready" && Boolean(ctx.cloudSessionPublicIp?.trim());
  const publicIp = ctx.cloudSessionPublicIp?.trim() || "";
  const cloudWs = cloudReady ? parseWsUrl(ctx.cloudSessionWsUrl) : null;
  const remoteWs = ctx.remoteWorkspaceEnabled
    ? parseWsUrl(ctx.remoteWorkspaceWsUrl)
    : null;
  const bridge = cloudWs || remoteWs;
  if (!bridge) {
    return { loadUrl: trimmed };
  }

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return { loadUrl: trimmed };
  }

  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { loadUrl: trimmed };
  }

  if (!isLoopbackHost(u.hostname)) {
    return { loadUrl: trimmed };
  }

  const remoteHost =
    cloudReady && looksLikeIpv4(publicIp) ? publicIp : bridge.host;
  if (!remoteHost) {
    return { loadUrl: trimmed };
  }

  const defaultPort = u.protocol === "https:" ? "443" : "80";
  const targetPort = u.port || defaultPort;
  const targetPath = u.pathname + u.search + u.hash;
  return {
    loadUrl: `${u.protocol}//${remoteHost}:${targetPort}${targetPath}`,
  };
}
