import { useState } from "react";
import { View, Text, TextInput, Image, TouchableOpacity, FlatList, StyleSheet, Modal, Pressable } from "react-native";
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, fonts, fontSize, spacing, radii } from "@/constants/theme";
import { useStore } from "@/store";
import { models, Model } from "@/constants/models";

const PROVIDER_LOGOS: Record<string, any> = {
  Anthropic: require("@/assets/images/providers/anthropic.png"),
  OpenAI: require("@/assets/images/providers/openai.png"),
  Google: require("@/assets/images/providers/google.png"),
  Meta: require("@/assets/images/providers/meta.png"),
  Mistral: require("@/assets/images/providers/mistral.png"),
  DeepSeek: require("@/assets/images/providers/deepseek.png"),
};

function ModelItem({
  model,
  isSelected,
  onSelect,
}: {
  model: Model;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.modelItem, isSelected && styles.modelItemSelected]}
      onPress={onSelect}
      activeOpacity={0.6}
    >
      <Image source={PROVIDER_LOGOS[model.provider]} style={styles.providerLogo} resizeMode="contain" />
      <View style={styles.modelInfo}>
        <Text style={styles.modelName}>{model.name}</Text>
        <Text style={styles.modelProvider}>
          {model.provider} · {model.contextWindow >= 1000000 ? "1M" : `${model.contextWindow / 1000}K`}
        </Text>
      </View>
      {isSelected && (
        <Ionicons name="checkmark" size={18} color={colors.accent} />
      )}
    </TouchableOpacity>
  );
}

export default function ModelPicker() {
  const modelPickerOpen = useStore((s) => s.modelPickerOpen);
  const setModelPickerOpen = useStore((s) => s.setModelPickerOpen);
  const selectedModel = useStore((s) => s.selectedModel);
  const setSelectedModel = useStore((s) => s.setSelectedModel);
  const [searchQuery, setSearchQuery] = useState("");

  const keyboard = useAnimatedKeyboard();
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    marginBottom: keyboard.height.value,
  }));

  const close = () => {
    setSearchQuery("");
    setModelPickerOpen(false);
  };

  const filteredModels = searchQuery
    ? models.filter(
        (m) =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.provider.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : models;

  return (
    <Modal
      visible={modelPickerOpen}
      animationType="slide"
      transparent
      onRequestClose={close}
    >
      <Pressable style={styles.backdrop} onPress={close}>
        <Animated.View style={[styles.sheet, sheetAnimatedStyle]}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Model</Text>
            <TouchableOpacity onPress={close} hitSlop={12}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search models..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredModels}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <ModelItem
                model={item}
                isSelected={item.id === selectedModel.id}
                onSelect={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedModel(item);
                  close();
                }}
              />
            )}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
          />
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
    maxHeight: "60%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.xl,
    color: colors.text,
  },
  list: {
    paddingVertical: spacing.sm,
  },
  modelItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    minHeight: 52,
  },
  modelItemSelected: {
    backgroundColor: colors.surfaceLight,
  },
  providerLogo: {
    width: 24,
    height: 24,
    borderRadius: 6,
    marginRight: spacing.md,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  modelProvider: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
