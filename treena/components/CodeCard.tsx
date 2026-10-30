import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { colors, fonts, fontSize, spacing, radii } from "@/constants/theme";

const MAX_CARD_HEIGHT = 300;

interface CodeCardProps {
  code: string;
  language: string;
}

export default function CodeCard({ code, language }: CodeCardProps) {
  const trimmed = code.endsWith("\n") ? code.slice(0, -1) : code;
  const [expanded, setExpanded] = useState(false);
  const insets = useSafeAreaInsets();

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.headerText}>{language || "code"}</Text>
        <TouchableOpacity onPress={handleCopy} activeOpacity={0.7} style={styles.copyBtn}>
          <Ionicons name="copy-outline" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.codeBounded}>
        <Text style={styles.lineText}>{trimmed}</Text>
      </View>

      <TouchableOpacity
        onPress={() => setExpanded(true)}
        activeOpacity={0.7}
        style={styles.expandRow}
      >
        <Ionicons name="expand-outline" size={14} color={colors.textSecondary} />
        <Text style={styles.expandText}>Tap to expand</Text>
      </TouchableOpacity>

      <Modal
        visible={expanded}
        animationType="slide"
        onRequestClose={() => setExpanded(false)}
        presentationStyle="fullScreen"
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {language || "code"}
            </Text>
            <TouchableOpacity onPress={handleCopy} style={styles.modalBtn} activeOpacity={0.7}>
              <Ionicons name="copy-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setExpanded(false)}
              style={styles.modalBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={[
              styles.modalBodyContent,
              { paddingBottom: insets.bottom + spacing.xxl },
            ]}
          >
            <Text style={styles.lineText}>{trimmed}</Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginVertical: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  copyBtn: {
    padding: 4,
  },
  codeBounded: {
    maxHeight: MAX_CARD_HEIGHT,
    overflow: "hidden",
    backgroundColor: colors.editorBg,
    padding: spacing.md,
  },
  lineText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  expandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  expandText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  modalTitle: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.md,
    color: colors.text,
  },
  modalBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    flex: 1,
    backgroundColor: colors.editorBg,
  },
  modalBodyContent: {
    padding: spacing.md,
  },
});
