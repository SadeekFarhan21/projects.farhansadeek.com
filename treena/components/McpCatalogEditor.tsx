import { useRef, useCallback, useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { colors, fonts, radii } from "@/constants/theme";
import SyntaxHighlighter from "@/components/SyntaxHighlighter";
import LineGutter from "@/components/LineGutter";
import { computeGutterWidth } from "@/lib/editor/gutterWidth";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  codeFontSize: number;
  /** Minimum height of the editor area (inside ScrollView parents, use explicit size). */
  minHeight?: number;
};

/**
 * Same editing pattern as CodeViewer: sticky gutter column + horizontally-scrollable code + TextInput overlay.
 * No LSP, autosave, or file path — for MCP catalog JSON only.
 */
export default function McpCatalogEditor({
  value,
  onChangeText,
  codeFontSize,
  minHeight = 240,
}: Props) {
  const inputRef = useRef<TextInput>(null);
  const [editing, setEditing] = useState(false);
  const lineCount = (value.match(/\n/g) ?? []).length + 1;
  const digits = Math.max(3, String(lineCount).length);
  const gutterW = computeGutterWidth(digits, codeFontSize);

  const enterEditMode = useCallback(() => {
    setEditing(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  return (
    <View
      style={[
        styles.shell,
        {
          minHeight,
          borderColor: colors.border,
        },
      ]}
    >
      <ScrollView
        style={styles.verticalScroll}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        indicatorStyle="white"
        nestedScrollEnabled
      >
        <Pressable
          style={[styles.row, { minHeight }]}
          onPress={editing ? undefined : enterEditMode}
        >
          <LineGutter
            code={value}
            codeFontSize={codeFontSize}
            gutterWidth={gutterW}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            nestedScrollEnabled
            style={{ flex: 1 }}
          >
            <View style={[styles.codePane, { minWidth: "100%", minHeight }]}>
              <SyntaxHighlighter
                code={value}
                filename="mcp.json"
                codeFontSize={codeFontSize}
                bottomPadding={16}
              />

              <View
                pointerEvents={editing ? "auto" : "none"}
                style={StyleSheet.absoluteFillObject}
              >
                <TextInput
                  ref={inputRef}
                  value={value}
                  onChangeText={onChangeText}
                  onFocus={() => setEditing(true)}
                  onBlur={() => setEditing(false)}
                  selectionColor={colors.accent}
                  style={[
                    styles.input,
                    {
                      fontSize: codeFontSize,
                      lineHeight: codeFontSize * 1.5,
                      paddingLeft: 8,
                    },
                  ]}
                  multiline
                  scrollEnabled={false}
                  keyboardAppearance="dark"
                  autoCorrect={false}
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: colors.editorBg,
  },
  verticalScroll: {
    flexGrow: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  codePane: {
    position: "relative",
  },
  input: {
    flex: 1,
    minHeight: "100%",
    color: "transparent",
    backgroundColor: "transparent",
    fontFamily: fonts.mono,
    paddingTop: 16,
    paddingBottom: 16,
    paddingRight: 12,
    textAlignVertical: "top",
  },
});
