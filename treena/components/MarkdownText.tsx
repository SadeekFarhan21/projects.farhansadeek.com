import React from "react";
import { Text, View, StyleSheet, TextStyle, Linking } from "react-native";
import { colors, fonts, fontSize, spacing, radii } from "@/constants/theme";

interface MarkdownTextProps {
  text: string;
  baseStyle?: TextStyle;
}

const INLINE_RE =
  /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[([^\]]+)\]\(([^)]+)\))/;

function renderInline(
  text: string,
  key: string
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let i = 0;

  while (remaining.length > 0) {
    const match = INLINE_RE.exec(remaining);
    if (!match) {
      parts.push(remaining);
      break;
    }

    if (match.index > 0) {
      parts.push(remaining.slice(0, match.index));
    }

    const token = match[0];
    const k = `${key}_${i++}`;

    if (token.startsWith("**")) {
      parts.push(
        <Text key={k} style={inlineStyles.bold}>
          {token.slice(2, -2)}
        </Text>
      );
    } else if (token.startsWith("`")) {
      parts.push(
        <Text key={k} style={inlineStyles.inlineCode}>
          {token.slice(1, -1)}
        </Text>
      );
    } else if (token.startsWith("[")) {
      const linkText = match[2];
      const url = match[3];
      parts.push(
        <Text
          key={k}
          style={inlineStyles.link}
          onPress={() => Linking.openURL(url)}
        >
          {linkText}
        </Text>
      );
    } else if (token.startsWith("*")) {
      parts.push(
        <Text key={k} style={inlineStyles.italic}>
          {token.slice(1, -1)}
        </Text>
      );
    }

    remaining = remaining.slice(match.index + token.length);
  }

  return parts;
}

function classifyLine(line: string) {
  if (/^#{1,3}\s/.test(line)) {
    const level = line.match(/^(#{1,3})\s/)![1].length as 1 | 2 | 3;
    return { type: "heading" as const, level, content: line.replace(/^#{1,3}\s/, "") };
  }
  if (/^[-*]\s/.test(line)) {
    return { type: "bullet" as const, content: line.replace(/^[-*]\s/, "") };
  }
  if (/^\d+\.\s/.test(line)) {
    return { type: "numbered" as const, content: line.replace(/^\d+\.\s/, "") };
  }
  if (line.startsWith("> ")) {
    return { type: "blockquote" as const, content: line.slice(2) };
  }
  if (/^---+$|^\*\*\*+$/.test(line.trim())) {
    return { type: "hr" as const, content: "" };
  }
  return { type: "paragraph" as const, content: line };
}

const headingSize = { 1: fontSize.xl, 2: fontSize.lg, 3: fontSize.md } as const;

function MarkdownText({ text, baseStyle }: MarkdownTextProps) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const rawLine = lines[i];

    // Fenced code block: ``` or ```lang on its own line starts a block.
    if (/^```[\w-]*\s*$/.test(rawLine)) {
      const content: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        content.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // consume closing fence
      const kFence = `md_fence_${key++}`;
      elements.push(
        <View key={kFence} style={inlineStyles.fencedBlock}>
          <Text style={inlineStyles.fencedBlockText}>{content.join("\n")}</Text>
        </View>
      );
      continue;
    }

    const { type, content, level } = classifyLine(rawLine) as any;
    const k = `md_${key++}`;

    switch (type) {
      case "heading":
        elements.push(
          <Text
            key={k}
            style={[
              baseStyle,
              inlineStyles.heading,
              { fontSize: headingSize[level as 1 | 2 | 3] },
            ]}
          >
            {renderInline(content, k)}
          </Text>
        );
        break;
      case "bullet":
        elements.push(
          <View key={k} style={inlineStyles.bulletRow}>
            <Text style={[baseStyle, inlineStyles.bulletDot]}>{"\u2022"}</Text>
            <Text style={[baseStyle, inlineStyles.bulletText]}>
              {renderInline(content, k)}
            </Text>
          </View>
        );
        break;
      case "numbered":
        elements.push(
          <View key={k} style={inlineStyles.bulletRow}>
            <Text style={[baseStyle, inlineStyles.bulletDot]}>
              {rawLine.match(/^(\d+)\./)?.[1]}.
            </Text>
            <Text style={[baseStyle, inlineStyles.bulletText]}>
              {renderInline(content, k)}
            </Text>
          </View>
        );
        break;
      case "blockquote":
        elements.push(
          <View key={k} style={inlineStyles.blockquote}>
            <Text style={[baseStyle, inlineStyles.blockquoteText]}>
              {renderInline(content, k)}
            </Text>
          </View>
        );
        break;
      case "hr":
        elements.push(
          <View key={k} style={inlineStyles.hr} />
        );
        break;
      default:
        if (content.trim() === "") {
          elements.push(<View key={k} style={{ height: 8 }} />);
        } else {
          elements.push(
            <Text key={k} style={baseStyle}>
              {renderInline(content, k)}
            </Text>
          );
        }
        break;
    }
    i++;
  }

  return <View>{elements}</View>;
}

export default React.memo(MarkdownText, (prev, next) => prev.text === next.text);

const inlineStyles = StyleSheet.create({
  bold: {
    fontFamily: fonts.sansSemiBold,
  },
  italic: {
    fontStyle: "italic",
  },
  inlineCode: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    backgroundColor: colors.surfaceLight,
    color: colors.accent,
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  link: {
    color: colors.accent,
    textDecorationLine: "underline",
  },
  heading: {
    fontFamily: fonts.sansSemiBold,
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: "row",
    paddingLeft: 8,
    marginVertical: 2,
  },
  bulletDot: {
    width: 16,
    color: colors.textSecondary,
  },
  bulletText: {
    flex: 1,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    paddingLeft: spacing.md,
    marginVertical: 4,
  },
  blockquoteText: {
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  hr: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  fencedBlock: {
    backgroundColor: colors.editorBg,
    borderRadius: radii.sm,
    padding: 10,
    marginVertical: 6,
  },
  fencedBlockText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: fontSize.sm * 1.45,
  },
});
