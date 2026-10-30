import { buildRemoteWorkspaceWsUrl } from "./remoteWsBridge";

/**
 * Stable key for per-bridge settings (Phase 7a). Uses origin + pathname only;
 * strips query (including bridge `token`).
 */
export function workspaceAuthKey(rawWsUrl: string): string {
  const base = buildRemoteWorkspaceWsUrl(rawWsUrl, "");
  if (!base) return "";
  try {
    const u = new URL(base);
    const path = u.pathname.replace(/\/$/, "") || "";
    return `${u.protocol}//${u.host}${path}`.toLowerCase();
  } catch {
    return base.toLowerCase();
  }
}
