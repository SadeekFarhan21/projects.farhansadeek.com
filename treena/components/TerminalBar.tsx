import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, fonts, fontSize as fs, spacing, radii } from "@/constants/theme";
import { useStore } from "@/store";
import {
  getRemoteBridgeSessionState,
  getRemoteWsReadyState,
  isReconnecting,
  normalizeWsUrl,
  subscribeRemoteBridgeSession,
  subscribeRemoteConnection,
} from "@/lib/workspace/remoteWsBridge";
import RemoteXtermTerminal from "@/components/RemoteXtermTerminal";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const MIN_HEIGHT = 100;
const DEFAULT_HEIGHT = Math.round(SCREEN_HEIGHT * 0.4);
const MAX_HEIGHT = Math.round(SCREEN_HEIGHT * 0.75);
const TIMING_CONFIG = { duration: 200, easing: Easing.out(Easing.cubic) };

interface Props {
  terminalHeight: SharedValue<number>;
}

export default function TerminalBar({ terminalHeight }: Props) {
  const [remoteStatus, setRemoteStatus] = useState("");

  const terminalTabs = useStore((s) => s.terminalTabs);
  const terminalExpanded = useStore((s) => s.terminalExpanded);
  const setTerminalExpanded = useStore((s) => s.setTerminalExpanded);
  const setTerminalPanelOpen = useStore((s) => s.setTerminalPanelOpen);
  const activeTerminalId = useStore((s) => s.activeTerminalId);
  const addTerminalTab = useStore((s) => s.addTerminalTab);
  const removeTerminalTab = useStore((s) => s.removeTerminalTab);
  const setActiveTerminalId = useStore((s) => s.setActiveTerminalId);
  const remoteWorkspaceWsUrl = useStore((s) => s.remoteWorkspaceWsUrl);

  const startHeight = useSharedValue(0);
  const didActivate = useSharedValue(false);

  const notifyClose = useCallback(() => {
    setTerminalPanelOpen(false);
  }, [setTerminalPanelOpen]);

  const notifyExpand = useCallback((expanded: boolean) => {
    setTerminalExpanded(expanded);
  }, [setTerminalExpanded]);

  const panGesture = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .onStart(() => {
      startHeight.value = terminalHeight.value;
      didActivate.value = true;
    })
    .onUpdate((e) => {
      const newHeight = startHeight.value - e.translationY;
      terminalHeight.value = Math.min(MAX_HEIGHT, Math.max(0, newHeight));
    })
    .onFinalize(() => {
      if (!didActivate.value) return;
      didActivate.value = false;
      if (terminalHeight.value < MIN_HEIGHT) {
        terminalHeight.value = withTiming(0, TIMING_CONFIG);
        runOnJS(notifyClose)();
      } else if (terminalHeight.value > MAX_HEIGHT * 0.85) {
        terminalHeight.value = withTiming(MAX_HEIGHT, TIMING_CONFIG);
        runOnJS(notifyExpand)(true);
      } else {
        const target = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, terminalHeight.value));
        terminalHeight.value = withTiming(target, TIMING_CONFIG);
        runOnJS(notifyExpand)(false);
      }
    });

  const handleDoubleTap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isExpanded = useStore.getState().terminalExpanded;
    if (isExpanded) {
      setTerminalExpanded(false);
      terminalHeight.value = withTiming(DEFAULT_HEIGHT, TIMING_CONFIG);
    } else {
      setTerminalExpanded(true);
      terminalHeight.value = withTiming(MAX_HEIGHT, TIMING_CONFIG);
    }
  }, [setTerminalExpanded, terminalHeight]);

  const updateRemoteStatus = useCallback(() => {
    const url = normalizeWsUrl(remoteWorkspaceWsUrl.trim());
    if (!url) {
      setRemoteStatus("");
      return;
    }
    const rs = getRemoteWsReadyState();
    const sessionState = getRemoteBridgeSessionState();
    if (rs === WebSocket.OPEN && sessionState === "ready") {
      setRemoteStatus("");
    } else if (rs === WebSocket.OPEN && sessionState === "pending") {
      setRemoteStatus("Handshaking…");
    } else if (rs === WebSocket.OPEN && sessionState === "error") {
      setRemoteStatus("Session error");
    } else if (rs === WebSocket.OPEN) {
      setRemoteStatus("Preparing…");
    } else if (rs === WebSocket.CONNECTING) {
      setRemoteStatus("Connecting…");
    } else {
      setRemoteStatus(isReconnecting() ? "Reconnecting…" : "Disconnected");
    }
  }, [remoteWorkspaceWsUrl]);

  useEffect(() => {
    updateRemoteStatus();
    const unsubConn = subscribeRemoteConnection(() => updateRemoteStatus());
    const unsubSession = subscribeRemoteBridgeSession(() => updateRemoteStatus());
    return () => {
      unsubConn();
      unsubSession();
    };
  }, [remoteWorkspaceWsUrl, updateRemoteStatus]);

  const hasRemoteUrl = !!normalizeWsUrl(remoteWorkspaceWsUrl.trim());

  return (
    <View style={styles.container}>
      {/* Drag handle */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={styles.handleRow}>
          <TouchableOpacity
            onPress={handleDoubleTap}
            activeOpacity={0.8}
            style={styles.handleTouchable}
          >
            <View style={styles.handlePill} />
            <View style={styles.handleLabelRow}>
              <Ionicons name="terminal-outline" size={14} color={colors.textMuted} />
              <Text style={styles.handleLabel}>Terminal</Text>
              {remoteStatus ? (
                <Text style={styles.handleStatus}>{remoteStatus}</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>

      {/* Tab bar */}
      <View style={styles.tabRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
          keyboardShouldPersistTaps="always"
        >
          {terminalTabs.map((tab) => (
            <View
              key={tab.id}
              style={[styles.tab, tab.id === activeTerminalId && styles.tabActive]}
            >
              <TouchableOpacity
                onPress={() => setActiveTerminalId(tab.id)}
                activeOpacity={0.7}
                style={styles.tabMain}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    tab.id === activeTerminalId && styles.tabLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
              {terminalTabs.length > 1 && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    removeTerminalTab(tab.id);
                  }}
                  activeOpacity={0.6}
                  style={styles.tabClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={`Close ${tab.label}`}
                >
                  <Ionicons name="close" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity onPress={addTerminalTab} style={styles.tabAdd}>
            <Ionicons name="add" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </ScrollView>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const exp = useStore.getState().terminalExpanded;
            setTerminalExpanded(!exp);
            terminalHeight.value = withTiming(exp ? DEFAULT_HEIGHT : MAX_HEIGHT, TIMING_CONFIG);
          }}
          style={styles.expandBtn}
          hitSlop={12}
          accessibilityLabel={terminalExpanded ? "Shrink terminal" : "Expand terminal"}
        >
          <Ionicons
            name={terminalExpanded ? "contract-outline" : "expand-outline"}
            size={18}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Terminal body */}
      <View style={styles.remoteBody}>
        {hasRemoteUrl ? (
          terminalTabs.map((tab) => (
            <View
              key={tab.id}
              style={[
                styles.terminalInstance,
                tab.id !== activeTerminalId && styles.terminalHidden,
              ]}
            >
              <RemoteXtermTerminal terminalId={tab.id} />
            </View>
          ))
        ) : (
          <View style={styles.remotePlaceholder}>
            <Text style={styles.remotePlaceholderText}>
              Waiting for workspace to connect…
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  handleRow: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    paddingBottom: 4,
  },
  handleTouchable: {
    alignItems: "center",
    width: "100%",
    paddingHorizontal: spacing.md,
  },
  handlePill: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
    opacity: 0.5,
    marginBottom: 6,
  },
  handleLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  handleLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fs.sm,
    color: colors.textSecondary,
  },
  handleStatus: {
    fontFamily: fonts.sans,
    fontSize: fs.xs,
    color: colors.textMuted,
  },
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBarContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    gap: 2,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    paddingRight: 4,
    borderRadius: radii.sm,
    minHeight: 36,
  },
  tabMain: {
    minHeight: 36,
    justifyContent: "center",
    maxWidth: 180,
    paddingVertical: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },
  tabLabel: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.accent,
  },
  tabClose: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  tabAdd: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },
  expandBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  remoteBody: {
    flex: 1,
    minHeight: 0,
    backgroundColor: "#0A0A0A",
  },
  terminalInstance: {
    flex: 1,
    minHeight: 0,
  },
  terminalHidden: {
    height: 0,
    overflow: "hidden",
    flex: 0,
  },
  remotePlaceholder: {
    flex: 1,
    minHeight: 0,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  remotePlaceholderText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
