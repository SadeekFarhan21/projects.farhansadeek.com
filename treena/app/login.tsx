import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { colors, fonts, fontSize, spacing, radii } from "@/constants/theme";
import { useStore } from "@/store";
import {
  getGithubOAuthClientId,
  getGithubOAuthRedirectUri,
  signInWithGithub,
} from "@/lib/githubOAuth";
import { fetchGithubUserId } from "@/lib/githubUser";
import { setCachedGithubUserId } from "@/lib/mcpLocalPersistence";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const setGithubToken = useStore((s) => s.setGithubToken);

  const handleLogin = async () => {
    if (!getGithubOAuthClientId()) {
      Alert.alert(
        "GitHub sign-in",
        `Add EXPO_PUBLIC_GITHUB_OAUTH_CLIENT_ID to .env and rebuild.\n\nCallback URL:\n${getGithubOAuthRedirectUri()}`
      );
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await signInWithGithub();
      if (!res.ok) {
        setError(res.message);
        return;
      }
      await SecureStore.setItemAsync("github_token", res.accessToken);
      setGithubToken(res.accessToken);
      const ghUid = await fetchGithubUserId(res.accessToken);
      if (ghUid != null) {
        await setCachedGithubUserId(ghUid);
      }

      const storedKey = await SecureStore.getItemAsync("openrouter_api_key");
      if (storedKey) {
        router.replace("/projects");
      } else {
        router.replace("/onboarding");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logoImage}
          />
          <Text style={styles.title}>treena</Text>
          <Text style={styles.subtitle}>code anywhere, anytime</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.githubBtn, loading && styles.disabledBtn]}
          onPress={() => void handleLogin()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <Ionicons
                name="logo-github"
                size={22}
                color={colors.text}
                style={{ marginRight: 10 }}
              />
              <Text style={styles.githubBtnText}>Sign in with GitHub</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 60,
  },
  logoImage: {
    width: 100,
    height: 100,
    marginBottom: spacing.lg,
    borderRadius: 20,
  },
  title: {
    fontFamily: fonts.monoBold,
    fontSize: 48,
    color: "#FFFFFF",
    letterSpacing: -2,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSize.lg,
    color: colors.accent,
  },
  githubBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
  },
  githubBtnText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
});
