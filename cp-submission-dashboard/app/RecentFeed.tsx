"use client";

import { useEffect, useState } from "react";

type Submission = {
  platform: string;
  epoch: number;
  time: string;
  problemName: string;
  problemUrl: string | null;
  verdict: string;
  language: string | null;
  runtimeMs: number | null;
  memoryBytes: number | null;
};

function formatSubmissionTime(epoch: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(epoch * 1000));
}

export const PLATFORM_OPTIONS = [
  "Codeforces",
  "AtCoder",
  "LeetCode",
  "CodeChef",
  "SPOJ",
  "CSES",
  "Kattis",
  "UVA",
];

export const PLATFORM_LABELS: Record<string, string> = {
  SPOJ: "Sphere",
  UVA: "Online Judge",
};

function standardLanguage(language: string | null): string | null {
  if (!language) return null;
  const value = language.toLowerCase();
  if (value.includes("c++") || value.includes("cpp") || value.includes("gnu c")) return "C++";
  if (value === "c" || value.includes("ansi c")) return "C";
  if (value.includes("python") || value.includes("pypy")) return "Python";
  if (value.includes("java")) return "Java";
  if (value.includes("kotlin")) return "Kotlin";
  if (value.includes("javascript") || value === "js") return "JavaScript";
  if (value.includes("typescript") || value === "ts") return "TypeScript";
  if (value.includes("rust")) return "Rust";
  if (value.includes("golang") || value === "go") return "Go";
  if (value.includes("swift")) return "Swift";
  return language;
}

export function standardVerdict(verdict: string, platform: string): string {
  const value = verdict.toLowerCase().replace(/[_-]+/g, " ");

  // Some judges report scored results (for example, "16/19 TLE") instead
  // of using the word "partial". Normalize those results consistently.
  const score = value.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (score) {
    const earned = Number(score[1]);
    const possible = Number(score[2]);
    if (possible > 0 && earned === possible) return "Accepted";
    if (possible > 0 && earned > 0 && earned < possible) return "Partially Accepted";
  }

  if (value === "wa" || value === "wrong answer") return "Wrong Answer";
  if (value === "re" && platform === "AtCoder") return "Runtime Error";
  if (value === "ac" && platform === "AtCoder") return "Accepted";
  if (platform === "CSES" && value.includes("reject")) return "Wrong Answer";
  if (value === "ok" || value === "ac" || value.includes("accepted")) return "Accepted";
  if (value.includes("wrong answer")) return "Wrong Answer";
  if (value.includes("runtime")) return "Runtime Error";
  if (value === "ce" || value.includes("compile") || value.includes("compilation")) {
    return "Compilation Error";
  }
  if (value === "tle" || value.includes("time limit")) return "Time Limit Exceeded";
  if (value.includes("memory limit")) return "Memory Limit Exceeded";
  if (value.includes("presentation")) return "Presentation Error";
  if (value.includes("partial")) return "Partially Accepted";
  if (value.includes("queue")) return "In Queue";
  if (value.includes("reject")) return "Rejected";
  return verdict
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export const PLATFORM_COLORS: Record<string, string> = {
  Codeforces: "text-red-400",
  AtCoder: "text-sky-400",
  LeetCode: "text-amber-400",
  CodeChef: "text-orange-300",
  SPOJ: "text-pink-400",
  UVA: "text-blue-400",
};

export function verdictColor(verdict: string) {
  const value = verdict.toLowerCase();
  if (["ok", "ac", "accepted"].includes(value)) return "text-emerald-400";
  if (value.includes("presentation")) return "text-yellow-300";
  if (value.includes("partial")) return "text-amber-400";
  return "text-red-400";
}

export default function RecentFeed() {
  const [subs, setSubs] = useState<Submission[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState("all");
  const [verdict, setVerdict] = useState("all");

  useEffect(() => {
    fetch("/api/submissions?limit=5000")
      .then((r) => r.json())
      .then((d) =>
        setSubs(
          d.submissions.map((submission: Submission) => ({
            ...submission,
            language: standardLanguage(submission.language),
            verdict: standardVerdict(submission.verdict, submission.platform),
          }))
        )
      )
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <p className="text-sm text-red-400">Failed to load: {error}</p>;
  if (!subs) return <p className="text-sm text-neutral-400">Loading submissions…</p>;

  const platforms = ["all", ...PLATFORM_OPTIONS];
  const verdicts = ["all", ...new Set(subs.map((s) => s.verdict))];
  const visible = subs
    .filter((s) => platform === "all" || s.platform === platform)
    .filter((s) => verdict === "all" || s.verdict === verdict)
    .slice(0, 20);

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <label className="flex items-center gap-2 text-xs text-neutral-500">
          Platform
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-200 outline-none"
          >
            {platforms.map((value) => (
              <option key={value} value={value}>
                {value === "all" ? "All platforms" : PLATFORM_LABELS[value] ?? value}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-neutral-500">
          Verdict
          <select
            value={verdict}
            onChange={(e) => setVerdict(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-200 outline-none"
          >
            {verdicts.map((value) => (
              <option key={value} value={value}>
                {value === "all" ? "All verdicts" : value}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ul className="divide-y divide-neutral-800">
      {visible.map((s, i) => (
        <li
          key={i}
          className="grid min-w-0 gap-1 py-3 text-sm sm:grid-cols-[9rem_7rem_minmax(8rem,12rem)_minmax(0,1fr)_auto] sm:items-baseline sm:gap-x-5 sm:py-2"
        >
          <span className="truncate tabular-nums text-xs text-neutral-500 sm:text-sm">
            {formatSubmissionTime(s.epoch)}
          </span>
          <span className={`font-medium ${PLATFORM_COLORS[s.platform] ?? "text-neutral-300"}`}>
            {PLATFORM_LABELS[s.platform] ?? s.platform}
          </span>
          <span className="min-w-0 truncate text-xs text-neutral-500">
            {s.language ?? ""}
          </span>
          {s.problemUrl ? (
            <a
              href={s.problemUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate text-neutral-200 decoration-white/30 underline-offset-4 hover:underline"
            >
              {s.problemName}
            </a>
          ) : (
            <span className="min-w-0 flex-1 truncate text-neutral-200">{s.problemName}</span>
          )}
          <span className={`font-medium sm:pr-6 sm:text-right ${verdictColor(s.verdict)}`}>
            {s.verdict}
          </span>
        </li>
      ))}
      </ul>
      {visible.length === 0 && (
        <p className="py-4 text-sm text-neutral-500">No submissions match these filters.</p>
      )}
    </>
  );
}
