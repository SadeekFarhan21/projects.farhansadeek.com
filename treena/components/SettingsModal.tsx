import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Modal,
  Pressable,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { colors, fonts, fontSize, spacing, radii } from "@/constants/theme";
import { useStore, type TerminalFontSizeOption, type McpServerInfo } from "@/store";
import { signOutAndGoToLogin } from "@/lib/signOut";
import {
  requestMcpRefresh,
  subscribeRemoteConnection,
  getRemoteWsReadyState,
} from "@/lib/workspace/remoteWsBridge";
import {
  listMcpCatalogServerNames,
  syncMcpRuntimeConfigToBridge,
} from "@/lib/mcpBridgeSync";
import { getMcpPolicyRepoKey } from "@/lib/mcpRepoKey";
import {
  getCachedGithubUserId,
  saveMcpPolicyForUser,
} from "@/lib/mcpLocalPersistence";
import {
  fetchTreenaBranches,
  deleteTreenaBranches,
  type TreenaBranch,
} from "@/lib/githubBranches";

export default function SettingsModal() {
  const settingsOpen = useStore((s) => s.settingsOpen);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const autoSaveBranchOnSessionEnd = useStore(
    (s) => s.autoSaveBranchOnSessionEnd
  );
  const setAutoSaveBranchOnSessionEnd = useStore(
    (s) => s.setAutoSaveBranchOnSessionEnd
  );
  const terminalFontSize = useStore((s) => s.terminalFontSize);
  const setTerminalFontSize = useStore((s) => s.setTerminalFontSize);
  const mcpServers = useStore((s) => s.mcpServers);
  const mcpCatalogJson = useStore((s) => s.mcpCatalogJson);
  const mcpRepoPolicy = useStore((s) => s.mcpRepoPolicy);
  const setMcpServerEnabledForCurrentRepo = useStore(
    (s) => s.setMcpServerEnabledForCurrentRepo
  );
  const remoteWorkspaceEnabled = useStore((s) => s.remoteWorkspaceEnabled);
  const remoteWorkspaceWsUrl = useStore((s) => s.remoteWorkspaceWsUrl);
  const cloudSessionRepoUrl = useStore((s) => s.cloudSessionRepoUrl);
  const cloudSessionGithubRepoId = useStore((s) => s.cloudSessionGithubRepoId);
  const repoName = useStore((s) => s.repoName);
  const [expandedMcp, setExpandedMcp] = useState<string | null>(null);
  const [bridgeSocketOpen, setBridgeSocketOpen] = useState(
    () => getRemoteWsReadyState() === WebSocket.OPEN
  );

  // Phase 3E (M4): cloud session storage cleanup state.
  const githubToken = useStore((s) => s.githubToken);
  const [branches, setBranches] = useState<TreenaBranch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchesError, setBranchesError] = useState<string | null>(null);
  const [ageFilter, setAgeFilter] = useState<"all" | "30d" | "90d">("30d");
  const [deletingBranches, setDeletingBranches] = useState(false);
  const insets = useSafeAreaInsets();

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

  const enabledSet = useMemo(() => {
    const pol = mcpRepoPolicy[repoKey];
    if (pol === undefined) return new Set<string>();
    return new Set(pol);
  }, [mcpRepoPolicy, repoKey]);

  const handleToggleMcp = useCallback(
    (name: string, next: boolean) => {
      setMcpServerEnabledForCurrentRepo(name, next);
      void (async () => {
        const uid = await getCachedGithubUserId();
        if (uid != null) {
          await saveMcpPolicyForUser(uid, useStore.getState().mcpRepoPolicy);
        }
        syncMcpRuntimeConfigToBridge();
      })();
    },
    [setMcpServerEnabledForCurrentRepo]
  );

  useEffect(() => {
    if (!remoteWorkspaceEnabled) {
      setBridgeSocketOpen(false);
      return;
    }
    setBridgeSocketOpen(getRemoteWsReadyState() === WebSocket.OPEN);
    return subscribeRemoteConnection((e) => {
      setBridgeSocketOpen(e.kind === "open");
    });
  }, [remoteWorkspaceEnabled]);

  const pickTerminalFont = (size: TerminalFontSizeOption) => {
    setTerminalFontSize(size);
    void SecureStore.setItemAsync("terminal_font_size", size);
  };

  // Phase 3E (M4): scan the user's repos for treena/* auto-save branches when
  // the settings sheet opens. Skips silently if there's no GitHub token yet.
  const refreshBranches = useCallback(async () => {
    if (!githubToken) return;
    setLoadingBranches(true);
    setBranchesError(null);
    try {
      const list = await fetchTreenaBranches(githubToken);
      setBranches(list);
    } catch (e) {
      setBranchesError(e instanceof Error ? e.message : "Failed to list branches");
    } finally {
      setLoadingBranches(false);
    }
  }, [githubToken]);

  useEffect(() => {
    if (settingsOpen) void refreshBranches();
  }, [settingsOpen, refreshBranches]);

  const branchAgeStats = useMemo(() => {
    const now = Date.now();
    let total = 0;
    let d30 = 0;
    let d90 = 0;
    for (const b of branches) {
      total++;
      const age = b.date ? now - b.date.getTime() : 0;
      if (age >= 30 * 86400_000) d30++;
      if (age >= 90 * 86400_000) d90++;
    }
    return { total, d30, d90 };
  }, [branches]);

  const branchesMatchingFilter = useMemo(() => {
    if (ageFilter === "all") return branches;
    const cutoff = ageFilter === "30d" ? 30 : 90;
    const now = Date.now();
    return branches.filter(
      (b) => b.date && now - b.date.getTime() >= cutoff * 86400_000
    );
  }, [branches, ageFilter]);

  const repoCount = useMemo(() => {
    const s = new Set<string>();
    for (const b of branches) s.add(b.repoFullName);
    return s.size;
  }, [branches]);

  const handleDeleteBranches = useCallback(() => {
    if (!githubToken) return;
    const list = branchesMatchingFilter;
    if (list.length === 0) return;
    const SAMPLE_LIMIT = 10;
    const sample = list
      .slice(0, SAMPLE_LIMIT)
      .map((b) => `• ${b.repoFullName} ${b.branchName}`)
      .join("\n");
    const more = list.length > SAMPLE_LIMIT
      ? `\n+ ${list.length - SAMPLE_LIMIT} more`
      : "";
    const ageLabel =
      ageFilter === "all"
        ? "all auto-save branches"
        : `auto-save branches older than ${ageFilter === "30d" ? "30" : "90"} days`;
    Alert.alert(
      `Delete ${list.length} ${list.length === 1 ? "branch" : "branches"}?`,
      `This will permanently delete ${ageLabel} from GitHub. Only branches matching the treena/<date>-<id> pattern are affected.\n\n${sample}${more}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: `Delete ${list.length}`,
          style: "destructive",
          onPress: () => {
            void (async () => {
              setDeletingBranches(true);
              try {
                const { failed } = await deleteTreenaBranches(githubToken, list);
                if (failed.length > 0) {
                  Alert.alert(
                    "Some deletions failed",
                    `${failed.length} branch${failed.length === 1 ? "" : "es"} could not be deleted (rate limit or permissions). The rest were removed.`
                  );
                }
              } finally {
                setDeletingBranches(false);
                await refreshBranches();
              }
            })();
          },
        },
      ]
    );
  }, [githubToken, branchesMatchingFilter, ageFilter, refreshBranches]);

  const handleSignOut = () => {
    Alert.alert(
      "Sign out",
      "You'll be signed out and taken back to the login screen.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: () => void signOutAndGoToLogin(),
        },
      ]
    );
  };

  return (
    <Modal
      visible={settingsOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setSettingsOpen(false)}
    >
      <Pressable
        style={styles.backdrop}
        onPress={() => setSettingsOpen(false)}
      >
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingBottom: spacing.lg + Math.max(insets.bottom, 0),
            }}
          >
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Terminal</Text>
              <View style={styles.fontSizeRow}>
                {(
                  [
                    ["small", "Small"],
                    ["medium", "Medium"],
                    ["large", "Large"],
                  ] as const
                ).map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.fontSizeChip,
                      terminalFontSize === key && styles.fontSizeChipActive,
                    ]}
                    onPress={() => pickTerminalFont(key)}
                  >
                    <Text
                      style={[
                        styles.fontSizeChipText,
                        terminalFontSize === key && styles.fontSizeChipTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Cloud workspace</Text>
              <View style={styles.row}>
                <View style={styles.rowTextWrap}>
                  <Text style={styles.rowTitle}>Auto-save branch on session end</Text>
                  <Text style={styles.rowHint}>
                    On session end, commit and push to a dated{" "}
                    <Text style={{ fontFamily: fonts.mono, fontSize: fontSize.xs }}>treena/…</Text>{" "}
                    branch.
                  </Text>
                </View>
                <Switch
                  value={autoSaveBranchOnSessionEnd}
                  onValueChange={setAutoSaveBranchOnSessionEnd}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={colors.surfaceLight}
                />
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.mcpHeader}>
                <Text style={styles.sectionLabel}>Cloud session storage</Text>
                <TouchableOpacity
                  onPress={() => void refreshBranches()}
                  hitSlop={12}
                  disabled={loadingBranches || deletingBranches}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={16}
                    color={
                      loadingBranches || deletingBranches
                        ? colors.textMuted
                        : colors.textSecondary
                    }
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.rowHint}>
                Auto-save branches Treena pushed to GitHub on session end. Cleanup
                only touches branches matching{" "}
                <Text style={{ fontFamily: fonts.mono, fontSize: fontSize.xs }}>
                  treena/&lt;date&gt;-&lt;id&gt;
                </Text>
                .
              </Text>

              {loadingBranches ? (
                <View style={styles.branchLoadingRow}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={styles.branchLoadingText}>Scanning your repos…</Text>
                </View>
              ) : branchesError ? (
                <Text style={[styles.rowHint, { color: colors.error }]}>
                  {branchesError}
                </Text>
              ) : branches.length === 0 ? (
                <Text style={styles.rowHint}>
                  No auto-save branches found in your repos.
                </Text>
              ) : (
                <>
                  <Text style={styles.branchSummary}>
                    {branchAgeStats.total}{" "}
                    {branchAgeStats.total === 1 ? "branch" : "branches"} across{" "}
                    {repoCount} {repoCount === 1 ? "repo" : "repos"}
                    {branchAgeStats.d30 > 0
                      ? ` · ${branchAgeStats.d30} older than 30 days`
                      : ""}
                  </Text>

                  <View style={styles.fontSizeRow}>
                    {(
                      [
                        ["all", "All"],
                        ["30d", "30d+"],
                        ["90d", "90d+"],
                      ] as const
                    ).map(([key, label]) => (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.fontSizeChip,
                          ageFilter === key && styles.fontSizeChipActive,
                        ]}
                        onPress={() => setAgeFilter(key)}
                      >
                        <Text
                          style={[
                            styles.fontSizeChipText,
                            ageFilter === key && styles.fontSizeChipTextActive,
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.signOutBtn,
                      { marginTop: spacing.md },
                      (branchesMatchingFilter.length === 0 ||
                        deletingBranches) &&
                        styles.deleteBranchesBtnDisabled,
                    ]}
                    onPress={handleDeleteBranches}
                    disabled={
                      branchesMatchingFilter.length === 0 || deletingBranches
                    }
                  >
                    {deletingBranches ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.error}
                        style={{ marginRight: 8 }}
                      />
                    ) : (
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={
                          branchesMatchingFilter.length === 0
                            ? colors.textMuted
                            : colors.error
                        }
                        style={{ marginRight: 8 }}
                      />
                    )}
                    <Text
                      style={[
                        styles.signOutText,
                        branchesMatchingFilter.length === 0 && {
                          color: colors.textMuted,
                        },
                      ]}
                    >
                      {deletingBranches
                        ? "Deleting…"
                        : branchesMatchingFilter.length === 0
                          ? "Nothing to delete"
                          : `Delete ${branchesMatchingFilter.length} ${branchesMatchingFilter.length === 1 ? "branch" : "branches"}`}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {remoteWorkspaceEnabled && (
              <McpSection
                mcpCatalogJson={mcpCatalogJson}
                mcpServers={mcpServers}
                bridgeSocketOpen={bridgeSocketOpen}
                expandedMcp={expandedMcp}
                setExpandedMcp={setExpandedMcp}
                onOpenMcpEditor={() => setSettingsOpen(false)}
                enabledSet={enabledSet}
                onToggleMcp={handleToggleMcp}
              />
            )}

            <View style={styles.section}>
              <TouchableOpacity
                style={styles.signOutBtn}
                onPress={handleSignOut}
              >
                <Ionicons
                  name="log-out-outline"
                  size={18}
                  color={colors.error}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.signOutText}>Sign out</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function McpSection({
  mcpCatalogJson,
  mcpServers,
  bridgeSocketOpen,
  expandedMcp,
  setExpandedMcp,
  onOpenMcpEditor,
  enabledSet,
  onToggleMcp,
}: {
  mcpCatalogJson: string;
  mcpServers: Record<string, McpServerInfo>;
  bridgeSocketOpen: boolean;
  expandedMcp: string | null;
  setExpandedMcp: (name: string | null) => void;
  onOpenMcpEditor: () => void;
  enabledSet: Set<string>;
  onToggleMcp: (name: string, next: boolean) => void;
}) {
  const catalogNames = listMcpCatalogServerNames(mcpCatalogJson);
  const catalogSet = new Set(catalogNames);
  const bridgeNames = Object.keys(mcpServers);
  const allNames = [...new Set([...catalogNames, ...bridgeNames])].sort();
  const showDisconnectedNote = !bridgeSocketOpen && allNames.length > 0;

  return (
    <View style={styles.section}>
      <View style={styles.mcpHeader}>
        <Text style={styles.sectionLabel}>MCP Servers</Text>
        <TouchableOpacity onPress={requestMcpRefresh} hitSlop={12}>
          <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.mcpEditLink}
        onPress={() => {
          onOpenMcpEditor();
          router.push("/mcp-settings");
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.mcpEditLinkText}>Edit MCP servers</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.accent} />
      </TouchableOpacity>
      {showDisconnectedNote ? (
        <Text style={styles.rowHint}>
          Workspace disconnected — live MCP status unavailable.
        </Text>
      ) : null}
      {allNames.length === 0 ? (
        <Text style={styles.rowHint}>
          No MCP servers configured.
        </Text>
      ) : (
        allNames.map((name) => {
          const server = mcpServers[name];
          const isExpanded = expandedMcp === name;
          const inCatalog = catalogSet.has(name);
          const enabled = enabledSet.has(name);

          let dotColor: string;
          let statusText: string;
          if (!enabled) {
            dotColor = colors.textMuted;
            statusText = "Disabled";
          } else if (!server) {
            dotColor = colors.textMuted;
            statusText = bridgeSocketOpen ? "Connecting…" : "Not connected";
          } else {
            dotColor =
              server.status === "connected"
                ? colors.success
                : server.status === "starting"
                  ? colors.warning
                  : colors.error;
            statusText = `${server.tools.length} tool${server.tools.length === 1 ? "" : "s"}`;
          }

          const expandable = enabled && !!server;

          return (
            <View key={name}>
              <View style={styles.mcpRow}>
                <TouchableOpacity
                  style={styles.mcpRowMain}
                  onPress={() =>
                    expandable && setExpandedMcp(isExpanded ? null : name)
                  }
                  activeOpacity={expandable ? 0.7 : 1}
                >
                  <View
                    style={[styles.mcpDot, { backgroundColor: dotColor }]}
                  />
                  <Text style={styles.mcpName} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={styles.mcpToolCount}>{statusText}</Text>
                  {expandable ? (
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={colors.textMuted}
                    />
                  ) : null}
                </TouchableOpacity>
                {inCatalog ? (
                  <Switch
                    value={enabled}
                    onValueChange={(v) => onToggleMcp(name, v)}
                    trackColor={{ false: colors.border, true: colors.accent }}
                    thumbColor={colors.surfaceLight}
                    style={styles.mcpSwitch}
                  />
                ) : null}
              </View>
              {enabled && server?.error ? (
                <Text style={styles.mcpError} numberOfLines={2}>
                  {server.error}
                </Text>
              ) : null}
              {isExpanded && server
                ? server.tools.map((tool) => (
                    <View key={tool.namespacedName} style={styles.mcpToolRow}>
                      <Text style={styles.mcpToolName} numberOfLines={1}>
                        {tool.name}
                      </Text>
                      <Text style={styles.mcpToolDesc} numberOfLines={2}>
                        {tool.description}
                      </Text>
                    </View>
                  ))
                : null}
            </View>
          );
        })
      )}
    </View>
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
    maxHeight: "85%",
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  section: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  sectionLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowTextWrap: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.md,
    color: colors.text,
  },
  rowHint: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  signOutText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.md,
    color: colors.error,
  },
  branchLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.sm,
  },
  branchLoadingText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  branchSummary: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    color: colors.text,
    marginTop: spacing.sm,
  },
  deleteBranchesBtnDisabled: {
    borderColor: colors.textMuted,
  },
  fontSizeRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  fontSizeChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  fontSizeChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + "22",
  },
  fontSizeChipText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  fontSizeChipTextActive: {
    color: colors.accent,
  },
  mcpEditLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mcpEditLinkText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    color: colors.accent,
  },
  mcpHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  mcpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  mcpRowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  mcpSwitch: {
    marginLeft: spacing.sm,
  },
  mcpDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mcpName: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  mcpToolCount: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  mcpError: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors.error,
    marginLeft: 16,
    marginBottom: spacing.xs,
  },
  mcpToolRow: {
    paddingLeft: 20,
    paddingVertical: 4,
  },
  mcpToolName: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.accent,
  },
  mcpToolDesc: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
});
