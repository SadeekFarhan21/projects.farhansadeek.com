import { useStore } from "@/store";
import { sendMcpRuntimeConfig } from "@/lib/workspace/remoteWsBridge";
import { getMcpPolicyRepoKey } from "@/lib/mcpRepoKey";

/**
 * When non-null, agent tool list should only include MCP tools for these server names.
 * Empty set => no MCP tools. Null => no MCP servers in catalog (skip filter).
 */
export function getAllowedMcpServerNamesForAgent(): Set<string> | null {
  const s = useStore.getState();
  let parsed: { mcpServers?: Record<string, unknown> };
  try {
    parsed = JSON.parse(s.mcpCatalogJson || "{}") as {
      mcpServers?: Record<string, unknown>;
    };
  } catch {
    return null;
  }
  const names = Object.keys(parsed.mcpServers || {});
  if (names.length === 0) return null;

  const repoKey = getMcpPolicyRepoKey({
    cloudSessionRepoUrl: s.cloudSessionRepoUrl,
    cloudSessionGithubRepoId: s.cloudSessionGithubRepoId,
    repoName: s.repoName,
    remoteWorkspaceEnabled: s.remoteWorkspaceEnabled,
    remoteWorkspaceWsUrl: s.remoteWorkspaceWsUrl,
  });

  const pol = s.mcpRepoPolicy[repoKey];
  if (pol === undefined) return new Set<string>();
  return new Set(pol);
}

const DEFAULT_CATALOG = '{\n  "mcpServers": {}\n}';

export function getDefaultMcpCatalogJson(): string {
  return DEFAULT_CATALOG;
}

/** Server names defined in the local MCP catalog JSON (Cursor-style `mcpServers`). */
export function listMcpCatalogServerNames(catalogJson: string): string[] {
  try {
    const p = JSON.parse(catalogJson || "{}") as {
      mcpServers?: Record<string, unknown>;
    };
    return Object.keys(p.mcpServers || {});
  } catch {
    return [];
  }
}

/** Push catalog + per-repo enabled set to the bridge (after `session.ok`). */
export function syncMcpRuntimeConfigToBridge(): void {
  const s = useStore.getState();
  if (!s.remoteWorkspaceEnabled) return;

  const raw = (s.mcpCatalogJson || DEFAULT_CATALOG).trim();
  let parsed: { mcpServers?: Record<string, Record<string, unknown>> };
  try {
    parsed = JSON.parse(raw || "{}") as {
      mcpServers?: Record<string, Record<string, unknown>>;
    };
  } catch {
    return;
  }

  const mcpServers =
    parsed.mcpServers && typeof parsed.mcpServers === "object"
      ? parsed.mcpServers
      : {};
  const names = Object.keys(mcpServers);

  if (names.length === 0) {
    sendMcpRuntimeConfig({ clear: true });
    return;
  }

  const repoKey = getMcpPolicyRepoKey({
    cloudSessionRepoUrl: s.cloudSessionRepoUrl,
    cloudSessionGithubRepoId: s.cloudSessionGithubRepoId,
    repoName: s.repoName,
    remoteWorkspaceEnabled: s.remoteWorkspaceEnabled,
    remoteWorkspaceWsUrl: s.remoteWorkspaceWsUrl,
  });

  const policy = s.mcpRepoPolicy;
  const enabled =
    policy[repoKey] === undefined
      ? new Set<string>()
      : new Set(policy[repoKey]);

  const servers: Record<string, Record<string, unknown>> = {};
  for (const n of names) {
    if (!enabled.has(n)) continue;
    const entry = mcpServers[n];
    if (entry && typeof entry === "object") {
      servers[n] = entry;
    }
  }

  sendMcpRuntimeConfig({ servers });
}
