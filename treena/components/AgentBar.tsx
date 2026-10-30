import React, { useRef, useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Keyboard,
  Modal,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedKeyboard,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { colors, fonts, fontSize, spacing, radii } from "@/constants/theme";
import { useStore, ChatMessage } from "@/store";
import { parseMessageContent, MessageSegment } from "@/lib/messageParser";
import MarkdownText from "@/components/MarkdownText";
import { computeLineDiff } from "@/lib/diff";
import { joinRemotePath, REMOTE_PROJECT_ROOT } from "@/lib/workspace/remotePaths";
import { useFileSystem } from "@/hooks/useFileSystem";
import { useAgent } from "@/hooks/useAgent";
import DiffCard from "@/components/DiffCard";
import CodeCard from "@/components/CodeCard";
import AgentStatus from "@/components/AgentStatus";



const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const MIN_HEIGHT = 120;
const MAX_HEIGHT = SCREEN_HEIGHT * 0.75;
const HEADER_HEIGHT = 120;
const DEFAULT_HEIGHT = 0;
const DEFAULT_OPEN_HEIGHT = Math.round(SCREEN_HEIGHT * 0.55);
const AUTO_FOLLOW_THRESHOLD = 50;
const HANDLE_ROW_HEIGHT = 28;

function toolIcon(name?: string): string {
  switch (name) {
    case "read_file":   return "document-outline";
    case "write_file":  return "create-outline";
    case "apply_patch": return "construct-outline";
    case "list_dir":    return "folder-outline";
    case "grep":        return "search-outline";
    case "run_command": return "terminal-outline";
    default:            return "flash-outline";
  }
}

function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

/* ── Shared Fullscreen Expand Modal ── */
function ExpandCardModal({
  title,
  visible,
  onClose,
  children,
}: {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle} numberOfLines={1}>
            {title}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.modalBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        <ScrollView
          style={styles.modalBody}
          contentContainerStyle={[
            styles.modalBodyContent,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
        >
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ── Expand Footer ── */
function ExpandFooter({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.expandRow}
    >
      <Ionicons name="expand-outline" size={13} color={colors.textSecondary} />
      <Text style={styles.expandText}>Tap to expand</Text>
    </TouchableOpacity>
  );
}

/* ── Collapsible Thinking ── */
const ThinkingSection = React.memo(({ thinking }: { thinking: string }) => {
  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <View style={styles.thinkingContainer}>
      <TouchableOpacity
        style={styles.thinkingHeader}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={expanded ? "chevron-down" : "chevron-forward"}
          size={12}
          color={colors.textMuted}
        />
        <Text style={styles.thinkingLabel}>Thinking...</Text>
      </TouchableOpacity>
      {expanded && (
        <>
          <View style={styles.thinkingBody}>
            <Text style={styles.thinkingText}>{thinking}</Text>
          </View>
          <ExpandFooter onPress={() => setModalOpen(true)} />
          <ExpandCardModal
            title="Thinking"
            visible={modalOpen}
            onClose={() => setModalOpen(false)}
          >
            <Text style={styles.thinkingTextModal}>{thinking}</Text>
          </ExpandCardModal>
        </>
      )}
    </View>
  );
});
ThinkingSection.displayName = "ThinkingSection";

/* ── Plan Card ── */
const PlanCard = React.memo(
  ({
    message,
    onApprove,
    onReject,
  }: {
    message: ChatMessage;
    onApprove: () => void;
    onReject: () => void;
  }) => {
    const isPending = message.planApproved === undefined;
    const isApproved = message.planApproved === true;
    const isRejected = message.planApproved === false;

    return (
      <View
        style={[
          styles.planCard,
          isPending && styles.planCardPending,
          isApproved && styles.planCardApproved,
          isRejected && styles.planCardRejected,
        ]}
      >
        {isPending && <View style={styles.planAccentStrip} />}
        {isApproved && <View style={styles.planAccentStripDim} />}

        <View style={styles.planHeader}>
          <Ionicons name="leaf-outline" size={14} color={colors.accent} />
          <Text style={styles.planHeaderText}>Plan</Text>
          {isApproved && (
            <View style={styles.planBadge}>
              <Ionicons name="checkmark" size={11} color={colors.accent} />
              <Text style={styles.planBadgeText}>Built</Text>
            </View>
          )}
          {isRejected && (
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeTextMuted}>Rejected</Text>
            </View>
          )}
        </View>

        {message.thinking && <ThinkingSection thinking={message.thinking} />}

        <View style={styles.planBody}>
          <MarkdownText text={message.content} baseStyle={styles.planText} />
        </View>

        {isPending && (
          <View style={styles.planActions}>
            <TouchableOpacity
              style={styles.planBuildBtn}
              onPress={onApprove}
              activeOpacity={0.7}
            >
              <Text style={styles.planBuildBtnText}>Build</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.planRejectBtn}
              onPress={onReject}
              activeOpacity={0.7}
            >
              <Text style={styles.planRejectBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }
);
PlanCard.displayName = "PlanCard";

/* ── Tool Row ── */
const AgentToolRow = React.memo(({ message }: { message: ChatMessage }) => {
  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { openFile, writeFile, refreshFileTree } = useFileSystem();
  const setDiff = useStore((s) => s.setDiff);
  const clearDiff = useStore((s) => s.clearDiff);
  const setAgentChatOpen = useStore((s) => s.setAgentChatOpen);
  const { toolDiff, toolOutput } = message;
  const hasExpandable = !!(toolDiff || toolOutput);

  const absPathFromRel = (rel: string) => {
    const r = rel.replace(/^\/+/, "");
    if (useStore.getState().remoteWorkspaceEnabled) {
      return joinRemotePath(REMOTE_PROJECT_ROOT, r);
    }
    const root = useStore.getState().projectRoot.replace(/\/+$/, "");
    return `${root}/${r}`;
  };

  const viewToolDiffInEditor = async () => {
    if (!toolDiff?.filename) return;
    const path = absPathFromRel(toolDiff.filename);
    const name = basename(toolDiff.filename);
    await openFile(path, name);
    setDiff(
      computeLineDiff(toolDiff.oldContent ?? "", toolDiff.newContent ?? "")
    );
    setAgentChatOpen(false);
  };

  const revertWriteFile = async () => {
    if (
      (message.toolName !== "write_file" && message.toolName !== "apply_patch") ||
      !toolDiff?.filename ||
      toolDiff.oldContent === undefined
    ) {
      return;
    }
    const path = absPathFromRel(toolDiff.filename);
    const name = basename(toolDiff.filename);
    await writeFile(path, toolDiff.oldContent);
    clearDiff();
    await refreshFileTree();
    await openFile(path, name);
  };

  const showPreview =
    !toolDiff &&
    toolOutput &&
    (message.toolName === "read_file" ||
      message.toolName === "grep" ||
      message.toolName === "list_dir");

  if (!hasExpandable) {
    return (
      <View style={styles.toolRow}>
        <Ionicons
          name={toolIcon(message.toolName) as any}
          size={13}
          color={colors.textMuted}
          style={styles.toolIcon}
        />
        <Text style={styles.toolText}>{message.content}</Text>
      </View>
    );
  }

  const diffLinesView = toolDiff ? (
    <View>
      {toolDiff.lines.map((line, i) => (
        <View
          key={i}
          style={[
            styles.diffLine,
            line.type === "added" ? styles.diffLineAdded : styles.diffLineRemoved,
          ]}
        >
          <View
            style={[
              styles.diffBar,
              line.type === "added" ? styles.diffBarAdded : styles.diffBarRemoved,
            ]}
          />
          <Text style={styles.diffLineText}>
            {line.type === "added" ? "+" : "-"} {line.content}
          </Text>
        </View>
      ))}
    </View>
  ) : null;

  const outputView = toolOutput ? (
    <Text style={styles.outputText}>{toolOutput}</Text>
  ) : null;

  const modalTitle = toolDiff
    ? basename(toolDiff.filename)
    : message.toolName
    ? message.toolName
    : "Output";

  return (
    <View style={styles.toolCard}>
      <TouchableOpacity
        style={styles.toolCardHeader}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={toolIcon(message.toolName) as any}
          size={13}
          color={colors.textMuted}
          style={styles.toolIcon}
        />
        <Text style={styles.toolCardName} numberOfLines={1}>
          {toolDiff ? basename(toolDiff.filename) : message.content}
        </Text>
        {toolDiff && (
          <View style={styles.diffBadge}>
            <Text style={styles.diffAdded}>+{toolDiff.addedCount}</Text>
            <Text style={styles.diffRemoved}> -{toolDiff.removedCount}</Text>
          </View>
        )}
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={13}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {toolDiff &&
        (message.toolName === "write_file" || message.toolName === "apply_patch") && (
        <View style={styles.toolDiffActions}>
          <TouchableOpacity
            onPress={() => void viewToolDiffInEditor()}
            style={styles.toolDiffActionBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.toolDiffActionText}>View in editor</Text>
          </TouchableOpacity>
          {toolDiff.oldContent !== undefined && (
            <TouchableOpacity
              onPress={() => void revertWriteFile()}
              style={styles.toolDiffActionBtnSecondary}
              activeOpacity={0.7}
            >
              <Text style={styles.toolDiffActionTextSecondary}>Revert write</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {expanded && toolDiff && (
        <>
          <View style={styles.diffBody}>{diffLinesView}</View>
          <ExpandFooter onPress={() => setModalOpen(true)} />
        </>
      )}

      {expanded && !toolDiff && toolOutput && (
        <>
          <View style={styles.outputBody}>{outputView}</View>
          <ExpandFooter onPress={() => setModalOpen(true)} />
        </>
      )}

      {!expanded && showPreview && (
        <View style={styles.toolPreview}>
          <Text style={styles.toolPreviewText} numberOfLines={3}>
            {toolOutput}
          </Text>
        </View>
      )}

      <ExpandCardModal
        title={modalTitle}
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        {toolDiff ? diffLinesView : outputView}
      </ExpandCardModal>
    </View>
  );
});
AgentToolRow.displayName = "AgentToolRow";

/* ── Streaming Diff Card ── */
function StreamingDiffCard({ preview }: { preview: NonNullable<ChatMessage["toolPreview"]> }) {
  const [expanded, setExpanded] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const fileName = preview.path.split("/").pop() ?? preview.path;

  const diffLinesView = (
    <View>
      {preview.diffLines.map((line, i) => (
        <View
          key={i}
          style={[
            styles.diffLine,
            line.type === "added" ? styles.diffLineAdded : styles.diffLineRemoved,
          ]}
        >
          <View
            style={[
              styles.diffBar,
              line.type === "added" ? styles.diffBarAdded : styles.diffBarRemoved,
            ]}
          />
          <Text style={styles.diffLineText}>
            {line.type === "added" ? "+" : "-"} {line.content}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.toolCard}>
      <TouchableOpacity
        style={styles.toolCardHeader}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.7}
      >
        <Ionicons name="document-text-outline" size={13} color={colors.textMuted} style={styles.toolIcon} />
        <Text style={styles.toolCardName} numberOfLines={1}>{fileName}</Text>
        {(preview.addedCount > 0 || preview.removedCount > 0) && (
          <View style={styles.diffBadge}>
            <Text style={styles.diffAdded}>+{preview.addedCount}</Text>
            <Text style={styles.diffRemoved}> -{preview.removedCount}</Text>
          </View>
        )}
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={13} color={colors.textMuted} />
      </TouchableOpacity>
      {expanded && preview.diffLines.length > 0 && (
        <>
          <View style={styles.diffBody}>{diffLinesView}</View>
          <ExpandFooter onPress={() => setModalOpen(true)} />
          <ExpandCardModal
            title={fileName}
            visible={modalOpen}
            onClose={() => setModalOpen(false)}
          >
            {diffLinesView}
          </ExpandCardModal>
        </>
      )}
    </View>
  );
}

/* ── Message Bubble ── */
const MessageBubble = React.memo(
  ({ message }: { message: ChatMessage }) => {
    const isUser = message.role === "user";
    const isTool = message.role === "tool";
    const { executePlan, rejectPlan } = useAgent();

    const segments = useMemo(() => {
      if (isTool || isUser) return null;
      if (message.isPlan) return null;
      return parseMessageContent(message.content);
    }, [message.content, isUser, isTool, message.isPlan]);

    if (isTool) return <AgentToolRow message={message} />;

    if (message.isPlan) {
      return (
        <PlanCard
          message={message}
          onApprove={() => executePlan(message.id)}
          onReject={() => rejectPlan(message.id)}
        />
      );
    }

    if (message.content === "" && message.isStreaming) {
      return null;
    }

    if (isUser || !segments) {
      return (
        <View style={styles.bubbleWrapper}>
          {!isUser && message.thinking && (
            <ThinkingSection thinking={message.thinking} />
          )}
          <View
            style={[
              styles.bubble,
              isUser ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            {isUser ? (
              <Text style={[styles.bubbleText, styles.userBubbleText]}>
                {message.content}
              </Text>
            ) : (
              <MarkdownText
                text={message.content}
                baseStyle={styles.assistantBubbleText}
              />
            )}
          </View>
          {!isUser && message.toolPreview && (
            <StreamingDiffCard preview={message.toolPreview} />
          )}
        </View>
      );
    }

    return (
      <View style={styles.bubbleWrapper}>
        {message.thinking && <ThinkingSection thinking={message.thinking} />}
        <View style={styles.assistantBubble}>
          {segments.map((seg, i) => renderSegment(seg, i))}
        </View>
        {message.toolPreview && (
          <StreamingDiffCard preview={message.toolPreview} />
        )}
      </View>
    );
  },
  (prev, next) =>
    prev.message.content === next.message.content &&
    prev.message.isStreaming === next.message.isStreaming &&
    prev.message.thinking === next.message.thinking &&
    prev.message.isPlan === next.message.isPlan &&
    prev.message.planApproved === next.message.planApproved &&
    prev.message.toolPreview === next.message.toolPreview
);
MessageBubble.displayName = "MessageBubble";

function renderSegment(seg: MessageSegment, key: number) {
  if (seg.type === "text") {
    return (
      <MarkdownText
        key={key}
        text={seg.content}
        baseStyle={styles.assistantBubbleText}
      />
    );
  }

  if (!seg.isComplete) {
    return (
      <Text key={key} style={styles.incompleteCode}>
        {seg.content}
      </Text>
    );
  }

  if (seg.isDiff) {
    return (
      <DiffCard
        key={key}
        filename={seg.filename}
        code={seg.content}
        language={seg.language}
        isDiffBlock={seg.isDiff}
      />
    );
  }

  return <CodeCard key={key} code={seg.content} language={seg.language} />;
}

/* ── File Activity Badge ── */
function FileActivityBadge() {
  const activeFile = useStore((s) => s.activeAgentFile);
  if (!activeFile) return null;

  const name = basename(activeFile);
  return (
    <View style={styles.fileActivityBadge}>
      <Ionicons name="document-outline" size={12} color={colors.accent} />
      <Text style={styles.fileActivityText} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

/* ── AgentBar ── */
export default function AgentBar() {
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const isAutoScrollActiveRef = useRef(true);
  const userDraggingRef = useRef(false);
  const prevMsgCountRef = useRef(0);
  const prevStreamingByIdRef = useRef<Map<string, boolean>>(new Map());
  const prevAgentStatusRef = useRef<string | null>(null);

  const messages = useStore((s) => s.messages);
  const agentStatus = useStore((s) => s.agentStatus);
  const isAgentChatOpen = useStore((s) => s.isAgentChatOpen);
  const setAgentChatOpen = useStore((s) => s.setAgentChatOpen);
  const terminalPanelOpen = useStore((s) => s.terminalPanelOpen);
  const fileTreeOpen = useStore((s) => s.fileTreeOpen);
  const floatingPillHeight = useStore((s) => s.floatingPillHeight);
  const setAgentBarHeight = useStore((s) => s.setAgentBarHeight);

  const notifyChatDragClosed = useCallback(() => {
    setAgentChatOpen(false);
  }, [setAgentChatOpen]);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom =
      contentSize.height - layoutMeasurement.height - contentOffset.y;
    if (userDraggingRef.current) {
      isAutoScrollActiveRef.current = distanceFromBottom < AUTO_FOLLOW_THRESHOLD;
    }
  }, []);

  const handleScrollBeginDrag = useCallback(() => {
    userDraggingRef.current = true;
  }, []);

  const handleScrollEndDrag = useCallback(() => {
    userDraggingRef.current = false;
  }, []);

  const handleMomentumScrollEnd = useCallback(() => {
    userDraggingRef.current = false;
  }, []);

  const measuredContentRef = useRef(0);

  const chatHeight = useSharedValue(DEFAULT_HEIGHT);
  const startHeight = useSharedValue(DEFAULT_HEIGHT);
  const keyboard = useAnimatedKeyboard();

  const TIMING_CONFIG = { duration: 200, easing: Easing.out(Easing.cubic) };

  const computeFitTarget = useCallback(
    (contentHeight: number) => {
      const availableHeight =
        SCREEN_HEIGHT - keyboard.height.value - HEADER_HEIGHT - floatingPillHeight;
      const dynamicMax = Math.min(MAX_HEIGHT, availableHeight);
      const CHROME = HANDLE_ROW_HEIGHT + spacing.lg + spacing.lg;
      return Math.min(
        Math.max(MIN_HEIGHT, contentHeight + CHROME),
        DEFAULT_OPEN_HEIGHT,
        dynamicMax
      );
    },
    [floatingPillHeight, keyboard]
  );

  const handleContentSizeChange = useCallback(
    (_w: number, h: number) => {
      measuredContentRef.current = h;
      if (isAutoScrollActiveRef.current && !userDraggingRef.current) {
        listRef.current?.scrollToEnd({ animated: true });
      }
      if (useStore.getState().isAgentChatOpen) {
        const target = computeFitTarget(h);
        if (target > chatHeight.value) {
          chatHeight.value = withTiming(target, TIMING_CONFIG);
        }
      }
    },
    [computeFitTarget, chatHeight]
  );

  const didActivate = useSharedValue(false);

  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onStart(() => {
      startHeight.value = chatHeight.value;
      didActivate.value = true;
    })
    .onUpdate((e) => {
      const availableHeight =
        SCREEN_HEIGHT - keyboard.height.value - HEADER_HEIGHT - floatingPillHeight;
      const dynamicMax = Math.min(MAX_HEIGHT, availableHeight);
      const newHeight = startHeight.value - e.translationY;
      chatHeight.value = Math.min(
        dynamicMax,
        Math.max(MIN_HEIGHT, newHeight)
      );
    })
    .onFinalize(() => {
      if (!didActivate.value) return;
      didActivate.value = false;
      const availableHeight =
        SCREEN_HEIGHT - keyboard.height.value - HEADER_HEIGHT - floatingPillHeight;
      const dynamicMax = Math.min(MAX_HEIGHT, availableHeight);
      if (chatHeight.value < MIN_HEIGHT) {
        chatHeight.value = withTiming(0, TIMING_CONFIG);
        runOnJS(notifyChatDragClosed)();
      } else {
        chatHeight.value = withTiming(
          Math.min(
            dynamicMax,
            Math.max(MIN_HEIGHT, chatHeight.value)
          ),
          TIMING_CONFIG
        );
      }
    });

  const handleCollapse = useCallback(() => {
    setAgentChatOpen(false);
    Keyboard.dismiss();
  }, [setAgentChatOpen]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    const availableHeight =
      SCREEN_HEIGHT - keyboard.height.value - HEADER_HEIGHT - floatingPillHeight;
    const dynamicMax = Math.min(MAX_HEIGHT, availableHeight);
    const h = Math.min(chatHeight.value, Math.max(0, dynamicMax));
    return {
      height: h,
      opacity: h > 0 ? 1 : 0,
    };
  });

  useEffect(() => {
    if (isAgentChatOpen) {
      const target = computeFitTarget(measuredContentRef.current);
      chatHeight.value = withTiming(target, TIMING_CONFIG);
    } else if (terminalPanelOpen || fileTreeOpen) {
      chatHeight.value = 0;
    } else {
      chatHeight.value = withTiming(0, TIMING_CONFIG);
    }
  }, [isAgentChatOpen, terminalPanelOpen, fileTreeOpen]);

  useEffect(() => {
    if (messages.length > prevMsgCountRef.current && messages.length > 0) {
      if (!isAgentChatOpen) setAgentChatOpen(true);
      isAutoScrollActiveRef.current = true;
    }
    prevMsgCountRef.current = messages.length;
  }, [messages.length]);

  // When a streaming message finalizes, parseMessageContent restructures the
  // bubble (inline text → text + CodeCard segments), shifting total height.
  // handleContentSizeChange won't fire scrollToEnd on a shrink, so pin to the
  // bottom here if the user was already there.
  useEffect(() => {
    let completed = false;
    for (const m of messages) {
      const prev = prevStreamingByIdRef.current.get(m.id);
      const now = !!m.isStreaming;
      if (prev === true && now === false) completed = true;
      prevStreamingByIdRef.current.set(m.id, now);
    }
    if (prevStreamingByIdRef.current.size > messages.length * 2) {
      const alive = new Set(messages.map((m) => m.id));
      for (const id of prevStreamingByIdRef.current.keys()) {
        if (!alive.has(id)) prevStreamingByIdRef.current.delete(id);
      }
    }
    if (!completed) return;
    if (userDraggingRef.current) return;
    if (!isAutoScrollActiveRef.current) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages]);

  useEffect(() => {
    const was = prevAgentStatusRef.current;
    prevAgentStatusRef.current = agentStatus;
    if (
      was &&
      !agentStatus &&
      isAutoScrollActiveRef.current &&
      !userDraggingRef.current
    ) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [agentStatus]);

  const footerComponent = useMemo(() => {
    if (!agentStatus) return null;
    return (
      <View>
        <FileActivityBadge />
        <AgentStatus status={agentStatus} />
      </View>
    );
  }, [agentStatus]);

  const contentContainerStyle = useMemo(
    () => ({
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
    }),
    []
  );

  const renderMessageItem = useCallback(
    ({ item }: { item: ChatMessage }) => <MessageBubble message={item} />,
    []
  );

  const keyExtractor = useCallback((m: ChatMessage) => m.id, []);

  return (
    <Animated.View
      pointerEvents={isAgentChatOpen ? "auto" : "none"}
      style={[styles.container, animatedContainerStyle]}
      onLayout={(e) => setAgentBarHeight(e.nativeEvent.layout.height)}
    >
      {messages.length > 0 && (
        <View>
          <GestureDetector gesture={panGesture}>
            <Animated.View style={styles.handleRow}>
              <View style={styles.handlePill} />
            </Animated.View>
          </GestureDetector>
          <TouchableOpacity
            onPress={handleCollapse}
            style={styles.collapseBtn}
            hitSlop={8}
          >
            <Ionicons name="close" size={14} color={colors.accentText} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.scrollWrapper}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={keyExtractor}
          renderItem={renderMessageItem}
          ListFooterComponent={footerComponent}
          contentContainerStyle={contentContainerStyle}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          indicatorStyle="white"
          scrollEventThrottle={16}
          removeClippedSubviews={false}
          initialNumToRender={15}
          maxToRenderPerBatch={8}
          windowSize={10}
          onScroll={handleScroll}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onContentSizeChange={handleContentSizeChange}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    overflow: "hidden",
  },
  handleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  collapseBtn: {
    position: "absolute",
    right: 12,
    top: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  handlePill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  scrollWrapper: {
    flex: 1,
    minHeight: 0,
  },

  /* ── Expand Footer ── */
  expandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  expandText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  /* ── Fullscreen Expand Modal ── */
  modalContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  modalTitle: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.md,
    color: colors.text,
  },
  modalBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    flex: 1,
    backgroundColor: colors.editorBg,
  },
  modalBodyContent: {
    padding: spacing.md,
  },

  /* ── Thinking ── */
  thinkingContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  thinkingHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 4,
  },
  thinkingLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  thinkingBody: {
    maxHeight: 200,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  thinkingText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 16,
  },
  thinkingTextModal: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },

  /* ── Plan Card ── */
  planCard: {
    marginVertical: 10,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  planCardPending: {
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  planCardApproved: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  planCardRejected: {
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.6,
  },
  planAccentStrip: {
    height: 4,
    backgroundColor: colors.accent,
  },
  planAccentStripDim: {
    height: 4,
    backgroundColor: colors.accentDim,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 6,
  },
  planHeaderText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.chatLabel,
    color: colors.accent,
    flex: 1,
  },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  planBadgeText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.xs,
    color: colors.accent,
  },
  planBadgeTextMuted: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  planBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  planText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.chatBody,
    color: colors.text,
    lineHeight: 24,
  },
  planActions: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  planBuildBtn: {
    flex: 2,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  planBuildBtnText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.md,
    color: colors.accentText,
  },
  planRejectBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  planRejectBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },

  /* ── File Activity ── */
  fileActivityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: 4,
  },
  fileActivityText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.accent,
    flexShrink: 1,
  },

  /* ── Bubbles ── */
  bubbleWrapper: {
    marginVertical: 10,
  },
  bubble: {
    maxWidth: "85%",
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.userBubble,
    borderRadius: radii.xl2,
    borderBottomRightRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "transparent",
    paddingHorizontal: 0,
  },
  bubbleText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.chatBody,
    lineHeight: 24,
  },
  userBubbleText: {
    color: colors.text,
  },
  assistantBubbleText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.chatBody,
    color: colors.text,
    lineHeight: 26,
  },
  incompleteCode: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.text,
    backgroundColor: colors.editorBg,
    padding: spacing.md,
    borderRadius: radii.md,
    marginVertical: spacing.xs,
    overflow: "hidden",
  },
  linkText: {
    color: colors.accent,
    textDecorationLine: "underline" as const,
  },


  /* ── Tool Rows ── */
  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 2,
    marginVertical: 2,
  },
  toolIcon: {
    marginRight: 6,
  },
  toolText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    flexShrink: 1,
  },
  toolCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    marginVertical: 4,
    overflow: "hidden",
  },
  toolCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 6,
  },
  toolDiffActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toolDiffActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.accent + "33",
  },
  toolDiffActionBtnSecondary: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toolDiffActionText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    color: colors.accent,
  },
  toolDiffActionTextSecondary: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  toolCardName: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
  },
  diffBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  diffAdded: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    color: colors.success,
  },
  diffRemoved: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  diffBody: {
    maxHeight: 260,
    overflow: "hidden",
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  diffLine: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 20,
  },
  diffLineAdded: {
    backgroundColor: colors.diffAddedBg,
  },
  diffLineRemoved: {
    backgroundColor: colors.diffRemovedBg,
  },
  diffBar: {
    width: 3,
    alignSelf: "stretch",
  },
  diffBarAdded: {
    backgroundColor: colors.diffAddedBar,
  },
  diffBarRemoved: {
    backgroundColor: colors.diffRemovedBar,
  },
  diffLineText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.text,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    flex: 1,
  },
  outputBody: {
    maxHeight: 180,
    overflow: "hidden",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.sm,
  },
  outputText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 18,
  },
  toolPreview: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  toolPreviewText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 15,
  },
});
