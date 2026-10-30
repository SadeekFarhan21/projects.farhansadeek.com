import { useState, useCallback } from "react";
import {
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from "react-native-reanimated";
import { remoteWorkspaceSearch, type WorkspaceSearchMatch } from "@/lib/workspace/remoteWsBridge";
import { REMOTE_PROJECT_ROOT } from "@/lib/workspace/remotePaths";
import { useFileSystem } from "@/hooks/useFileSystem";
import { colors, fonts, fontSize, spacing, radii } from "@/constants/theme";

function relToRemotePath(rel: string): string {
  const clean = rel.replace(/^\/+/, "");
  return `${REMOTE_PROJECT_ROOT}${clean}`;
}

export default function WorkspaceSearchModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState<WorkspaceSearchMatch[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const { openFile } = useFileSystem();

  const keyboard = useAnimatedKeyboard();
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    marginBottom: keyboard.height.value,
  }));

  const runSearch = useCallback(async () => {
    const pattern = q.trim();
    if (!pattern) return;
    setBusy(true);
    setErr(null);
    try {
      const m = await remoteWorkspaceSearch({ pattern, max_matches: 80 });
      setMatches(m);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setMatches([]);
    } finally {
      setBusy(false);
    }
  }, [q]);

  const onPick = useCallback(
    async (item: WorkspaceSearchMatch) => {
      const path = relToRemotePath(item.path);
      const name = item.path.split("/").pop() || item.path;
      try {
        await openFile(path, name);
        onClose();
      } catch {
        /* openFile surfaces via tree */
      }
    },
    [openFile, onClose]
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View style={sheetAnimatedStyle}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Search workspace</Text>
          <TextInput
            style={styles.input}
            value={q}
            onChangeText={setQ}
            placeholder="Fixed string (ripgrep / grep)"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => void runSearch()}
          />
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => void runSearch()}
            disabled={busy || !q.trim()}
          >
            {busy ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.searchBtnText}>Search</Text>
            )}
          </TouchableOpacity>
          {err ? (
            <Text style={styles.err}>{err}</Text>
          ) : (
            <FlatList
              data={matches}
              keyExtractor={(item, i) => `${item.path}:${item.line}:${i}`}
              style={styles.list}
              ListEmptyComponent={
                !busy && q.trim() ? (
                  <Text style={styles.hint}>No matches</Text>
                ) : null
              }
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.row} onPress={() => void onPick(item)}>
                  <Text style={styles.path} numberOfLines={1}>
                    {item.path}:{item.line}
                  </Text>
                  <Text style={styles.snip} numberOfLines={2}>
                    {item.text}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: colors.surfaceLight,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    maxHeight: "70%",
  },
  title: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.md,
  },
  input: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.text,
    backgroundColor: colors.editorBg,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  searchBtn: {
    backgroundColor: colors.accentDim,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  searchBtnText: {
    fontFamily: fonts.sans,
    color: colors.text,
    fontSize: fontSize.sm,
  },
  err: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.error,
  },
  list: {
    flexGrow: 0,
  },
  hint: {
    fontFamily: fonts.sans,
    color: colors.textMuted,
    fontSize: fontSize.sm,
    paddingVertical: spacing.md,
  },
  row: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  path: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.accent,
    marginBottom: 4,
  },
  snip: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
