import { useCallback } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, fonts, fontSize, spacing, radii } from "@/constants/theme";
import { useStore, BrowserTab } from "@/store";
import { getFileIcon } from "@/lib/fileIcons";
import { formatEditorTabLabel } from "@/lib/editorTabLabel";
import { useFileSystem } from "@/hooks/useFileSystem";

const TAB_MIN_W = 100;
const ROW_H = 42;

function fileBasename(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

export default function EditorTabBar() {
  const openTabPaths = useStore((s) => s.openTabPaths);
  const currentFilePath = useStore((s) => s.currentFilePath);
  const removeOpenTabPath = useStore((s) => s.removeOpenTabPath);
  const clearCurrentFile = useStore((s) => s.clearCurrentFile);
  const activeTabType = useStore((s) => s.activeTabType);
  const setActiveTabType = useStore((s) => s.setActiveTabType);
  const browserTabs = useStore((s) => s.browserTabs);
  const activeBrowserTabId = useStore((s) => s.activeBrowserTabId);
  const setActiveBrowserTab = useStore((s) => s.setActiveBrowserTab);
  const removeBrowserTab = useStore((s) => s.removeBrowserTab);
  const addBrowserTab = useStore((s) => s.addBrowserTab);
  const cloudSessionId = useStore((s) => s.cloudSessionId);

  const { openFile, saveEditBuffer } = useFileSystem();

  const selectFileTab = useCallback(
    async (path: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (activeTabType === "file" && path === currentFilePath) return;
      try {
        await saveEditBuffer();
      } catch {
        /* still try to switch */
      }
      setActiveTabType("file");
      const name = fileBasename(path);
      await openFile(path, name);
    },
    [currentFilePath, activeTabType, openFile, saveEditBuffer, setActiveTabType]
  );

  const closeFileTab = useCallback(
    async (path: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const st = useStore.getState();
      const wasActive = st.activeTabType === "file" && st.currentFilePath === path;
      // True even when the user is on a browser tab — currentFilePath can outlive its tab otherwise.
      const wasReferenced = st.currentFilePath === path;
      const idx = st.openTabPaths.indexOf(path);
      const nextTabs = st.openTabPaths.filter((p) => p !== path);
      if (wasActive) {
        try {
          await saveEditBuffer();
        } catch {
          /* continue */
        }
      }
      removeOpenTabPath(path);
      if (!wasReferenced) return;
      if (nextTabs.length === 0) {
        if (wasActive && st.browserTabs.length > 0) {
          setActiveBrowserTab(st.browserTabs[st.browserTabs.length - 1]!.id);
        } else {
          clearCurrentFile();
        }
        return;
      }
      const nextIdx = Math.min(idx, nextTabs.length - 1);
      const nextPath = nextTabs[nextIdx];
      const name = fileBasename(nextPath);
      await openFile(nextPath, name);
      if (!wasActive) {
        setActiveTabType("browser");
      }
    },
    [
      clearCurrentFile,
      openFile,
      removeOpenTabPath,
      saveEditBuffer,
      setActiveBrowserTab,
      setActiveTabType,
    ]
  );

  const selectBrowserTab = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveBrowserTab(id);
    },
    [setActiveBrowserTab]
  );

  const closeBrowserTab = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      removeBrowserTab(id);
    },
    [removeBrowserTab]
  );

  const hasFileTabs = openTabPaths.length > 0;
  const hasBrowserTabs = browserTabs.length > 0;

  const handleNewBrowserTab = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addBrowserTab("https://www.google.com");
  }, [addBrowserTab]);

  if (!hasFileTabs && !hasBrowserTabs && !cloudSessionId) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {openTabPaths.map((path) => {
          const name = fileBasename(path);
          const tabText = formatEditorTabLabel(path);
          const { icon, color: iconColor } = getFileIcon(name);
          const active = activeTabType === "file" && path === currentFilePath;
          return (
            <Pressable
              key={path}
              onPress={() => void selectFileTab(path)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabGlyph, { color: iconColor }]} numberOfLines={1}>
                {icon.length > 2 ? icon.slice(0, 2) : icon}
              </Text>
              <Text
                style={[styles.tabLabel, active && styles.tabLabelActive]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {tabText}
              </Text>
              <Pressable
                hitSlop={10}
                onPress={(e) => {
                  e?.stopPropagation?.();
                  void closeFileTab(path);
                }}
                style={styles.closeHit}
              >
                <Ionicons
                  name="close"
                  size={15}
                  color={active ? colors.text : colors.textMuted}
                />
              </Pressable>
            </Pressable>
          );
        })}

        {browserTabs.map((bt: BrowserTab) => {
          const active = activeTabType === "browser" && bt.id === activeBrowserTabId;
          let hostname = bt.title || bt.url;
          try { hostname = new URL(bt.url).hostname; } catch { /* use title */ }
          const label = bt.title && bt.title !== hostname ? bt.title : hostname;
          return (
            <Pressable
              key={bt.id}
              onPress={() => selectBrowserTab(bt.id)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Ionicons
                name="globe-outline"
                size={14}
                color={active ? colors.accent : colors.textMuted}
              />
              <Text
                style={[styles.tabLabel, active && styles.tabLabelActive]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {label}
              </Text>
              <Pressable
                hitSlop={10}
                onPress={(e) => {
                  e?.stopPropagation?.();
                  closeBrowserTab(bt.id);
                }}
                style={styles.closeHit}
              >
                <Ionicons
                  name="close"
                  size={15}
                  color={active ? colors.text : colors.textMuted}
                />
              </Pressable>
            </Pressable>
          );
        })}

        <Pressable
          onPress={handleNewBrowserTab}
          style={styles.addTabBtn}
          hitSlop={8}
          accessibilityLabel="New browser tab"
        >
          <Ionicons name="add" size={16} color={colors.textMuted} />
          <Ionicons name="globe-outline" size={16} color={colors.textMuted} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    minHeight: ROW_H,
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingHorizontal: spacing.sm,
    gap: 4,
    minHeight: ROW_H,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: TAB_MIN_W,
    paddingLeft: spacing.sm,
    paddingRight: 4,
    paddingVertical: 7,
    borderRadius: radii.md,
    backgroundColor: colors.headerBg,
    gap: 6,
    marginVertical: 4,
  },
  tabActive: {
    backgroundColor: colors.surfaceLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  tabGlyph: {
    fontFamily: fonts.monoBold,
    fontSize: fontSize.xs,
    minWidth: 18,
    textAlign: "center",
  },
  tabLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.text,
  },
  closeHit: {
    padding: 2,
    marginLeft: -2,
  },
  addTabBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    marginVertical: 4,
    gap: 2,
    borderRadius: radii.md,
    minHeight: 36,
  },
});
