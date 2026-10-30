/**
 * Detect a single-character insertion (e.g. Enter) and return index + char.
 */
function findSingleCharInsert(
  oldS: string,
  newS: string
): { index: number; char: string } | null {
  if (newS.length !== oldS.length + 1) return null;
  let i = 0;
  const len = oldS.length;
  while (i < len && oldS[i] === newS[i]) i++;
  return { index: i, char: newS[i] };
}

export type NewlineIndentResult = {
  text: string;
  selectionStart: number;
  selectionEnd: number;
};

/**
 * If newText is oldText with exactly one newline inserted, return text with
 * auto-indent after that newline and the caret position. Otherwise null.
 */
export function applyNewlineAutoIndent(
  oldText: string,
  newText: string
): NewlineIndentResult | null {
  const ins = findSingleCharInsert(oldText, newText);
  if (!ins || ins.char !== "\n") return null;

  const { index } = ins;
  const lineStart =
    index <= 0 ? 0 : oldText.lastIndexOf("\n", index - 1) + 1;
  const prevLine = oldText.slice(lineStart, index);
  const leading = (prevLine.match(/^[\t ]*/) ?? [""])[0];
  const trimmedEnd = prevLine.trimEnd();
  const last = trimmedEnd.length > 0 ? trimmedEnd[trimmedEnd.length - 1] : "";
  const shouldIncrease =
    last === "{" || last === "(" || last === "[" || last === ":";

  const indentUnit = leading.includes("\t") ? "\t" : "  ";
  const extra = shouldIncrease ? indentUnit : "";
  const finalText =
    oldText.slice(0, index) + "\n" + leading + extra + oldText.slice(index);

  const cursor = index + 1 + leading.length + extra.length;
  return {
    text: finalText,
    selectionStart: cursor,
    selectionEnd: cursor,
  };
}
