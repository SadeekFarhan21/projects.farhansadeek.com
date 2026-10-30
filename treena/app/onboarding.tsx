import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { colors, fonts, fontSize, spacing, radii } from "@/constants/theme";
import { useStore } from "@/store";

export default function Onboarding() {
  const [apiKey, setApiKeyInput] = useState("");
  const [error, setError] = useState("");

  const setApiKey = useStore((s) => s.setApiKey);
  const setHasCompletedOnboarding = useStore((s) => s.setHasCompletedOnboarding);

  const keyboard = useAnimatedKeyboard();
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    marginBottom: keyboard.height.value,
  }));

  const saveKeys = async () => {
    if (!apiKey.trim()) {
      setError("API key is required");
      return;
    }
    setError("");

    await SecureStore.setItemAsync("openrouter_api_key", apiKey.trim());
    setApiKey(apiKey.trim());
    setHasCompletedOnboarding(true);
    router.replace("/projects");
  };

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepTitle}>Connect Your AI</Text>
        <Text style={styles.stepSubtitle}>
          Enter your OpenRouter API key to enable AI assistance
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>OpenRouter API Key *</Text>
          <TextInput
            style={styles.input}
            placeholder="sk-or-..."
            placeholderTextColor={colors.textMuted}
            value={apiKey}
            onChangeText={setApiKeyInput}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.primaryBtn} onPress={saveKeys}>
          <Text style={styles.primaryBtnText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxl,
  },
  stepTitle: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.xxl,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  stepSubtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xxxl,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    fontFamily: fonts.mono,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primaryBtn: {
    flexDirection: "row",
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  primaryBtnText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.lg,
    color: colors.accentText,
  },
  secondaryBtn: {
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
