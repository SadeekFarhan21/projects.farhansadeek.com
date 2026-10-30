import type { GitFileStatus } from "@/store";

/**
 * Parse `git status --porcelain=1` lines into explorer badge keys (repo-relative paths).
 */
export function parseGitStatusPorcelain(
  lines: string[]
): { statuses: Record<string, GitFileStatus>; changedPaths: string[] } {
  const statuses: Record<string, GitFileStatus> = {};

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line || line.startsWith("#")) continue;
    if (line.length < 4) continue;

    const x = line[0];
    const y = line[1];
    if (line[2] !== " ") continue;

    let pathPart = line.slice(3);
    if (pathPart.includes(" -> ")) {
      pathPart = pathPart.split(" -> ")[0].trim();
    }
    const path = unquoteGitPath(pathPart.trim());
    if (!path) continue;

    const st = xyToStatus(x, y);
    if (st && st !== "clean") statuses[path] = st;
  }

  const changedPaths = Object.keys(statuses);
  return { statuses, changedPaths };
}

function unquoteGitPath(s: string): string {
  if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) {
    const inner = s.slice(1, -1);
    return inner.replace(/\\(["\\])/g, "$1");
  }
  return s;
}

function xyToStatus(x: string, y: string): GitFileStatus | null {
  if (x === "?" && y === "?") return "untracked";
  if (x === "!" && y === "!") return null;

  if (x === "D" || y === "D") return "deleted";

  if (x === " " && y === "M") return "modified";
  if (x === "M" && y === " ") return "staged";
  if (x === "A" && y === " ") return "staged";
  if (x === "R" && y === " ") return "staged";
  if (x === "C" && y === " ") return "staged";

  if (x === "M" && y === "M") return "modified";
  if (x === "A" && y === "M") return "modified";
  if (x === "R" && y === "M") return "modified";
  if (x === "C" && y === "M") return "modified";

  if (y === "M" || y === "A") return "modified";

  if (x !== " " && x !== "?" && x !== "!") return "staged";

  return null;
}
