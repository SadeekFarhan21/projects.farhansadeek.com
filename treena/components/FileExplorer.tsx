import { useCallback, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  Pressable,
  Modal,
  Alert,
  Image,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { colors, fonts, fontSize, spacing, radii } from "@/constants/theme";
import { useStore, FileNode, GitFileStatus } from "@/store";
import { useFileSystem } from "@/hooks/useFileSystem";
import { useGit } from "@/hooks/useGit";
import { getFileIcon } from "@/lib/fileIcons";
import WorkspaceSearchModal from "@/components/WorkspaceSearchModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TREE_WIDTH = Math.round(SCREEN_WIDTH * 0.85);

const TIMING_CONFIG = { duration: 200, easing: Easing.out(Easing.cubic) };

const GIT_BADGE_MAP: Partial<Record<GitFileStatus, { letter: string; color: string }>> = {
  modified: { letter: "M", color: colors.gitModified },
  untracked: { letter: "U", color: colors.gitUntracked },
  staged: { letter: "A", color: colors.gitUntracked },
  deleted: { letter: "D", color: colors.gitDeleted },
};

function FileItemRow({
  item,
  currentFilePath,
  onPress,
  onLongPress,
  isExpanded,
  gitBadge,
  inlineEditPath,
  inlineEditName,
  onInlineEditChange,
  onInlineEditSubmit,
  onInlineEditBlur,
}: {
  item: FileNode;
  currentFilePath: string | null;
  onPress: (item: FileNode) => void;
  onLongPress: (item: FileNode) => void;
  isExpanded: boolean;
  gitBadge?: { letter: string; color: string };
  inlineEditPath: string | null;
  inlineEditName: string;
  onInlineEditChange: (text: string) => void;
  onInlineEditSubmit: () => void;
  onInlineEditBlur: () => void;
}) {
  const isActive = item.path === currentFilePath;
  const isRenaming = inlineEditPath === item.path;
  const fileIconInfo = !item.isDirectory ? getFileIcon(item.name) : null;

  return (
    <TouchableOpacity
      style={[
        styles.fileItem,
        { paddingLeft: spacing.lg + item.depth * 16 },
        isActive && styles.fileItemActive,
      ]}
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      activeOpacity={0.6}
    >
      {item.isDirectory ? (
        <>
          <Text style={{ color: '#DCAD73', fontSize: 14 }}>
            {isExpanded ? '▾ ' : '▸ '}
          </Text>
          <Text style={{ color: '#DCAD73', fontSize: 13, marginRight: spacing.sm, width: 14, textAlign: 'center' }}>⬡</Text>
        </>
      ) : fileIconInfo ? (
        <Text style={{
          fontSize: fileIconInfo.icon.length <= 2 ? 10 : 12,
          fontFamily: 'JetBrains Mono',
          fontWeight: '700',
          color: fileIconInfo.color,
          width: 20,
          textAlign: 'center',
          marginRight: spacing.sm - 4,
          marginLeft: 4,
        }}>
          {fileIconInfo.icon}
        </Text>
      ) : null}

      {isRenaming ? (
        <TextInput
          style={styles.inlineInput}
          value={inlineEditName}
          onChangeText={onInlineEditChange}
          onSubmitEditing={onInlineEditSubmit}
          onBlur={onInlineEditBlur}
          autoFocus
          selectTextOnFocus
          autoCapitalize="none"
          autoCorrect={false}
        />
      ) : (
        <Text
          style={[
            styles.fileName,
            isActive && styles.fileNameActive,
          ]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
      )}

      {gitBadge && !isRenaming && (
        <Text style={[styles.gitBadge, { color: gitBadge.color }]}>
          {gitBadge.letter}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function InlineCreateRow({
  depth,
  type,
  value,
  onChangeText,
  onSubmit,
  onBlur,
}: {
  depth: number;
  type: "file" | "directory";
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onBlur: () => void;
}) {
  return (
    <View style={[styles.fileItem, { paddingLeft: spacing.lg + depth * 16 }]}>
      {type === "directory" ? (
        <Ionicons name="folder" size={16} color={colors.folderIcon} style={styles.fileIcon} />
      ) : (
        <View style={[styles.fileDot, { backgroundColor: colors.textSecondary }]} />
      )}
      <TextInput
        style={styles.inlineInput}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        onBlur={onBlur}
        autoFocus
        placeholder={type === "file" ? "filename" : "folder name"}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

export default function FileExplorer() {
  const fileTreeOpen = useStore((s) => s.fileTreeOpen);
  const setFileTreeOpen = useStore((s) => s.setFileTreeOpen);
  const fileTree = useStore((s) => s.fileTree);
  const currentFilePath = useStore((s) => s.currentFilePath);
  const repoName = useStore((s) => s.repoName);
  const projectRoot = useStore((s) => s.projectRoot);
  const expandedFolders = useStore((s) => s.expandedFolders);
  const toggleFolderExpanded = useStore((s) => s.toggleFolderExpanded);
  const setAllFoldersCollapsed = useStore((s) => s.setAllFoldersCollapsed);
  const gitFileStatuses = useStore((s) => s.gitFileStatuses);
  const contextMenuTarget = useStore((s) => s.contextMenuTarget);
  const setContextMenuTarget = useStore((s) => s.setContextMenuTarget);
  const inlineEditPath = useStore((s) => s.inlineEditPath);
  const setInlineEditPath = useStore((s) => s.setInlineEditPath);
  const inlineCreateParent = useStore((s) => s.inlineCreateParent);
  const inlineCreateType = useStore((s) => s.inlineCreateType);
  const setInlineCreate = useStore((s) => s.setInlineCreate);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const remoteWorkspaceEnabled = useStore((s) => s.remoteWorkspaceEnabled);
  const terminalPanelOpen = useStore((s) => s.terminalPanelOpen);
  const isAgentChatOpen = useStore((s) => s.isAgentChatOpen);

  const { openFile, refreshFileTree, deleteItem, renameItem, createFile, createDirectory } = useFileSystem();
  const { getStatus } = useGit();

  const [inlineEditName, setInlineEditName] = useState("");
  const [inlineCreateName, setInlineCreateName] = useState("");
  const [workspaceSearchOpen, setWorkspaceSearchOpen] = useState(false);

  const translateX = useSharedValue(fileTreeOpen ? 0 : -TREE_WIDTH);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: fileTreeOpen ? 0.5 : 0,
  }));

  useEffect(() => {
    if (fileTreeOpen) {
      translateX.value = withTiming(0, TIMING_CONFIG);
    } else if (terminalPanelOpen || isAgentChatOpen) {
      translateX.value = -TREE_WIDTH;
    } else {
      translateX.value = withTiming(-TREE_WIDTH, TIMING_CONFIG);
    }
  }, [fileTreeOpen, terminalPanelOpen, isAgentChatOpen]);

  const swipeGesture = Gesture.Pan()
    .onEnd((e) => {
      if (e.translationX < -50) {
        translateX.value = withTiming(-TREE_WIDTH, TIMING_CONFIG);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFileTreeOpen(false);
      }
    });

  const getGitBadge = useCallback(
    (item: FileNode) => {
      // Strip projectRoot prefix from path to match statusMatrix keys
      let relativePath = item.path;
      if (projectRoot && relativePath.startsWith(projectRoot)) {
        relativePath = relativePath.slice(projectRoot.length);
        // Remove leading slash
        if (relativePath.startsWith("/")) {
          relativePath = relativePath.slice(1);
        }
      }
      // Remove trailing slash for directories
      if (relativePath.endsWith("/")) {
        relativePath = relativePath.slice(0, -1);
      }
      const status = gitFileStatuses[relativePath];
      if (status && GIT_BADGE_MAP[status]) {
        return GIT_BADGE_MAP[status];
      }
      return undefined;
    },
    [gitFileStatuses, projectRoot]
  );

  const handleFilePress = useCallback(
    (item: FileNode) => {
      if (item.isDirectory) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        toggleFolderExpanded(item.path);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        openFile(item.path, item.name);
        setFileTreeOpen(false);
      }
    },
    [openFile, setFileTreeOpen, toggleFolderExpanded]
  );

  const handleLongPress = useCallback(
    (item: FileNode) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setContextMenuTarget(item);
    },
    [setContextMenuTarget]
  );

  const handleRename = useCallback(() => {
    if (!contextMenuTarget) return;
    setInlineEditName(contextMenuTarget.name);
    setInlineEditPath(contextMenuTarget.path);
    setContextMenuTarget(null);
  }, [contextMenuTarget, setInlineEditPath, setContextMenuTarget]);

  const handleRenameSubmit = useCallback(async () => {
    if (!inlineEditPath || !inlineEditName.trim()) {
      setInlineEditPath(null);
      return;
    }
    try {
      await renameItem(inlineEditPath, inlineEditName.trim());
      await refreshFileTree();
    } catch (err) {
      console.error("Rename failed:", err);
    }
    setInlineEditPath(null);
  }, [inlineEditPath, inlineEditName, renameItem, refreshFileTree, setInlineEditPath]);

  const handleDelete = useCallback(() => {
    if (!contextMenuTarget) return;
    const target = contextMenuTarget;
    setContextMenuTarget(null);
    Alert.alert(
      "Delete",
      `Delete "${target.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteItem(target.path);
              await refreshFileTree();
            } catch (err) {
              console.error("Delete failed:", err);
            }
          },
        },
      ]
    );
  }, [contextMenuTarget, deleteItem, refreshFileTree, setContextMenuTarget]);

  const handleCopyPath = useCallback(async () => {
    if (!contextMenuTarget) return;
    await Clipboard.setStringAsync(contextMenuTarget.path);
    setContextMenuTarget(null);
  }, [contextMenuTarget, setContextMenuTarget]);

  const handleNewFileHere = useCallback(() => {
    if (!contextMenuTarget?.isDirectory) return;
    setInlineCreate(contextMenuTarget.path, "file");
    // Make sure the folder is expanded
    if (!expandedFolders.includes(contextMenuTarget.path)) {
      toggleFolderExpanded(contextMenuTarget.path);
    }
    setContextMenuTarget(null);
  }, [contextMenuTarget, setInlineCreate, expandedFolders, toggleFolderExpanded, setContextMenuTarget]);

  const handleNewFolderHere = useCallback(() => {
    if (!contextMenuTarget?.isDirectory) return;
    setInlineCreate(contextMenuTarget.path, "directory");
    if (!expandedFolders.includes(contextMenuTarget.path)) {
      toggleFolderExpanded(contextMenuTarget.path);
    }
    setContextMenuTarget(null);
  }, [contextMenuTarget, setInlineCreate, expandedFolders, toggleFolderExpanded, setContextMenuTarget]);

  const handleInlineCreateSubmit = useCallback(async () => {
    if (!inlineCreateParent || !inlineCreateType || !inlineCreateName.trim()) {
      setInlineCreate(null, null);
      setInlineCreateName("");
      return;
    }
    try {
      if (inlineCreateType === "file") {
        const path = await createFile(inlineCreateParent, inlineCreateName.trim());
        await refreshFileTree();
        openFile(path, inlineCreateName.trim());
      } else {
        await createDirectory(inlineCreateParent, inlineCreateName.trim());
        await refreshFileTree();
      }
    } catch (err) {
      console.error("Create failed:", err);
    }
    setInlineCreate(null, null);
    setInlineCreateName("");
  }, [inlineCreateParent, inlineCreateType, inlineCreateName, createFile, createDirectory, refreshFileTree, openFile, setInlineCreate]);

  const handleToolbarNewFile = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInlineCreate(projectRoot, "file");
  }, [projectRoot, setInlineCreate]);

  const handleToolbarNewFolder = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInlineCreate(projectRoot, "directory");
  }, [projectRoot, setInlineCreate]);

  const handleToolbarRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refreshFileTree();
    await getStatus();
  }, [refreshFileTree, getStatus]);

  const handleToolbarCollapse = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAllFoldersCollapsed();
  }, [setAllFoldersCollapsed]);

  const flattenTree = useCallback(
    (nodes: FileNode[]): FileNode[] => {
      const result: FileNode[] = [];
      for (const node of nodes) {
        result.push(node);
        if (node.isDirectory && node.children && expandedFolders.includes(node.path)) {
          result.push(...flattenTree(node.children));
        }
      }
      return result;
    },
    [expandedFolders]
  );

  const flatData = flattenTree(fileTree);

  // Insert inline create rows into flat data
  const renderData: Array<{ type: "node"; item: FileNode } | { type: "create"; depth: number }> = [];
  // If creating at project root level, add at top
  if (inlineCreateParent === projectRoot && inlineCreateType) {
    renderData.push({ type: "create", depth: 0 });
  }
  for (const item of flatData) {
    renderData.push({ type: "node", item });
    // If this folder is the create target, insert create row after it
    if (
      item.isDirectory &&
      inlineCreateParent === item.path &&
      inlineCreateType &&
      inlineCreateParent !== projectRoot
    ) {
      renderData.push({ type: "create", depth: item.depth + 1 });
    }
  }

  return (
    <>
      <Animated.View
        pointerEvents={fileTreeOpen ? "auto" : "none"}
        style={[styles.backdrop, backdropStyle]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setFileTreeOpen(false)}
        />
      </Animated.View>

      <GestureDetector gesture={swipeGesture}>
        <Animated.View
          pointerEvents={fileTreeOpen ? "auto" : "none"}
          style={[styles.container, animatedStyle]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerBrand}>
              <Image
                source={require("@/assets/images/icon.png")}
                style={styles.headerLogo}
              />
              <View>
                <Text style={styles.brandName}>treena</Text>
                <Text style={styles.repoLabel}>{repoName.toUpperCase()}</Text>
              </View>
            </View>
          </View>

          {/* Toolbar */}
          <View style={styles.toolbar}>
            <View style={styles.toolbarSpacer} />
            <TouchableOpacity onPress={handleToolbarNewFile} hitSlop={8} style={styles.toolbarBtn}>
              <Ionicons name="document-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleToolbarNewFolder} hitSlop={8} style={styles.toolbarBtn}>
              <Ionicons name="folder-open-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleToolbarRefresh} hitSlop={8} style={styles.toolbarBtn}>
              <Ionicons name="refresh-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleToolbarCollapse} hitSlop={8} style={styles.toolbarBtn}>
              <Ionicons name="chevron-collapse-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Empty state */}
          {fileTree.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No files yet</Text>
              <Text style={styles.emptySubtitle}>Create a file or clone a repo to get started</Text>
            </View>
          )}

          {/* File tree */}
          <FlatList
            data={renderData}
            keyExtractor={(entry, idx) =>
              entry.type === "node" ? entry.item.path : `create-${idx}`
            }
            renderItem={({ item: entry }) => {
              if (entry.type === "create") {
                return (
                  <InlineCreateRow
                    depth={entry.depth}
                    type={inlineCreateType!}
                    value={inlineCreateName}
                    onChangeText={setInlineCreateName}
                    onSubmit={handleInlineCreateSubmit}
                    onBlur={() => {
                      setInlineCreate(null, null);
                      setInlineCreateName("");
                    }}
                  />
                );
              }
              return (
                <FileItemRow
                  item={entry.item}
                  currentFilePath={currentFilePath}
                  onPress={handleFilePress}
                  onLongPress={handleLongPress}
                  isExpanded={expandedFolders.includes(entry.item.path)}
                  gitBadge={getGitBadge(entry.item)}
                  inlineEditPath={inlineEditPath}
                  inlineEditName={inlineEditName}
                  onInlineEditChange={setInlineEditName}
                  onInlineEditSubmit={handleRenameSubmit}
                  onInlineEditBlur={() => setInlineEditPath(null)}
                />
              );
            }}
            style={styles.fileList}
            contentContainerStyle={styles.fileListContent}
          />

          <View style={styles.footerRow}>
            {remoteWorkspaceEnabled && (
              <TouchableOpacity
                style={styles.footerBtn}
                onPress={() => setWorkspaceSearchOpen(true)}
              >
                <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.settingsText}>Search</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.settingsBtn} onPress={() => setSettingsOpen(true)}>
              <Ionicons
                name="settings-outline"
                size={18}
                color={colors.textSecondary}
              />
              <Text style={styles.settingsText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </GestureDetector>

      <WorkspaceSearchModal
        visible={workspaceSearchOpen}
        onClose={() => setWorkspaceSearchOpen(false)}
      />

      {/* Context menu */}
      <Modal
        visible={contextMenuTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setContextMenuTarget(null)}
      >
        <Pressable
          style={styles.contextBackdrop}
          onPress={() => setContextMenuTarget(null)}
        >
          <View style={styles.contextSheet}>
            <View style={styles.contextHeader}>
              <Text style={styles.contextTitle} numberOfLines={1}>
                {contextMenuTarget?.name}
              </Text>
            </View>

            <TouchableOpacity style={styles.contextOption} onPress={handleRename}>
              <Ionicons name="pencil-outline" size={18} color={colors.text} />
              <Text style={styles.contextOptionText}>Rename</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contextOption} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={[styles.contextOptionText, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contextOption} onPress={handleCopyPath}>
              <Ionicons name="copy-outline" size={18} color={colors.text} />
              <Text style={styles.contextOptionText}>Copy Path</Text>
            </TouchableOpacity>

            {contextMenuTarget?.isDirectory && (
              <>
                <TouchableOpacity style={styles.contextOption} onPress={handleNewFileHere}>
                  <Ionicons name="document-outline" size={18} color={colors.text} />
                  <Text style={styles.contextOptionText}>New File Here</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.contextOption} onPress={handleNewFolderHere}>
                  <Ionicons name="folder-open-outline" size={18} color={colors.text} />
                  <Text style={styles.contextOptionText}>New Folder Here</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 10,
  },
  container: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: TREE_WIDTH,
    backgroundColor: colors.editorBg,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    zIndex: 11,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.sm,
  },
  headerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  brandName: {
    fontFamily: fonts.monoBold,
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  repoLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toolbarSpacer: {
    flex: 1,
  },
  toolbarBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    borderRadius: radii.sm,
  },
  fileList: {
    flex: 1,
  },
  fileListContent: {
    paddingVertical: spacing.xs,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    height: 32,
    paddingRight: spacing.md,
  },
  fileItemActive: {
    backgroundColor: colors.explorerSelectedBg,
  },
  chevron: {
    marginRight: 4,
    width: 12,
  },
  fileIcon: {
    marginRight: spacing.sm,
  },
  fileDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
    marginLeft: 16,
  },
  fileName: {
    fontFamily: fonts.mono,
    fontSize: fontSize.explorerItems,
    color: "#CCCCCC",
    flex: 1,
  },
  fileNameActive: {
    color: "#FFFFFF",
  },
  gitBadge: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    marginLeft: spacing.sm,
  },
  inlineInput: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: fontSize.explorerItems,
    color: colors.text,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    height: 26,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "stretch",
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    flex: 1,
  },
  settingsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    flex: 1,
  },
  settingsText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.lineNumber,
    color: colors.textSecondary,
  },
  // Context menu
  contextBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  contextSheet: {
    backgroundColor: colors.surfaceLight,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingBottom: 34,
  },
  contextHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contextTitle: {
    fontFamily: fonts.mono,
    fontSize: fontSize.md,
    color: colors.text,
  },
  contextOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  contextOptionText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.lg,
    color: colors.text,
  },
});
