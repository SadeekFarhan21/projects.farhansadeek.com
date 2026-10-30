import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { applyPatch } from "diff";
import { colors, fonts, fontSize, spacing, radii } from "@/constants/theme";
import { useStore } from "@/store";
import { useFileSystem } from "@/hooks/useFileSystem";
import { computeLineDiff } from "@/lib/diff";
import { joinRemotePath, REMOTE_PROJECT_ROOT } from "@/lib/workspace/remotePaths";

const MAX_CARD_HEIGHT = 300;

function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function resolveWorkspacePath(filename: string | null): string | null {
  if (!filename?.trim()) return null;
  const rel = filename.trim().replace(/^\/+/, "");
  const st = useStore.getState();
  if (st.remoteWorkspaceEnabled) {
    return joinRemotePath(REMOTE_PROJECT_ROOT, rel);
  }
  const root = st.projectRoot.replace(/\/+$/, "");
  if (!root) return null;
  return `${root}/${rel}`;
}

interface DiffCardProps {
  filename: string | null;
  code: string;
  language: string;
  /** Parsed markdown segment is a diff-style block (unified / +/-). */
  isDiffBlock: boolean;
}

export default function DiffCard({
  filename,
  code,
  language,
  isDiffBlock,
}: DiffCardProps) {
  const { openFile, writeFile, readFile, refreshFileTree } = useFileSystem();
  const clearDiff = useStore((s) => s.clearDiff);
  const setDiff = useStore((s) => s.setDiff);
  const setAgentChatOpen = useStore((s) => s.setAgentChatOpen);
  const [expanded, setExpanded] = useState(false);
  const insets = useSafeAreaInsets();

  const lines = code.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  async function readCurrentOrEmpty(path: string): Promise<string> {
    try {
      return await readFile(path);
    } catch {
      return "";
    }
  }

  const applyToWorkspace = async (mode: "write" | "preview") => {
    const path = resolveWorkspacePath(filename);
    if (!path) {
      Alert.alert(
        "Diff",
        "Use a filename in the fence (e.g. ```diff:src/App.tsx) so the patch can be applied."
      );
      return;
    }
    if (!isDiffBlock && language !== "diff") {
      Alert.alert("Diff", "This block is not a unified diff.");
      return;
    }

    const current = await readCurrentOrEmpty(path);
    const patched = applyPatch(current, code);
    if (patched === false) {
      Alert.alert(
        "Diff",
        "Could not apply this patch to the file on disk. The file may have changed."
      );
      return;
    }

    if (mode === "write") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await writeFile(path, patched);
      clearDiff();
      await refreshFileTree();
      const name = basename(filename!.trim());
      if (useStore.getState().currentFilePath === path) {
        await openFile(path, name);
      }
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const name = basename(filename!.trim());
      await openFile(path, name);
      setDiff(computeLineDiff(current, patched));
      setAgentChatOpen(false);
    }
  };

  const handleAccept = () => {
    void applyToWorkspace("write");
  };

  const handlePreview = () => {
    void applyToWorkspace("preview");
  };

  const handleReject = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    clearDiff();
  };

  const diffBody = (
    <Text style={styles.lineText}>
      {lines.map((line, i) => {
        const isAdded = line.startsWith("+");
        const isRemoved = line.startsWith("-");
        return (
          <Text
            key={i}
            style={isAdded ? styles.lineAddedText : isRemoved ? styles.lineRemovedText : undefined}
          >
            {line}
            {i < lines.length - 1 ? "\n" : ""}
          </Text>
        );
      })}
    </Text>
  );

  const actionButtons = (
    <View style={styles.buttonRow}>
      <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} activeOpacity={0.7}>
        <Text style={styles.acceptBtnText}>Accept</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.previewBtn} onPress={handlePreview} activeOpacity={0.7}>
        <Text style={styles.previewBtnText}>Preview</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.rejectBtn} onPress={handleReject} activeOpacity={0.7}>
        <Text style={styles.rejectBtnText}>Reject</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="code-slash" size={14} color={colors.textSecondary} />
        <Text style={styles.headerText} numberOfLines={1}>
          {filename || "Code change"}
        </Text>
      </View>

      <View style={styles.codeBounded}>{diffBody}</View>

      <TouchableOpacity
        onPress={() => setExpanded(true)}
        activeOpacity={0.7}
        style={styles.expandRow}
      >
        <Ionicons name="expand-outline" size={14} color={colors.textSecondary} />
        <Text style={styles.expandText}>Tap to expand</Text>
      </TouchableOpacity>

      {actionButtons}

      <Modal
        visible={expanded}
        animationType="slide"
        onRequestClose={() => setExpanded(false)}
        presentationStyle="fullScreen"
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Ionicons name="code-slash" size={16} color={colors.textSecondary} />
            <Text style={styles.modalTitle} numberOfLines={1}>
              {filename || "Code change"}
            </Text>
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
            contentContainerStyle={styles.modalBodyContent}
          >
            {diffBody}
          </ScrollView>
          <View style={[styles.modalActions, { paddingBottom: insets.bottom + spacing.sm }]}>
            {actionButtons}
          </View>
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
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 6,
  },
  headerText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  codeBounded: {
    maxHeight: MAX_CARD_HEIGHT,
    overflow: "hidden",
    padding: spacing.md,
  },
  lineText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  lineAddedText: {
    backgroundColor: colors.diffAddedBg,
    color: colors.text,
  },
  lineRemovedText: {
    backgroundColor: colors.diffRemovedBg,
    color: colors.text,
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
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.md,
  },
  acceptBtn: {
    flexGrow: 1,
    minWidth: "28%",
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  acceptBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    color: colors.accentText,
  },
  previewBtn: {
    flexGrow: 1,
    minWidth: "28%",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  previewBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  rejectBtn: {
    flexGrow: 1,
    minWidth: "28%",
    backgroundColor: "transparent",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  rejectBtnText: {
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
  modalActions: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
