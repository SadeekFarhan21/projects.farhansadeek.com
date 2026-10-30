/**
 * Repo setup prep UI — slide-up drawer shown while clone + install run on the
 * bridge container. Day 4 ships a minimal functional version: status line,
 * phase indicator, error surfacing. Full polish (drag handle, animated
 * progress bar parsed from npm output, scroll-aware reveal) is a follow-up.
 *
 * Visible only when EXPO_PUBLIC_USE_FLY=true and the caller has triggered
 * useRepoSetup.openRepo at least once. Renders nothing in idle/ready states.
 */
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, fontSize, spacing, radii } from "@/constants/theme";
import type { RepoSetupPhase } from "@/hooks/useRepoSetup";

interface Props {
  phase: RepoSetupPhase;
  message: string;
  error: string | null;
  onDismiss?: () => void;
  onRetry?: () => void;
}

const PHASE_LABEL: Record<RepoSetupPhase, string> = {
  idle: "",
  unset: "Preparing",
  cloning: "Cloning repo",
  installing: "Installing dependencies",
  ready: "Ready",
  failed: "Setup failed",
};

const PHASE_ICON: Record<RepoSetupPhase, keyof typeof Ionicons.glyphMap> = {
  idle: "hourglass-outline",
  unset: "hourglass-outline",
  cloning: "cloud-download-outline",
  installing: "cube-outline",
  ready: "checkmark-circle-outline",
  failed: "alert-circle-outline",
};

export default function RepoSetupDrawer({
  phase,
  message,
  error,
  onDismiss,
  onRetry,
}: Props) {
  if (phase === "idle" || phase === "ready") return null;

  const isFailed = phase === "failed";
  const showSpinner = !isFailed;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.header}>
          <Ionicons
            name={PHASE_ICON[phase]}
            size={20}
            color={isFailed ? colors.error : colors.accent}
          />
          <Text style={styles.title}>{PHASE_LABEL[phase]}</Text>
          {onDismiss && isFailed ? (
            <Pressable
              onPress={onDismiss}
              hitSlop={12}
              style={styles.dismissBtn}
              accessibilityLabel="Dismiss"
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.message} numberOfLines={3}>
          {message || "Working…"}
        </Text>

        {showSpinner ? (
          <View style={styles.indeterminateBar}>
            <View style={styles.indeterminateFill} />
          </View>
        ) : null}

        {isFailed && error ? (
          <Text style={styles.errorDetail} numberOfLines={4}>
            {error}
          </Text>
        ) : null}

        {isFailed && onRetry ? (
          <Pressable
            onPress={onRetry}
            style={styles.retryBtn}
            accessibilityLabel="Retry"
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  dismissBtn: {
    padding: 4,
  },
  message: {
    color: colors.textSecondary,
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  indeterminateBar: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  indeterminateFill: {
    height: "100%",
    width: "40%",
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  errorDetail: {
    color: colors.error,
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },
  retryBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    alignSelf: "flex-start",
  },
  retryText: {
    color: colors.accentText,
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
});
