/**
 * Compute the editor gutter width for a given digit count + code font size.
 * Chrome = paddingLeft(2) + diffStripe(3) + stripeMarginRight(6) + lineNumPaddingLeft(4)
 *        + lineNumPaddingRight(6) + 3px safety = 24.
 * Char width multiplier 0.72 covers JetBrainsMono's natural advance plus RN's text-measurement slack.
 */
export function computeGutterWidth(digits: number, fontPx: number): number {
  const charWidth = Math.ceil(fontPx * 0.72);
  const chrome = 24;
  return Math.max(1, digits) * charWidth + chrome;
}
