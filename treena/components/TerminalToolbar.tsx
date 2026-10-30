import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import { colors, fonts, fontSize, spacing, radii } from "@/constants/theme";
import { sendRemoteTerminalIn } from "@/lib/workspace/remoteWsBridge";

interface Props {
  terminalId: string;
}

interface KeyDef {
  label: string;
  /** The raw string (or escape sequence) to send. If `ctrl`, it's handled specially. */
  send?: string;
  /** If true, this key toggles "ctrl mode" instead of sending data. */
  isCtrl?: boolean;
  /** Width multiplier (default 1). */
  wide?: number;
}

const KEYS: KeyDef[] = [
  { label: "Tab", send: "\t" },
  { label: "Esc", send: "\x1b" },
  { label: "Ctrl", isCtrl: true },
  { label: "↑", send: "\x1b[A" },
  { label: "↓", send: "\x1b[B" },
  { label: "←", send: "\x1b[D" },
  { label: "→", send: "\x1b[C" },
  { label: "-", send: "-" },
  { label: "|", send: "|" },
  { label: "/", send: "/" },
  { label: "~", send: "~" },
  { label: ":", send: ":" },
];

export default function TerminalToolbar({ terminalId }: Props) {
  const [ctrlActive, setCtrlActive] = useState(false);

  const handlePress = useCallback(
    (key: KeyDef) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (key.isCtrl) {
        setCtrlActive((prev) => !prev);
        return;
      }

      if (!key.send) return;

      let data = key.send;

      // If ctrl is active and the key is a single printable character,
      // convert it to the ctrl equivalent (ctrl+a = 0x01, etc.)
      if (ctrlActive && data.length === 1) {
        const code = data.toUpperCase().charCodeAt(0);
        if (code >= 65 && code <= 90) {
          // A-Z → 1-26
          data = String.fromCharCode(code - 64);
        } else if (data === "c") {
          data = "\x03"; // ctrl+c
        }
        setCtrlActive(false);
      } else if (ctrlActive) {
        // For non-single-char keys (arrows etc.), just send as-is and clear ctrl
        setCtrlActive(false);
      }

      sendRemoteTerminalIn(data, terminalId);
    },
    [ctrlActive, terminalId]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={styles.scrollContent}
      >
        {KEYS.map((key) => {
          const isActiveCtrl = key.isCtrl && ctrlActive;
          return (
            <TouchableOpacity
              key={key.label}
              onPress={() => handlePress(key)}
              style={[
                styles.key,
                isActiveCtrl && styles.keyActive,
                key.wide ? { minWidth: key.wide * 44 } : undefined,
              ]}
              activeOpacity={0.6}
              accessibilityLabel={key.label}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.keyLabel,
                  isActiveCtrl && styles.keyLabelActive,
                ]}
              >
                {key.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingVertical: 6,
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    gap: 6,
  },
  key: {
    minWidth: 44,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.labelBg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  keyActive: {
    backgroundColor: colors.accent,
  },
  keyLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  keyLabelActive: {
    color: colors.accentText,
  },
});
