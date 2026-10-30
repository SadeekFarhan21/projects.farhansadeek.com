import React, { useEffect, useState } from "react";
import { Text, StyleSheet } from "react-native";
import { fonts } from "@/constants/theme";
import { getLineHeightPx } from "@/lib/editor/lineHeight";

const SAMPLE = "MMMMMMMMMM";
const cache = new Map<number, number>();

export function getCachedCharWidth(fontPx: number): number {
  return cache.get(fontPx) ?? fontPx * 0.65;
}

export function useMeasuredCharWidth(fontPx: number): {
  charWidth: number;
  probe: React.ReactNode;
} {
  const [charWidth, setCharWidth] = useState(() => getCachedCharWidth(fontPx));

  useEffect(() => {
    setCharWidth(getCachedCharWidth(fontPx));
  }, [fontPx]);

  const needsMeasure = !cache.has(fontPx);

  const probe = needsMeasure ? (
    <Text
      style={[styles.probe, { fontSize: fontPx, lineHeight: getLineHeightPx(fontPx) }]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width / SAMPLE.length;
        if (w > 0) {
          cache.set(fontPx, w);
          setCharWidth(w);
        }
      }}
    >
      {SAMPLE}
    </Text>
  ) : null;

  return { charWidth, probe };
}

const styles = StyleSheet.create({
  probe: {
    position: "absolute",
    opacity: 0,
    top: -9999,
    left: -9999,
    fontFamily: fonts.mono,
    includeFontPadding: false,
  },
});
