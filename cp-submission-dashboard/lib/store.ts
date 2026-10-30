import submissions from "../data/submissions.json";
import manualSPOJ from "../data/spoj-manual.json";

export type StoredSub = {
  id?: string;
  platform:
    | "Codeforces"
    | "AtCoder"
    | "LeetCode"
    | "CodeChef"
    | "SPOJ"
    | "CSES"
    | "Kattis"
    | "UVA";
  epoch: number;
  problem: string;
  url?: string;
  verdict: string;
  ac: boolean | null;
  language: string | null;
  runtimeMs: number | null;
  memoryBytes: number | null;
};

function getBundledSubmissions(): StoredSub[] {
  const merged = [...(submissions as StoredSub[]), ...(manualSPOJ as StoredSub[])];
  const seen = new Set<string>();
  return merged.filter((submission) => {
    const key = `${submission.platform}:${submission.id ?? submission.epoch}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getSubmissions(): StoredSub[] {
  return getBundledSubmissions();
}

export function dateKey(epochSeconds: number, _platform?: StoredSub["platform"], timeZone = "UTC"): string {
  const date = new Date(epochSeconds * 1000);
  if (timeZone === "UTC") return date.toISOString().slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
