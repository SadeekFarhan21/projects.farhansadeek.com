import { useCallback, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  ActionSheetIOS,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Svg, { Circle } from "react-native-svg";
import { colors, fonts, fontSize, spacing, radii } from "@/constants/theme";
import { useStore, AgentMode } from "@/store";
import { useAgent } from "@/hooks/useAgent";

const GAUGE_SIZE = 22;
const GAUGE_STROKE = 2;
const GAUGE_RADIUS = (GAUGE_SIZE - GAUGE_STROKE) / 2;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

function ContextGauge() {
  const tokensUsed = useStore((s) => s.contextTokensUsed);
  const selectedModel = useStore((s) => s.selectedModel);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const contextWindow = selectedModel.contextWindow;
  const ratio = contextWindow > 0 ? Math.min(tokensUsed / contextWindow, 1) : 0;
  const strokeDashoffset = GAUGE_CIRCUMFERENCE * (1 - ratio);

  let gaugeColor: string = colors.textMuted;
  if (ratio > 0.9) gaugeColor = colors.error;
  else if (ratio > 0.75) gaugeColor = colors.warning;

  const handlePress = useCallback(() => {
    setShowTooltip(true);
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => setShowTooltip(false), 2000);
  }, []);

  const formatTokens = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${Math.round(n / 1000)}K`;
    return String(n);
  };

  return (
    <View style={styles.gaugeContainer}>
      {showTooltip && (
        <View style={styles.gaugeTooltip}>
          <Text style={styles.gaugeTooltipText}>
            {formatTokens(tokensUsed)} / {formatTokens(contextWindow)}
          </Text>
        </View>
      )}
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7} hitSlop={8}>
        <Svg width={GAUGE_SIZE} height={GAUGE_SIZE}>
          <Circle
            cx={GAUGE_SIZE / 2}
            cy={GAUGE_SIZE / 2}
            r={GAUGE_RADIUS}
            stroke={colors.border}
            strokeWidth={GAUGE_STROKE}
            fill="none"
          />
          <Circle
            cx={GAUGE_SIZE / 2}
            cy={GAUGE_SIZE / 2}
            r={GAUGE_RADIUS}
            stroke={gaugeColor}
            strokeWidth={GAUGE_STROKE}
            fill="none"
            strokeDasharray={GAUGE_CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation={-90}
            origin={`${GAUGE_SIZE / 2}, ${GAUGE_SIZE / 2}`}
          />
        </Svg>
      </TouchableOpacity>
    </View>
  );
}

function ModeToggle() {
  const agentMode = useStore((s) => s.agentMode);
  const setAgentMode = useStore((s) => s.setAgentMode);
  const isGenerating = useStore((s) => s.isGenerating);

  const handleToggle = useCallback(
    (mode: AgentMode) => {
      if (isGenerating) return;
      if (mode !== agentMode) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setAgentMode(mode);
      }
    },
    [agentMode, setAgentMode, isGenerating]
  );

  return (
    <View style={[styles.modeToggle, isGenerating && styles.modeToggleDisabled]}>
      <TouchableOpacity
        style={[
          styles.modeSegment,
          agentMode === "plan" && styles.modeSegmentPlanActive,
        ]}
        onPress={() => handleToggle("plan")}
        activeOpacity={0.7}
        disabled={isGenerating}
      >
        <Text
          style={[
            styles.modeSegmentText,
            agentMode === "plan" && styles.modeSegmentTextPlanActive,
          ]}
        >
          Plan
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.modeSegment,
          agentMode === "agent" && styles.modeSegmentAgentActive,
        ]}
        onPress={() => handleToggle("agent")}
        activeOpacity={0.7}
        disabled={isGenerating}
      >
        <Text
          style={[
            styles.modeSegmentText,
            agentMode === "agent" && styles.modeSegmentTextAgentActive,
          ]}
        >
          Agent
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function FloatingInputPill() {
  const insets = useSafeAreaInsets();
  const isGenerating = useStore((s) => s.isGenerating);
  const terminalPanelOpen = useStore((s) => s.terminalPanelOpen);
  const fileTreeOpen = useStore((s) => s.fileTreeOpen);
  const currentFilePath = useStore((s) => s.currentFilePath);
  const agentMode = useStore((s) => s.agentMode);
  const setFloatingPillHeight = useStore((s) => s.setFloatingPillHeight);
  const setPillKeyboardActive = useStore((s) => s.setPillKeyboardActive);
  const { inputText, setInputText, sendMessage, stopGeneration } = useAgent();
  const [inputFocused, setInputFocused] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [editable, setEditable] = useState(false);

  if (terminalPanelOpen || fileTreeOpen) return null;

  // Delay editability to prevent keyboard from auto-showing on mount/view switch
  useEffect(() => {
    const timer = setTimeout(() => setEditable(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true)
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const handleSend = useCallback(async () => {
    if (isGenerating) {
      stopGeneration();
      return;
    }
    const text = inputText.trim();
    if (text) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setInputText("");
      await sendMessage(text);
      Keyboard.dismiss();
    }
  }, [inputText, sendMessage, setInputText, isGenerating, stopGeneration]);

  const handleAttach = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const options = currentFilePath
      ? ["Attach current file", "Cancel"]
      : ["No file open", "Cancel"];
    const cancelIndex = options.length - 1;

    const insertFile = () => {
      const prefix = inputText ? `${inputText} ` : "";
      setInputText(`${prefix}@file:${currentFilePath} `);
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex },
        (idx) => {
          if (idx === 0 && currentFilePath) insertFile();
        }
      );
    } else {
      if (currentFilePath) {
        Alert.alert("Attach", "Attach current file to message?", [
          { text: "Cancel", style: "cancel" },
          { text: "Attach", onPress: insertFile },
        ]);
      }
    }
  }, [currentFilePath, setInputText, inputText]);

  const sendBtnBg =
    agentMode === "plan" ? colors.accent : colors.agentGrey;
  const sendIconColor =
    agentMode === "plan" ? colors.accentText : colors.text;
  const placeholderText =
    agentMode === "plan"
      ? "Describe what you want to build..."
      : "Message Treena...";

  return (
    <View
      onLayout={(e) => setFloatingPillHeight(e.nativeEvent.layout.height)}
      style={[
        styles.wrapper,
        {
          paddingBottom: keyboardVisible
            ? spacing.xs2
            : insets.bottom,
        },
      ]}
    >
      <View style={styles.container}>
        <ModeToggle />

        <TextInput
          style={[styles.input, inputFocused && styles.inputFocused]}
          placeholder={placeholderText}
          placeholderTextColor={colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          onFocus={() => {
            setInputFocused(true);
            setPillKeyboardActive(true);
            const st = useStore.getState();
            if (st.fileTreeOpen) st.setFileTreeOpen(false);
            if (st.terminalPanelOpen) st.setTerminalPanelOpen(false);
          }}
          onBlur={() => {
            setInputFocused(false);
            setPillKeyboardActive(false);
          }}
          autoFocus={false}
          editable={editable}
          multiline
          maxLength={4000}
          returnKeyType="default"
        />

        <ContextGauge />

        {isGenerating ? (
          <TouchableOpacity onPress={handleSend} style={styles.sendBtnStop}>
            <Ionicons name="stop" size={22} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSend}
            style={[
              styles.sendBtn,
              inputText.trim()
                ? { backgroundColor: sendBtnBg, borderColor: sendBtnBg }
                : null,
            ]}
            disabled={!inputText.trim()}
          >
            <Ionicons
              name="arrow-up"
              size={22}
              color={inputText.trim() ? sendIconColor : colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.bg,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
    marginBottom: 0,
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 56,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  modeToggle: {
    flexDirection: "row",
    borderRadius: radii.full,
    backgroundColor: colors.bg,
    overflow: "hidden",
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeToggleDisabled: {
    opacity: 0.5,
  },
  modeSegment: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modeSegmentText: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.textMuted,
  },
  modeSegmentPlanActive: {
    backgroundColor: colors.accent,
    borderRadius: radii.full,
  },
  modeSegmentTextPlanActive: {
    color: colors.accentText,
  },
  modeSegmentAgentActive: {
    backgroundColor: colors.agentGrey,
    borderRadius: radii.full,
  },
  modeSegmentTextAgentActive: {
    color: colors.text,
  },
  input: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.inputText,
    color: colors.text,
    maxHeight: 120,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  inputFocused: {},
  gaugeContainer: {
    marginRight: spacing.xs,
    position: "relative",
  },
  gaugeTooltip: {
    position: "absolute",
    bottom: 28,
    right: -20,
    backgroundColor: colors.surfaceLight,
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 10,
  },
  gaugeTooltipText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.textSecondary,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.labelBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtnStop: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
});
