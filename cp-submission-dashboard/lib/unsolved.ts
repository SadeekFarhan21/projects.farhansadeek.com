import { getSubmissions } from "./store";
import { problemUrl } from "./problem-url";
import type { UnsolvedProblem } from "../app/UnsolvedList";

// Partial credit (CodeChef subtasks) or a scored "16/19"-style result
function isPartial(verdict: string): boolean {
  const score = verdict.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (score && Number(score[1]) > 0 && Number(score[1]) < Number(score[2])) return true;
  return /partial/i.test(verdict);
}

// Problems with at least one submission and no accepted verdict, most recently attempted first
export function getUnsolvedProblems(): UnsolvedProblem[] {
  const byProblem = new Map<string, UnsolvedProblem & { solved: boolean }>();
  for (const sub of getSubmissions()) {
    const key = `${sub.platform}:${sub.problem}`;
    const entry = byProblem.get(key);
    if (!entry) {
      byProblem.set(key, {
        platform: sub.platform,
        problem: sub.problem,
        url: problemUrl(sub),
        attempts: 1,
        lastEpoch: sub.epoch,
        lastVerdict: sub.verdict,
        partial: isPartial(sub.verdict),
        solved: sub.ac === true,
      });
      continue;
    }
    entry.attempts++;
    entry.solved ||= sub.ac === true;
    entry.partial ||= isPartial(sub.verdict);
    if (sub.url) entry.url = sub.url;
    if (sub.epoch > entry.lastEpoch) {
      entry.lastEpoch = sub.epoch;
      entry.lastVerdict = sub.verdict;
    }
  }
  return [...byProblem.values()]
    .filter((p) => !p.solved)
    .sort((a, b) => b.lastEpoch - a.lastEpoch)
    .map(({ solved: _solved, ...problem }) => problem);
}
