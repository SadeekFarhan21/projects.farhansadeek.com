import { View, Text, TouchableOpacity, StyleSheet, Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, fonts, fontSize, spacing, radii } from "@/constants/theme";
import { useStore } from "@/store";
import { useCloudSession } from "@/hooks/useCloudSession";
import { isFlyMode } from "@/lib/userMachine";

/** Symmetric side rails; wide enough for two 40px icon buttons + gap + breathing room. */
const HEADER_SIDE_WIDTH = 40 + 8 + 40 + 8;

function getShortModelName(modelId: string): string {
  const names: Record<string, string> = {
    'anthropic/claude-sonnet-4-6': 'Sonnet 4.6',
    'anthropic/claude-opus-4-6': 'Opus 4.6',
    'anthropic/claude-sonnet-4-5': 'Sonnet 4.5',
    'openai/gpt-5.4': 'GPT-5.4',
    'openai/gpt-4o': 'GPT-4o',
    'google/gemini-3-flash-preview': 'Gemini 3',
    'google/gemini-2.5-flash-lite': 'Gemini 2.5',
    'deepseek/deepseek-r1': 'DeepSeek R1',
    'meta-llama/llama-3.3-70b-instruct': 'Llama 3.3',
    'mistralai/mistral-large': 'Mistral',
  };
  return names[modelId] || modelId.split('/')[1] || modelId;
}

export default function Header() {
  const insets = useSafeAreaInsets();
  const toggleFileTree = useStore((s) => s.toggleFileTree);
  const currentFileName = useStore((s) => s.currentFileName);
  const currentFilePath = useStore((s) => s.currentFilePath);
  const terminalPanelOpen = useStore((s) => s.terminalPanelOpen);
  const setTerminalPanelOpen = useStore((s) => s.setTerminalPanelOpen);
  const selectedModel = useStore((s) => s.selectedModel);
  const setModelPickerOpen = useStore((s) => s.setModelPickerOpen);
  const setAgentChatOpen = useStore((s) => s.setAgentChatOpen);
  const cloudSessionId = useStore((s) => s.cloudSessionId);
  const openTabPaths = useStore((s) => s.openTabPaths);
  const activeTabType = useStore((s) => s.activeTabType);
  const markdownPreviewOpen = useStore((s) => s.markdownPreviewOpen);
  const toggleMarkdownPreview = useStore((s) => s.toggleMarkdownPreview);
  const workspaceStatus = useStore((s) => s.workspaceStatus);

  const isWorkspaceLoading =
    !!cloudSessionId && workspaceStatus === "cloning";

  const isMarkdownFile =
    activeTabType === "file" &&
    !!currentFilePath &&
    currentFilePath.toLowerCase().endsWith(".md");

  const { stopSession } = useCloudSession();

  const handleMenuPress = () => {
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAgentChatOpen(false);
    setTerminalPanelOpen(false);
    toggleFileTree();
  };

  const handleEndSession = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void stopSession({ interactive: true });
  };

  const handleTerminalToggle = () => {
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTerminalPanelOpen(!terminalPanelOpen);
  };

  const handleModelPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModelPickerOpen(true);
  };

  const handleMarkdownPreviewToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleMarkdownPreview();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.inner}>
        <View style={[styles.sideTrack, styles.sideTrackLeft]}>
          <View style={styles.leftGroup}>
            <TouchableOpacity onPress={handleMenuPress} hitSlop={12} style={styles.iconBtn}>
              <Ionicons name="menu" size={22} color={colors.text} />
            </TouchableOpacity>
            {cloudSessionId && !isFlyMode() ? (
              <TouchableOpacity
                onPress={handleEndSession}
                hitSlop={12}
                style={[styles.iconBtn, styles.iconBtnExit]}
              >
                <Ionicons name="exit-outline" size={22} color={colors.error} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <TouchableOpacity
          style={styles.center}
          onPress={handleModelPress}
          activeOpacity={0.7}
        >
          <View style={styles.modelRow}>
            <Text style={styles.modelName} numberOfLines={1}>
              {getShortModelName(selectedModel.id || selectedModel as any)}
            </Text>
            <Ionicons
              name="chevron-down"
              size={14}
              color={colors.textSecondary}
              style={{ marginLeft: 4 }}
            />
          </View>
          {isWorkspaceLoading ? (
            <Text style={styles.workspaceLoadingSubtitle} numberOfLines={1}>
              Loading workspace…
            </Text>
          ) : currentFilePath && openTabPaths.length === 0 ? (
            <Text style={styles.fileSubtitle} numberOfLines={1}>
              {currentFileName}
            </Text>
          ) : null}
        </TouchableOpacity>

        <View style={[styles.sideTrack, styles.sideTrackRight]}>
          {isMarkdownFile ? (
            <TouchableOpacity
              onPress={handleMarkdownPreviewToggle}
              hitSlop={12}
              style={[styles.iconBtn, markdownPreviewOpen && styles.iconBtnActive]}
              accessibilityLabel={markdownPreviewOpen ? "Show markdown source" : "Preview markdown"}
            >
              <Ionicons
                name={markdownPreviewOpen ? "code-slash-outline" : "eye-outline"}
                size={20}
                color={markdownPreviewOpen ? colors.accentText : colors.text}
              />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={handleTerminalToggle}
            hitSlop={12}
            style={[styles.iconBtn, terminalPanelOpen && styles.iconBtnActive]}
          >
            <Ionicons
              name={terminalPanelOpen ? "close" : "terminal-outline"}
              size={22}
              color={terminalPanelOpen ? colors.accentText : colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.headerBg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  inner: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  sideTrack: {
    width: HEADER_SIDE_WIDTH,
    flexDirection: "row",
    alignItems: "center",
  },
  sideTrackLeft: {
    justifyContent: "flex-start",
  },
  sideTrackRight: {
    justifyContent: "flex-end",
    gap: 8,
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    backgroundColor: colors.labelBg,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnActive: {
    backgroundColor: colors.accent,
  },
  iconBtnExit: {
    borderWidth: 1,
    borderColor: colors.error,
  },
  center: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  modelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  modelName: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.headerTitle,
    color: colors.text,
  },
  fileSubtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSize.headerSubtitle,
    color: colors.textSecondary,
    marginTop: 1,
    textAlign: "center",
    alignSelf: "center",
    maxWidth: "100%",
  },
  workspaceLoadingSubtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSize.headerSubtitle,
    color: colors.accent,
    marginTop: 1,
    textAlign: "center",
    alignSelf: "center",
    maxWidth: "100%",
  },
});
