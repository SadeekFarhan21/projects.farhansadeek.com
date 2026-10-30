import { diffLines } from "diff";

export function computeLineDiff(
  oldCode: string,
  newCode: string
): Record<number, "added" | "removed"> {
  const result: Record<number, "added" | "removed"> = {};
  const changes = diffLines(oldCode, newCode);

  let lineNumber = 1;
  for (const change of changes) {
    const lines = change.value.split("\n");
    // diffLines includes trailing newline in the value, so the last empty element is not a real line
    const lineCount = change.value.endsWith("\n") ? lines.length - 1 : lines.length;

    if (change.added) {
      for (let i = 0; i < lineCount; i++) {
        result[lineNumber + i] = "added";
      }
      lineNumber += lineCount;
    } else if (change.removed) {
      // Removed lines don't advance line numbers in the new file,
      // but we mark the current position so the gutter can show it
      result[lineNumber] = "removed";
    } else {
      lineNumber += lineCount;
    }
  }

  return result;
}

export interface AgentDiffLine {
  type: "added" | "removed";
  content: string;
}

export function buildAgentDiff(
  oldContent: string,
  newContent: string
): { addedCount: number; removedCount: number; lines: AgentDiffLine[] } {
  const changes = diffLines(oldContent, newContent);
  const lines: AgentDiffLine[] = [];
  let addedCount = 0;
  let removedCount = 0;
  for (const change of changes) {
    if (!change.added && !change.removed) continue;
    const raw = change.value.split("\n");
    if (raw[raw.length - 1] === "") raw.pop();
    for (const line of raw) {
      if (change.added) {
        lines.push({ type: "added", content: line });
        addedCount++;
      } else {
        lines.push({ type: "removed", content: line });
        removedCount++;
      }
    }
  }
  return { addedCount, removedCount, lines };
}
