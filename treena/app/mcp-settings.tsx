import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import { colors, fonts, fontSize, spacing, radii } from "@/constants/theme";
import { useStore, codeFontSizeValues } from "@/store";
import McpCatalogEditor from "@/components/McpCatalogEditor";
import { getMcpPolicyRepoKey } from "@/lib/mcpRepoKey";
import { syncMcpRuntimeConfigToBridge, getDefaultMcpCatalogJson } from "@/lib/mcpBridgeSync";
import {
  getCachedGithubUserId,
  saveMcpCatalogForUser,
  saveMcpPolicyForUser,
} from "@/lib/mcpLocalPersistence";

export default function McpSettingsScreen() {
  const insets = useSafeAreaInsets();
  const mcpCatalogJson = useStore((s) => s.mcpCatalogJson);
  const setMcpCatalogJson = useStore((s) => s.setMcpCatalogJson);
  const mcpRepoPolicy = useStore((s) => s.mcpRepoPolicy);
  const setMcpServerEnabledForCurrentRepo = useStore(
    (s) => s.setMcpServerEnabledForCurrentRepo
  );
  const cloudSessionRepoUrl = useStore((s) => s.cloudSessionRepoUrl);
  const cloudSessionGithubRepoId = useStore((s) => s.cloudSessionGithubRepoId);
  const repoName = useStore((s) => s.repoName);
  const remoteWorkspaceEnabled = useStore((s) => s.remoteWorkspaceEnabled);
  const remoteWorkspaceWsUrl = useStore((s) => s.remoteWorkspaceWsUrl);
  const codeFontSize = useStore((s) => s.codeFontSize);

  const [draft, setDraft] = useState(mcpCatalogJson);
  const [parseError, setParseError] = useState<string | null>(null);

  const keyboard = useAnimatedKeyboard();
  const rootAnimatedStyle = useAnimatedStyle(() => ({
    marginBottom: keyboard.height.value,
  }));

  useEffect(() => {
    setDraft(mcpCatalogJson);
  }, [mcpCatalogJson]);

  const repoKey = useMemo(
    () =>
      getMcpPolicyRepoKey({
        cloudSessionRepoUrl,
        cloudSessionGithubRepoId,
        repoName,
        remoteWorkspaceEnabled,
        remoteWorkspaceWsUrl,
      }),
    [
      cloudSessionRepoUrl,
      cloudSessionGithubRepoId,
      repoName,
      remoteWorkspaceEnabled,
      remoteWorkspaceWsUrl,
    ]
  );

  const serverNames = useMemo(() => {
    try {
      const p = JSON.parse(draft || "{}") as { mcpServers?: Record<string, unknown> };
      return Object.keys(p.mcpServers || {});
    } catch {
      return [];
    }
  }, [draft]);

  const enabledSet = useMemo(() => {
    const pol = mcpRepoPolicy[repoKey];
    if (pol === undefined) return new Set<string>();
    return new Set(pol);
  }, [mcpRepoPolicy, repoKey]);

  const validateAndFormat = useCallback((): Record<string, unknown> | null => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(draft);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Invalid JSON");
      return null;
    }
    if (!parsed || typeof parsed !== "object") {
      setParseError("Root must be an object");
      return null;
    }
    const o = parsed as Record<string, unknown>;
    if (!o.mcpServers || typeof o.mcpServers !== "object") {
      setParseError('Missing "mcpServers" object');
      return null;
    }
    setParseError(null);
    return o;
  }, [draft]);

  const handleFormat = () => {
    const o = validateAndFormat();
    if (!o) return;
    setDraft(JSON.stringify(o, null, 2));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleEnableAllForProject = async () => {
    const uid = await getCachedGithubUserId();
    if (uid == null) {
      Alert.alert("Sign in", "GitHub sign-in is required to save MCP settings.");
      return;
    }
    const next = { ...useStore.getState().mcpRepoPolicy };
    next[repoKey] = [...serverNames];
    useStore.getState().setMcpRepoPolicy(next);
    await saveMcpPolicyForUser(uid, next);
    syncMcpRuntimeConfigToBridge();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSave = async () => {
    const o = validateAndFormat();
    if (!o) {
      Alert.alert("Invalid JSON", parseError || "Fix errors before saving.");
      return;
    }
    const uid = await getCachedGithubUserId();
    if (uid == null) {
      Alert.alert("Sign in", "GitHub sign-in is required to save MCP settings.");
      return;
    }
    const next = JSON.stringify(o, null, 2);
    setMcpCatalogJson(next);
    await saveMcpCatalogForUser(uid, next);
    const policy = useStore.getState().mcpRepoPolicy;
    await saveMcpPolicyForUser(uid, policy);
    syncMcpRuntimeConfigToBridge();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "MCP servers",
          headerShown: true,
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: fonts.sansSemiBold },
        }}
      />
      <Animated.View style={[styles.root, rootAnimatedStyle]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{
            paddingBottom: insets.bottom + spacing.xl,
            paddingHorizontal: spacing.md,
            paddingTop: spacing.md,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.hint}>
            Servers are enabled per project. New projects start with all servers off.
          </Text>

          <View style={styles.rowBtns}>
            <TouchableOpacity style={styles.chip} onPress={handleFormat}>
              <Text style={styles.chipText}>Format</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.chipPrimary}
              onPress={() => void handleSave()}
            >
              <Text style={styles.chipPrimaryText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.chip}
              onPress={() => setDraft(getDefaultMcpCatalogJson())}
            >
              <Text style={styles.chipText}>Reset template</Text>
            </TouchableOpacity>
          </View>

          {serverNames.length > 0 ? (
            <TouchableOpacity
              style={[styles.chip, { marginBottom: spacing.md }]}
              onPress={() => void handleEnableAllForProject()}
            >
              <Text style={styles.chipText}>Enable all for this project</Text>
            </TouchableOpacity>
          ) : null}

          {parseError ? <Text style={styles.error}>{parseError}</Text> : null}

          <View style={{ marginBottom: spacing.lg }}>
            <McpCatalogEditor
              value={draft}
              onChangeText={setDraft}
              codeFontSize={codeFontSizeValues[codeFontSize]}
              minHeight={260}
            />
          </View>

          <Text style={styles.sectionTitle}>Enabled for this project</Text>
          {serverNames.length === 0 ? (
            <Text style={styles.hint}>
              Add servers above to enable them here.
            </Text>
          ) : (
            serverNames.map((name) => (
              <View key={name} style={styles.toggleRow}>
                <Text style={styles.toggleName} numberOfLines={1}>
                  {name}
                </Text>
                <Switch
                  value={enabledSet.has(name)}
                  onValueChange={(v) => {
                    setMcpServerEnabledForCurrentRepo(name, v);
                    void (async () => {
                      const uid = await getCachedGithubUserId();
                      if (uid != null) {
                        await saveMcpPolicyForUser(
                          uid,
                          useStore.getState().mcpRepoPolicy
                        );
                      }
                      syncMcpRuntimeConfigToBridge();
                    })();
                  }}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={colors.surfaceLight}
                />
              </View>
            ))
          )}
        </ScrollView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: { flex: 1 },
  hint: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  rowBtns: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  chipPrimary: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
  },
  chipPrimaryText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.sm,
    color: colors.bg,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toggleName: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.text,
    marginRight: spacing.md,
  },
});
