import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { useStore } from "@/store";
import { getDefaultMcpCatalogJson } from "@/lib/mcpBridgeSync";
import { clearCachedGithubUserId } from "@/lib/mcpLocalPersistence";

/** Clears auth secrets and navigates to login. Used by Settings and Projects. */
export async function signOutAndGoToLogin(): Promise<void> {
  await SecureStore.deleteItemAsync("github_token");
  await SecureStore.deleteItemAsync("openrouter_api_key");
  await clearCachedGithubUserId();
  const st = useStore.getState();
  st.setGithubToken("");
  st.setApiKey("");
  st.setSettingsOpen(false);
  st.setMcpCatalogJson(getDefaultMcpCatalogJson());
  st.setMcpRepoPolicy({});
  st.setMcpServers({});
  router.replace("/login");
}
