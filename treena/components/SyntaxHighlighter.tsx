import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import lowlight from "lowlight";
import { colors, fonts, fontSize } from "@/constants/theme";
import { getLanguageFromFilename } from "@/constants/languages";
import {
  EDITOR_BOTTOM_PAD,
  EDITOR_TOP_PAD,
  getLineHeightPx,
} from "@/lib/editor/lineHeight";

const theme: Record<string, string> = {
  "hljs-keyword": "#569CD6",
  "hljs-built_in": "#569CD6",
  "hljs-type": "#4EC9B0",
  "hljs-literal": "#569CD6",
  "hljs-number": "#B5CEA8",
  "hljs-string": "#CE9178",
  "hljs-comment": "#6A9955",
  "hljs-function": "#DCDCAA",
  "hljs-title": "#DCDCAA",
  "hljs-params": "#9CDCFE",
  "hljs-variable": "#9CDCFE",
  "hljs-attr": "#9CDCFE",
  "hljs-class": "#4EC9B0",
  "hljs-operator": "#D4D4D4",
  "hljs-punctuation": "#D4D4D4",
  "hljs-tag": "#569CD6",
  "hljs-name": "#569CD6",
  "hljs-selector-tag": "#D7BA7D",
  "hljs-selector-class": "#D7BA7D",
  "hljs-property": "#9CDCFE",
  "hljs-meta": "#569CD6",
  "hljs-regexp": "#D16969",
  "hljs-subst": "#D4D4D4",
  "hljs-template-variable": "#9CDCFE",
  "hljs-addition": "#4EC994",
  "hljs-deletion": "#F14C4C",
};

const DEFAULT_COLOR = "#D4D4D4";

function getColor(classNames: string[]): string | null {
  for (const cls of classNames) {
    const c = theme[cls];
    if (c) return c;
  }
  return null;
}

interface Segment {
  text: string;
  color: string | null;
}

function flattenNodes(nodes: any[], inherited: string[] = []): Segment[] {
  const result: Segment[] = [];
  for (const node of nodes) {
    if (node.type === "text") {
      result.push({ text: node.value, color: getColor(inherited) });
    } else if (node.children) {
      const cls = [...inherited, ...(node.properties?.className ?? [])];
      result.push(...flattenNodes(node.children, cls));
    }
  }
  return result;
}

function segmentsToLines(segs: Segment[]): Segment[][] {
  const lines: Segment[][] = [[]];
  for (const seg of segs) {
    const parts = seg.text.split("\n");
    lines[lines.length - 1].push({ text: parts[0], color: seg.color });
    for (let i = 1; i < parts.length; i++) {
      lines.push([{ text: parts[i], color: seg.color }]);
    }
  }
  return lines;
}

interface Props {
  code: string;
  filename: string;
  codeFontSize?: number;
  charWidth?: number;
  bottomPadding?: number;
  lineDiff?: Record<number, "added" | "removed">;
  activeLine?: number;
  lineHeightPx?: number;
}

function CustomSyntaxHighlighter({
  code,
  filename,
  codeFontSize,
  charWidth: charWidthProp,
  bottomPadding,
  lineDiff,
  activeLine,
  lineHeightPx,
}: Props) {
  const language = getLanguageFromFilename(filename);
  const size = codeFontSize ?? fontSize.code;
  const rowHeight = lineHeightPx ?? getLineHeightPx(size);

  const lines = useMemo(() => {
    try {
      const result = lowlight.highlight(language, code);
      return segmentsToLines(flattenNodes(result.value));
    } catch {
      return (code || "").split("\n").map((l) => [{ text: l, color: null } as Segment]);
    }
  }, [code, language]);

  const { indentLevels, indentWidth } = useMemo(() => {
    const raw = (code || "").split("\n");
    let detectedWidth = 2;
    for (const line of raw) {
      const m = line.match(/^([ \t]+)/);
      if (!m) continue;
      const leading = m[1]!;
      if (leading.startsWith("\t")) {
        detectedWidth = 1;
        break;
      }
      detectedWidth = leading.length >= 4 ? 4 : 2;
      break;
    }
    const initial = raw.map((line) => {
      const m = line.match(/^([ \t]*)/);
      const leading = m?.[1] ?? "";
      if (leading.length === 0) return 0;
      if (leading.startsWith("\t")) {
        const tabs = leading.match(/\t/g)?.length ?? 0;
        return tabs;
      }
      return Math.floor(leading.length / detectedWidth);
    });
    const filled = [...initial];
    for (let i = 0; i < raw.length; i++) {
      if (raw[i]!.trim() !== "") continue;
      let prev = 0;
      for (let j = i - 1; j >= 0; j--) {
        if (raw[j]!.trim() !== "") {
          prev = initial[j]!;
          break;
        }
      }
      let next = 0;
      for (let j = i + 1; j < raw.length; j++) {
        if (raw[j]!.trim() !== "") {
          next = initial[j]!;
          break;
        }
      }
      filled[i] = Math.min(prev, next);
    }
    return { indentLevels: filled, indentWidth: detectedWidth };
  }, [code]);

  const charWidth = charWidthProp ?? size * 0.6;

  const renderLine = (segs: Segment[], i: number) => {
    const lineNum = i + 1;
    const mark = lineDiff?.[lineNum];
    const isActive = activeLine === lineNum;
    const level = indentLevels[i] ?? 0;
    const guides: React.ReactNode[] = [];
    for (let k = 1; k < level; k++) {
      guides.push(
        <View
          key={`g${k}`}
          style={[
            styles.indentGuide,
            { left: 8 + k * indentWidth * charWidth },
          ]}
        />
      );
    }
    return (
      <View
        key={i}
        style={[
          styles.lineRow,
          { height: rowHeight },
          isActive && styles.lineRowActive,
          mark === "added" && styles.lineRowAdded,
          mark === "removed" && styles.lineRowRemoved,
        ]}
      >
        {guides}
        <Text
          style={[
            styles.lineCode,
            styles.lineCodeNoWrap,
            { fontSize: size, lineHeight: rowHeight },
          ]}
        >
          {segs.map((seg, j) =>
            seg.color ? (
              <Text key={j} style={{ color: seg.color }}>
                {seg.text}
              </Text>
            ) : (
              seg.text
            )
          )}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {lines.map(renderLine)}
      <View style={{ height: bottomPadding ?? EDITOR_BOTTOM_PAD }} />
    </View>
  );
}

export default React.memo(CustomSyntaxHighlighter);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.editorBg,
    paddingTop: EDITOR_TOP_PAD,
  },
  lineRow: {
    flexDirection: "row",
    alignItems: "stretch",
    minWidth: "100%",
  },
  lineRowActive: {
    backgroundColor: colors.activeLineBg,
  },
  lineRowAdded: {
    backgroundColor: colors.diffAddedBg + "55",
  },
  lineRowRemoved: {
    backgroundColor: colors.diffRemovedBg + "55",
  },
  lineCode: {
    fontFamily: fonts.mono,
    color: DEFAULT_COLOR,
    flex: 1,
    paddingLeft: 8,
    paddingRight: 12,
    includeFontPadding: false,
  },
  lineCodeNoWrap: {
    flex: 0,
    flexShrink: 0,
  },
  indentGuide: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.border,
    opacity: 0.6,
  },
});
