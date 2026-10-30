import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
} from "react-native";
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from "react-native-reanimated";
import { colors, fonts, fontSize } from "@/constants/theme";
import { useStore, codeFontSizeValues } from "@/store";
import SyntaxHighlighter from "./SyntaxHighlighter";
import LineGutter from "./LineGutter";
import MarkdownText from "./MarkdownText";
import ImageViewer from "./ImageViewer";
import { useFileSystem } from "@/hooks/useFileSystem";
import { useRemoteFileDiagnostics } from "@/hooks/useRemoteFileDiagnostics";
import { isRemoteWorkspacePath, remotePathToRel } from "@/lib/workspace/remotePaths";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { applyNewlineAutoIndent } from "@/lib/editor/autoIndent";
import { computeGutterWidth } from "@/lib/editor/gutterWidth";
import { useMeasuredCharWidth } from "@/lib/editor/charWidth";
import {
  EDITOR_BOTTOM_PAD,
  EDITOR_TOP_PAD,
  getLineHeightPx,
} from "@/lib/editor/lineHeight";

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|bmp|ico|heic|heif)$/i;

function offsetToLineChar(text: string, offset: number): { line: number; character: number } {
  let line = 0;
  let lineStart = 0;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === "\n") {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, character: Math.max(0, offset - lineStart) };
}

export default function CodeViewer() {
  useRemoteFileDiagnostics();
  const content = useStore((s) => s.currentFileContent);
  const filename = useStore((s) => s.currentFileName);
  const currentFilePath = useStore((s) => s.currentFilePath);
  const setIsEditingCode = useStore((s) => s.setIsEditingCode);
  const setAgentChatOpen = useStore((s) => s.setAgentChatOpen);
  const editBuffer = useStore((s) => s.editBuffer);
  const setEditBuffer = useStore((s) => s.setEditBuffer);
  const updateContent = useStore((s) => s.updateContent);
  const codeFontSizePref = useStore((s) => s.codeFontSize);
  const codeFontPx = codeFontSizeValues[codeFontSizePref];
  const lineHeightPx = getLineHeightPx(codeFontPx);
  const lineCount = (editBuffer.match(/\n/g) ?? []).length + 1;
  const digits = Math.max(3, String(lineCount).length);
  const gutterW = computeGutterWidth(digits, codeFontPx);
  const longestLineChars = useMemo(() => {
    let max = 0;
    for (const line of (editBuffer || "").split("\n")) {
      if (line.length > max) max = line.length;
    }
    return max;
  }, [editBuffer]);
  const { charWidth: measuredCharWidth, probe: charWidthProbe } =
    useMeasuredCharWidth(codeFontPx);
  const [hScrollViewport, setHScrollViewport] = useState(0);
  const codePixelWidth = useMemo(() => {
    // lineCode paddingLeft(8) + chars + lineCode paddingRight(12) + 32 safety buffer
    const contentW = 8 + Math.ceil(longestLineChars * measuredCharWidth) + 12 + 32;
    // Ensure at least viewport width so short files still fill the editor
    return Math.max(contentW, hScrollViewport);
  }, [longestLineChars, measuredCharWidth, hScrollViewport]);
  const remoteDiagnosticsByPath = useStore((s) => s.remoteDiagnosticsByPath);
  const terminalPanelOpen = useStore((s) => s.terminalPanelOpen);
  const currentDiff = useStore((s) => s.currentDiff);
  const markdownPreviewOpen = useStore((s) => s.markdownPreviewOpen);
  const setMarkdownPreviewOpen = useStore((s) => s.setMarkdownPreviewOpen);

  const isMarkdown = (filename || "").toLowerCase().endsWith(".md");

  const keyboard = useAnimatedKeyboard();
  const floatingPillHeight = useStore((s) => s.floatingPillHeight);
  const agentBarHeight = useStore((s) => s.agentBarHeight);
  const pillKeyboardActive = useStore((s) => s.pillKeyboardActive);

  const editorInsetStyle = useAnimatedStyle(() => {
    if (terminalPanelOpen) {
      return { paddingBottom: 0 };
    }
    const chrome = floatingPillHeight + agentBarHeight;
    // When the keyboard is opened by the pill, the pill slides above the keyboard
    // so we need BOTH (chrome + keyboard). Otherwise the keyboard covers the pill
    // so we only need the larger of the two.
    const inset = pillKeyboardActive
      ? chrome + keyboard.height.value
      : Math.max(chrome, keyboard.height.value);
    return { paddingBottom: inset };
  }, [terminalPanelOpen, floatingPillHeight, agentBarHeight, pillKeyboardActive]);

  const { saveEditBuffer } = useFileSystem();
  const inputRef = useRef<TextInput>(null);
  const horizontalScrollRef = useRef<ScrollView>(null);
  const horizontalScrollX = useRef(0);
  const [caretOffset, setCaretOffset] = useState(0);
  const [editing, setEditing] = useState(false);

  const activeLineNum = useMemo(
    () => (editing ? offsetToLineChar(editBuffer, caretOffset).line + 1 : 0),
    [editing, editBuffer, caretOffset]
  );

  const ensureCaretVisible = useCallback(
    (offset: number) => {
      if (!horizontalScrollRef.current || hScrollViewport === 0) return;
      const { character } = offsetToLineChar(editBuffer, offset);
      const caretX = 8 + character * measuredCharWidth;
      const visibleLeft = horizontalScrollX.current;
      const visibleRight = visibleLeft + hScrollViewport;
      const margin = 32;
      if (caretX < visibleLeft + margin) {
        horizontalScrollRef.current.scrollTo({
          x: Math.max(0, caretX - margin),
          animated: false,
        });
      } else if (caretX > visibleRight - margin) {
        horizontalScrollRef.current.scrollTo({
          x: caretX - hScrollViewport + margin,
          animated: false,
        });
      }
    },
    [editBuffer, measuredCharWidth, hScrollViewport]
  );

  // Debounced buffer for autosave (1.5s after last keystroke)
  const debouncedSaveBuffer = useDebouncedValue(editBuffer, 1500);

  // Sync editBuffer when a new file is opened (not on content changes to avoid feedback loop)
  useEffect(() => {
    setEditBuffer(content || "");
    setEditing(false);
    setMarkdownPreviewOpen(false);
  }, [currentFilePath]);

  // Autosave when user stops typing
  useEffect(() => {
    if (currentFilePath && debouncedSaveBuffer !== content) {
      updateContent(debouncedSaveBuffer);
      saveEditBuffer();
    }
  }, [debouncedSaveBuffer]);

  const handleChangeText = useCallback(
    (newText: string) => {
      const oldText = useStore.getState().editBuffer;
      const applied = applyNewlineAutoIndent(oldText, newText);
      if (applied) {
        setEditBuffer(applied.text);
        const pos = applied.selectionStart;
        requestAnimationFrame(() => {
          inputRef.current?.setNativeProps({
            selection: { start: pos, end: pos },
          });
          ensureCaretVisible(pos);
        });
        return;
      }
      setEditBuffer(newText);
    },
    [setEditBuffer, ensureCaretVisible]
  );

  const handleBlur = async () => {
    setEditing(false);
    setIsEditingCode(false);
    if (currentFilePath && editBuffer !== content) {
      updateContent(editBuffer);
      await saveEditBuffer();
    }
  };

  const enterEditMode = useCallback(() => {
    setEditing(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  if (!currentFilePath) {
    return null;
  }

  if (IMAGE_EXT_RE.test(filename || "")) {
    return <ImageViewer path={currentFilePath} filename={filename} />;
  }

  const relForDiag =
    isRemoteWorkspacePath(currentFilePath) && currentFilePath
      ? remotePathToRel(currentFilePath)
      : null;
  const remoteDiags =
    relForDiag && remoteDiagnosticsByPath[relForDiag]
      ? remoteDiagnosticsByPath[relForDiag]
      : [];

  return (
    <View
      style={{
        flex: 1,
        minHeight: 0,
        backgroundColor: colors.editorBg,
      }}
    >
        {charWidthProbe}
        {remoteDiags.length > 0 && (
          <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4, backgroundColor: colors.surfaceLight, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            {remoteDiags.slice(0, 5).map((d, i) => (
              <Text
                key={i}
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  color: d.severity === "error" ? "#ff6b6b" : colors.textSecondary,
                  marginBottom: 4,
                }}
              >
                L{d.line}:{d.col} {d.message}
              </Text>
            ))}
          </View>
        )}
        <View style={{ flex: 1, minHeight: 0 }}>
          {isMarkdown && markdownPreviewOpen ? (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                padding: 16,
                paddingBottom: 16 + floatingPillHeight + agentBarHeight,
              }}
              scrollIndicatorInsets={{ bottom: floatingPillHeight + agentBarHeight }}
              keyboardShouldPersistTaps="always"
              indicatorStyle="white"
            >
              <MarkdownText
                text={editBuffer || ""}
                baseStyle={{
                  color: colors.text,
                  fontFamily: fonts.sans,
                  fontSize: fontSize.md,
                  lineHeight: fontSize.md * 1.5,
                }}
              />
            </ScrollView>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="none"
              indicatorStyle="white"
              nestedScrollEnabled
              scrollIndicatorInsets={{ bottom: floatingPillHeight + agentBarHeight }}
            >
              <Animated.View style={[{ flexGrow: 1, minHeight: "100%" }, editorInsetStyle]}>
                <Pressable
                  style={{
                    flexDirection: "row",
                    alignItems: "stretch",
                    minHeight: "100%",
                  }}
                  onPress={editing ? undefined : enterEditMode}
                >
                  <LineGutter
                    code={editBuffer || ""}
                    codeFontSize={codeFontPx}
                    gutterWidth={gutterW}
                    lineDiff={currentDiff}
                    activeLine={activeLineNum}
                    lineHeightPx={lineHeightPx}
                  />
                  <ScrollView
                    ref={horizontalScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator
                    nestedScrollEnabled
                    directionalLockEnabled
                    automaticallyAdjustContentInsets={false}
                    automaticallyAdjustKeyboardInsets={false}
                    keyboardShouldPersistTaps="always"
                    scrollEventThrottle={16}
                    onLayout={(e) => setHScrollViewport(e.nativeEvent.layout.width)}
                    onScroll={(e) => {
                      horizontalScrollX.current = e.nativeEvent.contentOffset.x;
                    }}
                    style={{ flex: 1 }}
                  >
                    <View
                      style={{
                        position: "relative",
                        minHeight: "100%",
                        width: codePixelWidth,
                      }}
                    >
                      <SyntaxHighlighter
                        code={editBuffer || ""}
                        filename={filename}
                        codeFontSize={codeFontPx}
                        charWidth={measuredCharWidth}
                        bottomPadding={EDITOR_BOTTOM_PAD}
                        lineDiff={currentDiff}
                        activeLine={activeLineNum}
                        lineHeightPx={lineHeightPx}
                      />
                      {editing && (
                        <TextInput
                          ref={inputRef}
                          value={editBuffer}
                          onChangeText={handleChangeText}
                          onFocus={() => {
                            if (currentFilePath) {
                              setIsEditingCode(true);
                              setAgentChatOpen(false);
                            }
                          }}
                          onBlur={handleBlur}
                          onSelectionChange={(e) => {
                            const offset = e.nativeEvent.selection.start;
                            setCaretOffset(offset);
                            ensureCaretVisible(offset);
                          }}
                          selectionColor={colors.accent}
                          cursorColor={colors.accent}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            bottom: 0,
                            width: codePixelWidth,
                            color: "transparent",
                            backgroundColor: "transparent",
                            fontFamily: fonts.mono,
                            fontSize: codeFontPx,
                            lineHeight: lineHeightPx,
                            paddingTop: EDITOR_TOP_PAD,
                            paddingBottom: EDITOR_BOTTOM_PAD,
                            paddingRight: 12,
                            paddingLeft: 8,
                            textAlignVertical: "top",
                            includeFontPadding: false,
                          }}
                          multiline
                          scrollEnabled={false}
                          keyboardAppearance="dark"
                          autoCorrect={false}
                          autoCapitalize="none"
                          spellCheck={false}
                          selectTextOnFocus={false}
                          editable
                        />
                      )}
                    </View>
                  </ScrollView>
                </Pressable>
              </Animated.View>
            </ScrollView>
          )}
        </View>
    </View>
  );
}
