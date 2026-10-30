import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fonts, fontSize } from "@/constants/theme";
import {
  EDITOR_BOTTOM_PAD,
  EDITOR_TOP_PAD,
  getLineHeightPx,
} from "@/lib/editor/lineHeight";

interface Props {
  code: string;
  codeFontSize?: number;
  gutterWidth: number;
  lineDiff?: Record<number, "added" | "removed">;
  activeLine?: number;
  lineHeightPx?: number;
  topPadding?: number;
  bottomPadding?: number;
}

function LineGutter({
  code,
  codeFontSize,
  gutterWidth,
  lineDiff,
  activeLine,
  lineHeightPx,
  topPadding,
  bottomPadding,
}: Props) {
  const size = codeFontSize ?? fontSize.code;
  const rowHeight = lineHeightPx ?? getLineHeightPx(size);

  const lineCount = useMemo(() => {
    if (!code) return 1;
    return code.split("\n").length;
  }, [code]);

  const rows: React.ReactNode[] = [];
  for (let i = 0; i < lineCount; i++) {
    const lineNum = i + 1;
    const mark = lineDiff?.[lineNum];
    const isActive = activeLine === lineNum;
    rows.push(
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
        {mark ? (
          <View
            style={[
              styles.diffStripe,
              mark === "added" ? styles.stripeAdded : styles.stripeRemoved,
            ]}
          />
        ) : (
          <View style={styles.diffStripeSpacer} />
        )}
        <Text
          style={[
            styles.lineNum,
            { flex: 1, fontSize: size, lineHeight: rowHeight },
            isActive && styles.lineNumActive,
          ]}
          numberOfLines={1}
          selectable={false}
          accessible={false}
        >
          {lineNum}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { width: gutterWidth, paddingTop: topPadding ?? EDITOR_TOP_PAD },
      ]}
    >
      {rows}
      <View style={{ height: bottomPadding ?? EDITOR_BOTTOM_PAD }} />
    </View>
  );
}

export default React.memo(LineGutter);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.editorBg,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },
  lineRow: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingLeft: 2,
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
  diffStripe: {
    width: 3,
    alignSelf: "stretch",
    marginRight: 6,
    borderRadius: 1.5,
  },
  diffStripeSpacer: {
    width: 3,
    marginRight: 6,
  },
  stripeAdded: {
    backgroundColor: colors.diffAddedBar,
  },
  stripeRemoved: {
    backgroundColor: colors.diffRemovedBar,
  },
  lineNum: {
    fontFamily: fonts.mono,
    color: colors.lineNumber,
    textAlign: "right",
    paddingRight: 6,
    paddingLeft: 4,
    includeFontPadding: false,
  },
  lineNumActive: {
    color: colors.activeLineNumber,
  },
});
