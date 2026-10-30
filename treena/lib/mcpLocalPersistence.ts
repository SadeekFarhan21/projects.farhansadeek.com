/**
 * MCP catalog + per-repo policy in SecureStore, namespaced by GitHub user id.
 */
import * as SecureStore from "expo-secure-store";

export const GITHUB_USER_ID_STORE_KEY = "github_user_id";

const LEGACY_CATALOG = "mcp_catalog_json";
const LEGACY_POLICY = "mcp_repo_policy_json";
const LEGACY_SECRETS = "mcp_catalog_secrets_json";
const LEGACY_CLOUD_REV = "mcp_cloud_config_rev";

export function mcpCatalogStorageKey(githubUserId: number): string {
  return `mcp_catalog_v1_${githubUserId}`;
}

export function mcpPolicyStorageKey(githubUserId: number): string {
  return `mcp_repo_policy_v1_${githubUserId}`;
}

export async function getCachedGithubUserId(): Promise<number | null> {
  const raw = await SecureStore.getItemAsync(GITHUB_USER_ID_STORE_KEY);
  if (!raw?.trim()) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function setCachedGithubUserId(id: number): Promise<void> {
  await SecureStore.setItemAsync(GITHUB_USER_ID_STORE_KEY, String(id));
}

export async function clearCachedGithubUserId(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(GITHUB_USER_ID_STORE_KEY);
  } catch {
    /* ignore */
  }
}

/** Copy legacy global MCP keys into user-scoped keys once, then remove legacy + old sidecar/rev. */
export async function migrateLegacyMcpStorageIfNeeded(
  githubUserId: number
): Promise<void> {
  const catKey = mcpCatalogStorageKey(githubUserId);
  const polKey = mcpPolicyStorageKey(githubUserId);
  const namespacedCat = await SecureStore.getItemAsync(catKey);
  const legacyCat = await SecureStore.getItemAsync(LEGACY_CATALOG);

  if (!namespacedCat?.trim() && legacyCat?.trim()) {
    await SecureStore.setItemAsync(catKey, legacyCat);
  }

  const namespacedPol = await SecureStore.getItemAsync(polKey);
  const legacyPol = await SecureStore.getItemAsync(LEGACY_POLICY);
  if (!namespacedPol?.trim() && legacyPol?.trim()) {
    await SecureStore.setItemAsync(polKey, legacyPol);
  }

  if (legacyCat || legacyPol) {
    try {
      await SecureStore.deleteItemAsync(LEGACY_CATALOG);
    } catch {
      /* ignore */
    }
    try {
      await SecureStore.deleteItemAsync(LEGACY_POLICY);
    } catch {
      /* ignore */
    }
  }
  try {
    await SecureStore.deleteItemAsync(LEGACY_SECRETS);
  } catch {
    /* ignore */
  }
  try {
    await SecureStore.deleteItemAsync(LEGACY_CLOUD_REV);
  } catch {
    /* ignore */
  }
}

export async function loadMcpCatalogForUser(
  githubUserId: number
): Promise<string | null> {
  const raw = await SecureStore.getItemAsync(mcpCatalogStorageKey(githubUserId));
  return raw?.trim() ? raw : null;
}

export async function saveMcpCatalogForUser(
  githubUserId: number,
  catalogJson: string
): Promise<void> {
  await SecureStore.setItemAsync(
    mcpCatalogStorageKey(githubUserId),
    catalogJson
  );
}

export async function loadMcpPolicyForUser(
  githubUserId: number
): Promise<Record<string, string[]> | null> {
  const raw = await SecureStore.getItemAsync(mcpPolicyStorageKey(githubUserId));
  if (!raw?.trim()) return null;
  try {
    const o = JSON.parse(raw) as unknown;
    if (o && typeof o === "object" && !Array.isArray(o)) {
      return o as Record<string, string[]>;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function saveMcpPolicyForUser(
  githubUserId: number,
  policy: Record<string, string[]>
): Promise<void> {
  await SecureStore.setItemAsync(
    mcpPolicyStorageKey(githubUserId),
    JSON.stringify(policy)
  );
}
