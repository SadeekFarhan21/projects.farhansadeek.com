import { useCallback, useEffect } from "react";
import { View, Text, Image, StyleSheet, Pressable, Keyboard, Dimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useAnimatedKeyboard,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as SecureStore from "expo-secure-store";
import { router, useFocusEffect } from "expo-router";
import { colors, fonts, fontSize } from "@/constants/theme";
import {
  useStore,
  CodeFontSizeOption,
  TerminalFontSizeOption,
} from "@/store";
import { useFileSystem } from "@/hooks/useFileSystem";
import { useRemoteFsEvents } from "@/hooks/useRemoteFsEvents";
import { useCloudSession } from "@/hooks/useCloudSession";
import { isFlyMode } from "@/lib/userMachine";
import { fetchGithubUserId } from "@/lib/githubUser";
import {
  getCachedGithubUserId,
  migrateLegacyMcpStorageIfNeeded,
  setCachedGithubUserId,
  loadMcpCatalogForUser,
  loadMcpPolicyForUser,
} from "@/lib/mcpLocalPersistence";
import { subscribeRemoteConnection } from "@/lib/workspace/remoteWsBridge";
import Header from "@/components/Header";
import EditorTabBar from "@/components/EditorTabBar";
import CodeViewer from "@/components/CodeViewer";
import BrowserView from "@/components/BrowserView";
import AgentBar from "@/components/AgentBar";
import TerminalBar from "@/components/TerminalBar";
import FloatingInputPill from "@/components/FloatingInputPill";
import FileExplorer from "@/components/FileExplorer";
import ModelPicker from "@/components/ModelPicker";
import SettingsModal from "@/components/SettingsModal";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const TERMINAL_DEFAULT_HEIGHT = Math.round(SCREEN_HEIGHT * 0.4);
const TERMINAL_MAX_HEIGHT = Math.round(SCREEN_HEIGHT * 0.75);
const TIMING_CONFIG = { duration: 250, easing: Easing.out(Easing.cubic) };
export default function IDEScreen() {
  const setHasCompletedOnboarding = useStore(
    (s) => s.setHasCompletedOnboarding
  );
  const setApiKey = useStore((s) => s.setApiKey);
  const setGithubToken = useStore((s) => s.setGithubToken);
  const terminalPanelOpen = useStore((s) => s.terminalPanelOpen);
  const terminalExpanded = useStore((s) => s.terminalExpanded);
  const isAgentChatOpen = useStore((s) => s.isAgentChatOpen);
  const fileTreeOpen = useStore((s) => s.fileTreeOpen);
  const currentFilePath = useStore((s) => s.currentFilePath);
  const activeTabType = useStore((s) => s.activeTabType);
  const activeBrowserTabId = useStore((s) => s.activeBrowserTabId);
  const setCodeFontSize = useStore((s) => s.setCodeFontSize);
  const setTerminalFontSize = useStore((s) => s.setTerminalFontSize);

  const terminalHeight = useSharedValue(0);

  const { refreshFileTree } = useFileSystem();
  const remoteWorkspaceEnabled = useStore((s) => s.remoteWorkspaceEnabled);
  const remoteWorkspaceWsUrl = useStore((s) => s.remoteWorkspaceWsUrl);
  const workspaceBridgeToken = useStore((s) => s.workspaceBridgeToken);
  const workspaceSessionJwt = useStore((s) => s.workspaceSessionJwt);
  const workspaceStatus = useStore((s) => s.workspaceStatus);

  useRemoteFsEvents();
  useCloudSession(); // registers app-state background cleanup (Fargate path)

  const keyboard = useAnimatedKeyboard();
  const pillKeyboardActive = useStore((s) => s.pillKeyboardActive);
  const bottomBarAnimatedStyle = useAnimatedStyle(() => ({
    bottom: pillKeyboardActive ? keyboard.height.value : 0,
  }));
  const terminalKeyboardInsetStyle = useAnimatedStyle(() => ({
    marginBottom: terminalPanelOpen ? keyboard.height.value : 0,
  }));

  useFocusEffect(
    useCallback(() => {
      Keyboard.dismiss();
      const { terminalPanelOpen: open, terminalExpanded: expanded } =
        useStore.getState();
      if (open && terminalHeight.value < TERMINAL_DEFAULT_HEIGHT * 0.5) {
        const target = expanded ? TERMINAL_MAX_HEIGHT : TERMINAL_DEFAULT_HEIGHT;
        terminalHeight.value = withTiming(target, TIMING_CONFIG);
      }
    }, [terminalHeight])
  );

  useEffect(() => {
    if (terminalPanelOpen) {
      const target = terminalExpanded ? TERMINAL_MAX_HEIGHT : TERMINAL_DEFAULT_HEIGHT;
      terminalHeight.value = withTiming(target, TIMING_CONFIG);
    } else if (isAgentChatOpen || fileTreeOpen) {
      terminalHeight.value = 0;
    } else {
      terminalHeight.value = withTiming(0, TIMING_CONFIG);
    }
  }, [terminalPanelOpen, terminalExpanded, isAgentChatOpen, fileTreeOpen]);

  const terminalPanelStyle = useAnimatedStyle(() => ({
    height: terminalHeight.value,
    overflow: "hidden" as const,
  }));

  useEffect(() => {
    (async () => {
      // Load stored credentials
      const storedKey = await SecureStore.getItemAsync("openrouter_api_key");
      const storedToken = await SecureStore.getItemAsync("github_token");

      if (storedKey) {
        setApiKey(storedKey);
        setHasCompletedOnboarding(true);
      }
      if (storedToken) {
        setGithubToken(storedToken);
      }

      if (storedToken) {
        let ghUid = await fetchGithubUserId(storedToken);
        if (ghUid != null) {
          await setCachedGithubUserId(ghUid);
        } else {
          ghUid = await getCachedGithubUserId();
        }
        if (ghUid != null) {
          await migrateLegacyMcpStorageIfNeeded(ghUid);
          const cat = await loadMcpCatalogForUser(ghUid);
          if (cat?.trim()) {
            useStore.getState().setMcpCatalogJson(cat);
          }
          const pol = await loadMcpPolicyForUser(ghUid);
          if (pol) {
            useStore.getState().setMcpRepoPolicy(pol);
          }
        }
      }

      const storedBridgeToken = await SecureStore.getItemAsync(
        "workspace_bridge_token"
      );
      if (storedBridgeToken) {
        useStore.getState().setWorkspaceBridgeToken(storedBridgeToken);
      }

      const storedSessionJwt = await SecureStore.getItemAsync(
        "workspace_session_jwt"
      );
      if (storedSessionJwt) {
        useStore.getState().setWorkspaceSessionJwt(storedSessionJwt);
      }

      const storedGitPatsByUrl = await SecureStore.getItemAsync(
        "git_pats_by_fetch_url"
      );
      if (storedGitPatsByUrl) {
        try {
          const o = JSON.parse(storedGitPatsByUrl) as Record<string, unknown>;
          const lines = Object.entries(o)
            .filter(([, v]) => typeof v === "string")
            .map(([k, v]) => `${k} ${v as string}`)
            .join("\n");
          if (lines) {
            useStore.getState().setRemoteGithubPatByFetchUrlFromLines(lines);
          }
        } catch {
          /* ignore */
        }
      }

      const storedRemotePats = await SecureStore.getItemAsync("remote_github_pats");
      if (storedRemotePats) {
        try {
          const obj = JSON.parse(storedRemotePats);
          const st = useStore.getState();
          for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
            if (typeof v === "string") st.setRemoteGithubPatForBridgeKey(k, v);
          }
        } catch {
          /* ignore */
        }
      }

      const storedFontSize = await SecureStore.getItemAsync("code_font_size");
      if (storedFontSize) {
        setCodeFontSize(storedFontSize as CodeFontSizeOption);
      }

      const storedTerminalFont = await SecureStore.getItemAsync(
        "terminal_font_size"
      );
      if (
        storedTerminalFont === "small" ||
        storedTerminalFont === "medium" ||
        storedTerminalFont === "large"
      ) {
        setTerminalFontSize(storedTerminalFont as TerminalFontSizeOption);
      }

      if (!storedToken) {
        router.replace("/login");
        return;
      }
      if (!storedKey) {
        router.replace("/onboarding");
        return;
      }

      const st = useStore.getState();
      const stayOnIdeFargate =
        st.remoteWorkspaceEnabled &&
        st.cloudSessionStatus === "ready" &&
        Boolean(st.cloudSessionId);
      const stayOnIdeFly = isFlyMode() && Boolean(st.userMachineId);
      const stayOnIde = stayOnIdeFargate || stayOnIdeFly;

      if (stayOnIde) {
        refreshFileTree();
        return;
      }

      router.replace("/projects");
    })();
  }, []);

  useEffect(() => {
    void refreshFileTree();
  }, [
    remoteWorkspaceEnabled,
    remoteWorkspaceWsUrl,
    workspaceBridgeToken,
    workspaceSessionJwt,
    workspaceStatus,
    refreshFileTree,
  ]);

  useEffect(() => {
    if (!remoteWorkspaceEnabled) return;
    return subscribeRemoteConnection((e) => {
      if (e.kind === "open") {
        void refreshFileTree();
      } else if (e.kind === "close") {
        useStore.getState().setFileTree([]);
      }
    });
  }, [remoteWorkspaceEnabled, refreshFileTree]);

  const showBottomAgentLayer = !terminalPanelOpen && !fileTreeOpen;

  return (
    <View style={styles.container}>
        {!currentFilePath && activeTabType !== "browser" && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss keyboard"
            onPress={() => {
              Keyboard.dismiss();
            }}
            style={styles.welcomeBackground}
          >
            <Image source={require("@/assets/images/icon.png")} style={styles.welcomeIcon} />
            <Text style={styles.welcomeLogo}>treena</Text>
            <Text style={styles.welcomeTagline}>code anywhere, anytime</Text>
            <View style={styles.welcomeHints}>
              <Text style={styles.welcomeHint}>Open a file from the explorer</Text>
              <Text style={styles.welcomeHint}>or message Treena to get started</Text>
            </View>
          </Pressable>
        )}

        <View style={styles.kavContainer}>
          <Header />
          <EditorTabBar />
          <View style={styles.editorStack}>
            {activeTabType === "browser" && activeBrowserTabId ? (
              <BrowserView tabId={activeBrowserTabId} />
            ) : currentFilePath ? (
              <CodeViewer />
            ) : null}
          </View>
          {/* Terminal panel -- sits in flex layout, animated height */}
          <Animated.View style={[terminalPanelStyle, terminalKeyboardInsetStyle]}>
            <TerminalBar terminalHeight={terminalHeight} />
          </Animated.View>
          {showBottomAgentLayer && (
            <Animated.View style={[styles.bottomBarContainer, bottomBarAnimatedStyle]}>
              <AgentBar />
              <FloatingInputPill />
            </Animated.View>
          )}
          <FileExplorer />
          <ModelPicker />
          <SettingsModal />
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  kavContainer: {
    flex: 1,
    minHeight: 0,
  },
  editorStack: {
    flex: 1,
    minHeight: 0,
  },
  bottomBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  welcomeBackground: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
  },
  welcomeIcon: { width: 100, height: 100, borderRadius: 20, marginBottom: 16 },
  welcomeLogo: {
    fontFamily: fonts.monoBold,
    fontSize: 48,
    color: "#FFFFFF",
    letterSpacing: -2,
    marginBottom: 8,
  },
  welcomeTagline: {
    fontFamily: fonts.sans,
    fontSize: fontSize.lg,
    color: colors.accent,
    marginBottom: 48,
  },
  welcomeHints: { alignItems: "center", gap: 8 },
  welcomeHint: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
});
