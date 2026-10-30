import { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  LayoutAnimation,
  Alert,
} from "react-native";
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, fonts, fontSize, spacing, radii } from "@/constants/theme";
import { useStore } from "@/store";
import { useCloudSession } from "@/hooks/useCloudSession";
import {
  fetchGithubRepos,
  GithubRepo,
  listCloudSessions,
  destroyCloudSession,
  CloudSessionListItem,
  CloudSessionLimitError,
} from "@/lib/cloudSession";
import {
  fetchRepoBranches,
  parseTreenaBranchDate,
} from "@/lib/githubBranches";
import { signOutAndGoToLogin } from "@/lib/signOut";
import { isFlyMode, triggerRepoOpen } from "@/lib/userMachine";
import { router } from "expo-router";

const ACTIVE_STATUSES = new Set(["provisioning", "ready"]);

type OrderedBranch = {
  name: string;
  pin: "default" | "autosaved" | null;
  autosavedDaysAgo?: number;
};

type BranchEntry =
  | { status: "loading" }
  | { status: "ready"; ordered: OrderedBranch[] }
  | { status: "error"; error: string };

function formatDaysAgo(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

function buildOrderedBranches(
  names: string[],
  defaultBranch: string
): OrderedBranch[] {
  let mostRecentTreena: { name: string; date: Date } | null = null;
  for (const n of names) {
    const d = parseTreenaBranchDate(n);
    if (!d) continue;
    if (
      !mostRecentTreena ||
      d.getTime() > mostRecentTreena.date.getTime()
    ) {
      mostRecentTreena = { name: n, date: d };
    }
  }

  const pinned = new Set<string>();
  const out: OrderedBranch[] = [];

  if (defaultBranch && names.includes(defaultBranch)) {
    out.push({ name: defaultBranch, pin: "default" });
    pinned.add(defaultBranch);
  }
  if (mostRecentTreena && !pinned.has(mostRecentTreena.name)) {
    const days = Math.max(
      0,
      Math.floor((Date.now() - mostRecentTreena.date.getTime()) / 86_400_000)
    );
    out.push({
      name: mostRecentTreena.name,
      pin: "autosaved",
      autosavedDaysAgo: days,
    });
    pinned.add(mostRecentTreena.name);
  }

  const rest = names
    .filter((n) => !pinned.has(n))
    .sort((a, b) => a.localeCompare(b))
    .map((name): OrderedBranch => ({ name, pin: null }));

  return [...out, ...rest];
}

export default function ProjectsScreen() {
  const insets = useSafeAreaInsets();
  const githubToken = useStore((s) => s.githubToken);
  const cloudApiBaseUrl = useStore((s) => s.cloudApiBaseUrl);
  const cloudSessionStatus = useStore((s) => s.cloudSessionStatus);
  const cloudSessionError = useStore((s) => s.cloudSessionError);

  const { startSession } = useCloudSession();

  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [reposError, setReposError] = useState("");
  const [search, setSearch] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [sessions, setSessions] = useState<CloudSessionListItem[]>([]);
  // Cached for the screen's lifetime — reuses across collapse/expand cycles.
  // If pull-to-refresh is added later, clear this alongside repos.
  const [expandedRepoIds, setExpandedRepoIds] = useState<Set<number>>(
    () => new Set()
  );
  const [branchesByRepo, setBranchesByRepo] = useState<
    Record<number, BranchEntry>
  >({});

  const keyboard = useAnimatedKeyboard();
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    marginBottom: keyboard.height.value,
  }));

  useEffect(() => {
    if (!githubToken) return;
    setLoadingRepos(true);
    setReposError("");
    fetchGithubRepos(githubToken)
      .then(setRepos)
      .catch((err) => setReposError(err.message))
      .finally(() => setLoadingRepos(false));
  }, [githubToken]);

  // Phase 3C: fetch active + recent sessions to render pills on repo cards.
  const refreshSessions = useCallback(async () => {
    if (!githubToken || !cloudApiBaseUrl) return;
    try {
      const list = await listCloudSessions(cloudApiBaseUrl, githubToken);
      setSessions(list);
    } catch {
      // Best-effort. The projects screen still works without session pills.
    }
  }, [githubToken, cloudApiBaseUrl]);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  // Phase 3C: index sessions by repoUrl so renderRepo can pick the most-recent
  // one per card in O(1).
  const sessionsByRepoUrl = useMemo(() => {
    const m = new Map<string, CloudSessionListItem>();
    for (const s of sessions) {
      if (!s.repoUrl) continue;
      const prev = m.get(s.repoUrl);
      if (!prev || s.createdAt > prev.createdAt) m.set(s.repoUrl, s);
    }
    return m;
  }, [sessions]);

  const filtered = useMemo(() => {
    if (!search.trim()) return repos;
    const q = search.toLowerCase();
    return repos.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  }, [repos, search]);

  const isProvisioning = cloudSessionStatus === "provisioning";

  const provisionWithLimitHandling = useCallback(
    async (repoUrl: string | null, branch: string | null) => {
      // Day 6.2 — Fly path: bypass session/concurrent-limit machinery entirely.
      // The user has one persistent machine; opening a repo just records state +
      // triggers the bridge's setup.run RPC. Drawer in app/index.tsx renders
      // progress from the store-backed listener. router.replace navigates to
      // the IDE immediately; the prep drawer overlays editor while clone+install
      // run.
      if (isFlyMode()) {
        const resp = await triggerRepoOpen(repoUrl ?? "", branch ?? null);
        if (!resp) {
          const errMsg = useStore.getState().repoSetupError;
          Alert.alert(
            "Failed to open repo",
            errMsg || "Could not start workspace setup. Try again."
          );
          return;
        }
        router.replace("/");
        return;
      }

      try {
        await startSession(repoUrl, branch);
      } catch (err) {
        if (!(err instanceof CloudSessionLimitError)) {
          // Non-limit errors are already reflected in cloudSessionStatus="failed";
          // nothing more to do here.
          return;
        }
        // Phase 3D: smart concurrent-session cap. Show "End [oldest] to start
        // [new]?" instead of the raw 429.
        const oldest = err.activeSessions
          .slice()
          .sort((a, b) => a.createdAt - b.createdAt)[0];
        if (!oldest || !cloudApiBaseUrl || !githubToken) return;
        const oldestLabel = oldest.repoUrl
          ? oldest.repoUrl.replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, "")
          : "an empty workspace";
        const newLabel = repoUrl
          ? repoUrl.replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, "")
          : "a new empty workspace";
        await new Promise<void>((resolve) => {
          Alert.alert(
            "Active session limit",
            `You already have ${err.activeSessions.length} active sessions. End the oldest (${oldestLabel}) to start ${newLabel}?`,
            [
              { text: "Cancel", style: "cancel", onPress: () => resolve() },
              {
                text: "End oldest & start new",
                style: "destructive",
                onPress: () => {
                  void (async () => {
                    try {
                      await destroyCloudSession(
                        cloudApiBaseUrl,
                        githubToken,
                        oldest.sessionId
                      );
                      await refreshSessions();
                      await startSession(repoUrl, branch);
                    } catch {
                      /* the start path already surfaces failures */
                    } finally {
                      resolve();
                    }
                  })();
                },
              },
            ]
          );
        });
      }
    },
    [startSession, cloudApiBaseUrl, githubToken, refreshSessions]
  );

  const loadBranchesFor = useCallback(
    async (repo: GithubRepo) => {
      if (!githubToken) return;
      setBranchesByRepo((prev) => ({
        ...prev,
        [repo.id]: { status: "loading" },
      }));
      try {
        const names = await fetchRepoBranches(githubToken, repo.full_name);
        const ordered = buildOrderedBranches(names, repo.default_branch);
        setBranchesByRepo((prev) => ({
          ...prev,
          [repo.id]: { status: "ready", ordered },
        }));
      } catch (e) {
        setBranchesByRepo((prev) => ({
          ...prev,
          [repo.id]: {
            status: "error",
            error:
              e instanceof Error ? e.message : "Failed to load branches",
          },
        }));
      }
    },
    [githubToken]
  );

  const toggleRepoExpanded = useCallback(
    (repo: GithubRepo) => {
      Haptics.selectionAsync();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedRepoIds((prev) => {
        const next = new Set(prev);
        if (next.has(repo.id)) {
          next.delete(repo.id);
        } else {
          next.add(repo.id);
          const cached = branchesByRepo[repo.id];
          if (!cached || cached.status === "error") {
            void loadBranchesFor(repo);
          }
        }
        return next;
      });
    },
    [branchesByRepo, loadBranchesFor]
  );

  const handleCloneDefault = useCallback(
    (repo: GithubRepo) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      void provisionWithLimitHandling(repo.clone_url, null);
    },
    [provisionWithLimitHandling]
  );

  const handleCloneBranch = useCallback(
    (repo: GithubRepo, branch: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      void provisionWithLimitHandling(repo.clone_url, branch);
    },
    [provisionWithLimitHandling]
  );

  const handleCloneUrl = () => {
    if (!manualUrl.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void provisionWithLimitHandling(manualUrl.trim(), null);
  };

  const handleNewEmpty = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void provisionWithLimitHandling(null, null);
  };

  const handleSignOutPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const statusMessage =
    cloudSessionStatus === "provisioning"
      ? "Starting container..."
      : cloudSessionStatus === "failed"
        ? cloudSessionError || "Failed"
        : null;

  const renderRepo = ({ item }: { item: GithubRepo }) => {
    const session = sessionsByRepoUrl.get(item.clone_url);
    const isActive = session && ACTIVE_STATUSES.has(session.status);
    const isExpanded = expandedRepoIds.has(item.id);
    const branchEntry = branchesByRepo[item.id];

    return (
      <View style={styles.repoCard}>
        <View style={styles.repoRow}>
          <TouchableOpacity
            style={styles.repoBody}
            onPress={() => toggleRepoExpanded(item)}
            disabled={isProvisioning}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${item.full_name}, ${
              isExpanded ? "collapse" : "expand"
            } branches`}
          >
            <View style={styles.repoInfo}>
              <View style={styles.repoNameRow}>
                <Ionicons
                  name={item.private ? "lock-closed" : "globe-outline"}
                  size={14}
                  color={colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.repoName} numberOfLines={1}>
                  {item.full_name}
                </Text>
                {isActive ? (
                  <View style={styles.pillActive}>
                    <View style={styles.pillDotActive} />
                    <Text style={styles.pillTextActive}>active</Text>
                  </View>
                ) : null}
              </View>
              {item.description ? (
                <Text style={styles.repoDesc} numberOfLines={1}>
                  {item.description}
                </Text>
              ) : null}
              <View style={styles.repoMeta}>
                {item.language ? (
                  <Text style={styles.repoLang}>{item.language}</Text>
                ) : null}
              </View>
            </View>
            <Ionicons
              name={isExpanded ? "chevron-down" : "chevron-forward"}
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cloneCircleBtn}
            onPress={() => handleCloneDefault(item)}
            disabled={isProvisioning}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Clone ${item.full_name} from ${item.default_branch}`}
          >
            <Ionicons
              name="arrow-forward"
              size={18}
              color={colors.accentText}
            />
          </TouchableOpacity>
        </View>

        {isExpanded ? (
          <View style={styles.branchPanel}>
            {!branchEntry || branchEntry.status === "loading" ? (
              <View style={styles.branchLoading}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={styles.branchLoadingText}>
                  Loading branches...
                </Text>
              </View>
            ) : branchEntry.status === "error" ? (
              <View style={styles.branchError}>
                <Ionicons
                  name="alert-circle"
                  size={14}
                  color={colors.error}
                />
                <Text style={styles.branchErrorText} numberOfLines={2}>
                  {branchEntry.error}
                </Text>
                <TouchableOpacity
                  onPress={() => void loadBranchesFor(item)}
                  hitSlop={8}
                >
                  <Text style={styles.branchRetryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : branchEntry.ordered.length === 0 ? (
              <Text style={styles.branchEmpty}>No branches found</Text>
            ) : (
              branchEntry.ordered.map((b) => (
                <TouchableOpacity
                  key={b.name}
                  style={styles.branchRow}
                  onPress={() => handleCloneBranch(item, b.name)}
                  disabled={isProvisioning}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Clone branch ${b.name}`}
                >
                  <Ionicons
                    name="git-branch-outline"
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.branchName} numberOfLines={1}>
                    {b.name}
                  </Text>
                  {b.pin === "default" ? (
                    <View style={styles.branchDefaultPill}>
                      <Text style={styles.branchDefaultPillText}>
                        default
                      </Text>
                    </View>
                  ) : b.pin === "autosaved" ? (
                    <View style={styles.branchAutoSavedPill}>
                      <Text style={styles.branchAutoSavedPillText}>
                        auto-saved {formatDaysAgo(b.autosavedDaysAgo ?? 0)}
                      </Text>
                    </View>
                  ) : null}
                  <Ionicons
                    name="arrow-forward"
                    size={14}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerTextBlock}>
          <Text style={styles.title}>Your Projects</Text>
          <Text style={styles.subtitle}>
            Select a repository to start coding
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleSignOutPress}
          hitSlop={12}
          style={styles.signOutIconBtn}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Ionicons name="log-out-outline" size={22} color={colors.error} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={16}
          color={colors.textMuted}
          style={{ marginRight: spacing.sm }}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search repos..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Status banner */}
      {statusMessage ? (
        <View
          style={[
            styles.statusBanner,
            cloudSessionStatus === "failed" && styles.statusBannerError,
          ]}
        >
          {isProvisioning ? (
            <ActivityIndicator
              size="small"
              color={colors.accent}
              style={{ marginRight: spacing.sm }}
            />
          ) : (
            <Ionicons
              name="alert-circle"
              size={16}
              color={colors.error}
              style={{ marginRight: spacing.sm }}
            />
          )}
          <Text
            style={[
              styles.statusText,
              cloudSessionStatus === "failed" && styles.statusTextError,
            ]}
          >
            {statusMessage}
          </Text>
        </View>
      ) : null}

      {/* Repo list */}
      {loadingRepos ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading repositories...</Text>
        </View>
      ) : reposError ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle" size={32} color={colors.error} />
          <Text style={styles.errorText}>{reposError}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderRepo}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {search ? "No matching repos" : "No repositories found"}
            </Text>
          }
        />
      )}

      {/* Bottom actions */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + spacing.md }]}>
        {showUrlInput ? (
          <View style={styles.urlInputRow}>
            <TextInput
              style={styles.urlInput}
              placeholder="https://github.com/user/repo.git"
              placeholderTextColor={colors.textMuted}
              value={manualUrl}
              onChangeText={setManualUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.goBtn}
              onPress={handleCloneUrl}
              disabled={isProvisioning || !manualUrl.trim()}
            >
              <Ionicons name="arrow-forward" size={18} color={colors.accentText} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => setShowUrlInput(true)}
            disabled={isProvisioning}
          >
            <Ionicons
              name="link"
              size={16}
              color={colors.textSecondary}
              style={{ marginRight: spacing.sm }}
            />
            <Text style={styles.secondaryBtnText}>Clone from URL</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={handleNewEmpty}
          disabled={isProvisioning}
        >
          <Ionicons
            name="add-circle-outline"
            size={16}
            color={colors.textSecondary}
            style={{ marginRight: spacing.sm }}
          />
          <Text style={styles.secondaryBtnText}>New Empty Project</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  headerTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  signOutIconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    backgroundColor: colors.labelBg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    borderWidth: 1,
    borderColor: colors.error,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.xxl,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.text,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  statusBannerError: {
    borderColor: colors.error,
  },
  statusText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    color: colors.accent,
    flex: 1,
  },
  statusTextError: {
    color: colors.error,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xxl,
  },
  loadingText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
  errorText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.error,
    marginTop: spacing.md,
    textAlign: "center",
  },
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xxxl,
  },
  listContent: {
    paddingHorizontal: spacing.xxl,
  },
  repoCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  repoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  repoBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: spacing.md,
  },
  cloneCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  branchPanel: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  branchLoading: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  branchLoadingText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  branchError: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  branchErrorText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  branchRetryText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.sm,
    color: colors.accent,
  },
  branchEmpty: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  branchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceLight,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  branchName: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  branchDefaultPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
    backgroundColor: colors.labelBg,
  },
  branchDefaultPillText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  branchAutoSavedPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
    backgroundColor: "rgba(0, 230, 118, 0.12)",
    borderWidth: 1,
    borderColor: colors.accent,
  },
  branchAutoSavedPillText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors.accent,
  },
  repoInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  repoNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  repoName: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  repoDesc: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 3,
  },
  repoMeta: {
    flexDirection: "row",
    marginTop: 4,
  },
  repoLang: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  pillActive: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: "rgba(0, 230, 118, 0.12)",
    borderWidth: 1,
    borderColor: colors.accent,
  },
  pillDotActive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginRight: 4,
  },
  pillTextActive: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors.accent,
  },
  bottomActions: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
  },
  secondaryBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  urlInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  urlInput: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  goBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
});
