export const LINE_HEIGHT_MULTIPLIER = 1.5;
export const EDITOR_TOP_PAD = 16;
export const EDITOR_BOTTOM_PAD = 16;

export function getLineHeightPx(fontPx: number): number {
  return Math.round(fontPx * LINE_HEIGHT_MULTIPLIER);
}
