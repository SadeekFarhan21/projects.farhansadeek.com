/**
 * Terminal output color utilities.
 */

/** Strip ANSI escape codes from a string (best-effort for mobile line UI). */
export function stripAnsi(str: string): string {
  return str
    .replace(/\x1B\[(?:\?[0-9;]*|[0-9;]*)[A-Za-z]/g, "")
    .replace(/\x1B\][^\x07]*\x07/g, "")
    .replace(/\x1B\][^\x1B]*\x1B\\/g, "");
}

/** Return a hex color for a terminal output line based on its content. */
export function getTerminalLineColor(line: string): string {
  // Command echo
  if (line.startsWith("treena ~ $")) return "#00FF88";

  // Errors
  if (line.includes("command not found")) return "#F14C4C";
  if (/error|Error|ERROR|failed|Failed|No such file or directory/.test(line))
    return "#F14C4C";

  // Warnings
  if (/warn|Warn|WARN|warning/.test(line)) return "#E2C08D";

  // Success
  if (/success|Success|done|Done|Created|Removed/.test(line)) return "#4EC994";

  // Git output
  if (/new file:|modified:|deleted:|nothing to commit|On branch|\* /.test(line))
    return "#9CDCFE";

  // Default off-white
  return "#D4D4D4";
}
