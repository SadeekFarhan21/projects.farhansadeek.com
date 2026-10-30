"use client";

import { useState } from "react";
import LoadMore from "./LoadMore";
import {
  PLATFORM_COLORS,
  PLATFORM_LABELS,
  PLATFORM_OPTIONS,
  standardVerdict,
  verdictColor,
} from "./RecentFeed";

export type UnsolvedProblem = {
  platform: string;
  problem: string;
  url: string | null;
  attempts: number;
  lastEpoch: number;
  lastVerdict: string;
  // Earned partial credit on some submission, even if a later one did worse
  partial: boolean;
};

const PAGE = 20;

function formatDate(epoch: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(epoch * 1000));
}

function verdictFor(p: UnsolvedProblem): string {
  return p.partial ? "Partially Solved" : standardVerdict(p.lastVerdict, p.platform);
}

function ProblemName({ problem: p }: { problem: UnsolvedProblem }) {
  return p.url ? (
    <a
      href={p.url}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-neutral-100 decoration-white/30 underline-offset-4 hover:underline"
    >
      {p.problem}
    </a>
  ) : (
    <span className="font-medium text-neutral-100">{p.problem}</span>
  );
}

export default function UnsolvedList({ problems }: { problems: UnsolvedProblem[] }) {
  const [platform, setPlatform] = useState("all");
  const [status, setStatus] = useState<"all" | "none" | "partial">("all");
  const [shown, setShown] = useState(PAGE);

  const filtered = problems
    .filter((p) => platform === "all" || p.platform === platform)
    .filter((p) => status === "all" || (status === "partial") === p.partial);
  const visible = filtered.slice(0, shown);
  const platforms = PLATFORM_OPTIONS.filter((value) => problems.some((p) => p.platform === value));

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-neutral-500">
          Platform
          <select
            value={platform}
            onChange={(e) => {
              setPlatform(e.target.value);
              setShown(PAGE);
            }}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-200 outline-none"
          >
            <option value="all">All platforms</option>
            {platforms.map((value) => (
              <option key={value} value={value}>
                {PLATFORM_LABELS[value] ?? value}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-neutral-500">
          Status
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as typeof status);
              setShown(PAGE);
            }}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-200 outline-none"
          >
            <option value="all">All</option>
            <option value="none">Not solved</option>
            <option value="partial">Partially solved</option>
          </select>
        </label>
        <span className="text-xs text-neutral-500">
          {filtered.length.toLocaleString()} {filtered.length === 1 ? "problem" : "problems"}{" "}
          {status === "partial" ? "with partial credit only" : status === "none" ? "with no credit" : "attempted but never accepted"}
        </span>
      </div>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-white/10 md:block">
        <table className="w-full table-fixed text-left text-sm">
          <colgroup>
            <col className="w-36" />
            <col />
            <col className="w-32" />
            <col className="w-24" />
            <col className="w-44" />
          </colgroup>
          <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wide text-neutral-500">
            <tr className="divide-x divide-white/10">
              <th className="px-4 py-2.5 font-medium">Judge</th>
              <th className="px-4 py-2.5 font-medium">Problem</th>
              <th className="px-4 py-2.5 font-medium">Last attempt</th>
              <th className="px-4 py-2.5 text-right font-medium">Attempts</th>
              <th className="px-4 py-2.5 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {visible.map((p) => {
              const verdict = verdictFor(p);
              return (
                <tr key={`${p.platform}:${p.problem}`} className="divide-x divide-white/10 transition hover:bg-white/[0.02]">
                  <td className={`px-4 py-2.5 font-medium ${PLATFORM_COLORS[p.platform] ?? "text-neutral-300"}`}>
                    {PLATFORM_LABELS[p.platform] ?? p.platform}
                  </td>
                  <td className="truncate px-4 py-2.5">
                    <ProblemName problem={p} />
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-neutral-400">{formatDate(p.lastEpoch)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-neutral-300">{p.attempts}</td>
                  <td className={`px-4 py-2.5 text-right font-medium ${verdictColor(verdict)}`}>{verdict}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="flex flex-col gap-2 md:hidden">
        {visible.map((p) => {
          const verdict = verdictFor(p);
          return (
            <li key={`${p.platform}:${p.problem}`} className="rounded-xl border border-white/10 p-3.5 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 truncate">
                  <ProblemName problem={p} />
                </div>
                <span className={`shrink-0 font-medium ${verdictColor(verdict)}`}>{verdict}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-neutral-500">
                <span className={PLATFORM_COLORS[p.platform] ?? "text-neutral-300"}>
                  {PLATFORM_LABELS[p.platform] ?? p.platform}
                </span>
                <span className="tabular-nums">{formatDate(p.lastEpoch)}</span>
                <span className="tabular-nums">
                  {p.attempts} {p.attempts === 1 ? "attempt" : "attempts"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      {filtered.length === 0 && (
        <p className="py-4 text-sm text-neutral-500">No unsolved problems here.</p>
      )}
      <LoadMore shown={visible.length} total={filtered.length} onMore={() => setShown((n) => n + PAGE)} />
    </>
  );
}
