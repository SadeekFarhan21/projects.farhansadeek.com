import type { GitFileStatus } from "@/store";

/**
 * Maps isomorphic-git statusMatrix tuples to GitFileStatus.
 *
 * statusMatrix returns [filepath, HEAD, WORKDIR, STAGE]:
 *   HEAD:    0 = absent, 1 = present
 *   WORKDIR: 0 = absent, 1 = identical to HEAD, 2 = modified
 *   STAGE:   0 = absent, 1 = identical to HEAD, 2 = modified (staged), 3 = added (new)
 */
export function mapStatusMatrix(
  matrix: Array<[string, number, number, number]>
): Record<string, GitFileStatus> {
  const result: Record<string, GitFileStatus> = {};

  for (const [filepath, head, workdir, stage] of matrix) {
    if (head === 0 && workdir === 2) {
      // New file not in HEAD
      result[filepath] = stage === 2 || stage === 3 ? "staged" : "untracked";
    } else if (head === 1 && workdir === 0) {
      result[filepath] = "deleted";
    } else if (head === 1 && workdir === 2) {
      result[filepath] = stage === 2 ? "staged" : "modified";
    } else if (head === 1 && workdir === 1 && stage === 1) {
      result[filepath] = "clean";
    } else if (stage === 2 || stage === 3) {
      result[filepath] = "staged";
    } else {
      result[filepath] = "clean";
    }
  }

  return result;
}
