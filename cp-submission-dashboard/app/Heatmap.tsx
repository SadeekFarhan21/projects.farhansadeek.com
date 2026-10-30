"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Platform =
  | "codeforces"
  | "atcoder"
  | "leetcode"
  | "codechef"
  | "spoj"
  | "cses"
  | "kattis"
  | "uva";

type DayCounts = Record<Platform, number> & {
  total: number;
  accepted: number;
  acc: Record<Platform, number>;
  fresh?: Record<Platform, number>;
};

type Mode = "all" | "accepted";

type PlatformStats = {
  submissions: number;
  accepted: number | null;
  accuracy: number | null;
};

type HeatmapData = {
  since: string;
  year: number | null;
  allTime?: boolean;
  availableYears: number[];
  totalSubmissions: number;
  days: Record<string, DayCounts>;
  stats: Record<string, PlatformStats>;
  errors: string[];
  warnings?: string[];
};

const DAY_MS = 86_400_000;

const PLATFORMS: { key: Platform; label: string; dot: string }[] = [
  { key: "codeforces", label: "Codeforces", dot: "bg-red-400" },
  { key: "atcoder", label: "AtCoder", dot: "bg-sky-400" },
  { key: "leetcode", label: "LeetCode", dot: "bg-amber-400" },
  { key: "codechef", label: "CodeChef", dot: "bg-orange-300" },
  { key: "spoj", label: "Sphere", dot: "bg-pink-400" },
  { key: "cses", label: "CSES", dot: "bg-lime-400" },
  { key: "kattis", label: "Kattis", dot: "bg-violet-400" },
  { key: "uva", label: "Online Judge", dot: "bg-blue-400" },
];

const LEVELS = [
  "bg-neutral-800",
  "bg-emerald-900",
  "bg-emerald-700",
  "bg-emerald-500",
  "bg-emerald-300",
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function level(count: number): string {
  if (count === 0) return LEVELS[0];
  if (count <= 2) return LEVELS[1];
  if (count <= 5) return LEVELS[2];
  if (count <= 9) return LEVELS[3];
  return LEVELS[4];
}

type Cell = { date: string; counts: DayCounts | null };

function buildWeeks(days: Record<string, DayCounts>, year?: number): Cell[][] {
  // 53 columns ending on today's week, Sunday-first like GitHub
  const today = new Date();
  const end = year
    ? new Date(Date.UTC(year, 11, 31))
    : new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = year ? new Date(Date.UTC(year, 0, 1)) : new Date(end.getTime() - 364 * DAY_MS);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const weeks: Cell[][] = [];
  for (let t = start.getTime(); t <= end.getTime(); ) {
    const week: Cell[] = [];
    for (let d = 0; d < 7 && t <= end.getTime(); d++, t += DAY_MS) {
      const key = new Date(t).toISOString().slice(0, 10);
      week.push({ date: key, counts: days[key] ?? null });
    }
    weeks.push(week);
  }
  return weeks;
}

function filteredTotal(
  counts: DayCounts | null,
  enabled: Set<Platform>,
  mode: Mode | "fresh" = "all"
): number {
  if (!counts) return 0;
  const source =
    mode === "accepted" ? counts.acc : mode === "fresh" ? (counts.fresh ?? counts) : counts;
  return PLATFORMS.reduce((sum, p) => (enabled.has(p.key) ? sum + source[p.key] : sum), 0);
}

function localToday(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(date + "T00:00:00Z") + days * DAY_MS).toISOString().slice(0, 10);
}

type Momentum = {
  currentStreak: number;
  longestStreak: number;
  last7: number;
  prev7: number;
  last30: number;
  prev30: number;
};

function momentum(
  days: Record<string, DayCounts>,
  enabled: Set<Platform>,
  mode: Mode,
  today: string
): Momentum {
  const countOn = (date: string) => filteredTotal(days[date] ?? null, enabled, mode);
  const windowSum = (from: number, length: number) => {
    let sum = 0;
    for (let i = from; i < from + length; i++) sum += countOn(shiftDate(today, -i));
    return sum;
  };

  // A streak stays alive through today until the day is over
  let currentStreak = 0;
  for (let i = countOn(today) > 0 ? 0 : 1; countOn(shiftDate(today, -i)) > 0; i++) currentStreak++;

  let longestStreak = 0;
  let run = 0;
  let prev: string | null = null;
  for (const date of Object.keys(days).sort()) {
    if (countOn(date) === 0) continue;
    run = prev && shiftDate(prev, 1) === date ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    prev = date;
  }

  return {
    currentStreak,
    longestStreak,
    last7: windowSum(0, 7),
    prev7: windowSum(7, 7),
    last30: windowSum(0, 30),
    prev30: windowSum(30, 30),
  };
}

function Trend({ now, before, span }: { now: number; before: number; span: string }) {
  const up = now > before;
  const pct = before === 0 ? null : Math.round((Math.abs(now - before) / before) * 100);
  return (
    <>
      {now === before ? (
        <span className="text-neutral-500">no change</span>
      ) : (
        <span className={up ? "text-emerald-400" : "text-red-400"}>
          {up ? "▲" : "▼"} {pct != null ? `${pct}%` : "new"}
        </span>
      )}
      <span className="text-neutral-500">
        {" "}· previous {span}: {before}
      </span>
    </>
  );
}

function prettyDate(date: string): string {
  return new Date(date + "T00:00:00Z").toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function Heatmap() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<Set<Platform>>(new Set(PLATFORMS.map((p) => p.key)));
  const [mode, setMode] = useState<Mode>("accepted");
  const [selected, setSelected] = useState<Cell | null>(null);
  const [hovered, setHovered] = useState<{ cell: Cell; x: number; y: number } | null>(null);
  const [period, setPeriod] = useState("rolling");
  const selectedToday = useRef(false);

  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const query = new URLSearchParams({ tz: timeZone });
    if (period === "all") query.set("range", "all");
    else if (period !== "rolling") query.set("year", period);
    fetch(`/api/heatmap?${query}`)
      .then((r) => r.json())
      .then((d: HeatmapData) => {
        setData(d);
        // Open today's breakdown on first load; day keys are in the viewer's time zone
        if (!selectedToday.current) {
          selectedToday.current = true;
          const today = localToday();
          setSelected({ date: today, counts: d.days?.[today] ?? null });
        }
      })
      .catch((e) => setError(String(e)));
  }, [period]);

  const weeks = useMemo(() => (data ? buildWeeks(data.days, data.year ?? undefined) : []), [data]);

  const monthLabels = useMemo(() => {
    const labels: { index: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, i) => {
      const month = new Date(week[0].date + "T00:00:00Z").getUTCMonth();
      if (month !== lastMonth) {
        labels.push({ index: i, label: MONTHS[month] });
        lastMonth = month;
      }
    });
    return labels;
  }, [weeks]);

  if (error) return <p className="text-sm text-red-400">Failed to load: {error}</p>;
  if (!data) return <p className="text-sm text-neutral-400">Loading heatmap…</p>;

  const visibleTotal = Object.values(data.days).reduce(
    (sum, d) => sum + filteredTotal(d, enabled, mode),
    0
  );
  const activeDays = Object.values(data.days).filter(
    (d) => filteredTotal(d, enabled, mode) > 0
  ).length;
  const today = localToday();
  const m = momentum(data.days, enabled, mode, today);
  const unit = mode === "accepted" ? "accepted" : "submissions";
  const momentumCards = [
    {
      label: "Current streak",
      value: `${m.currentStreak} ${m.currentStreak === 1 ? "day" : "days"}`,
      note:
        m.currentStreak > 0 && filteredTotal(data.days[today] ?? null, enabled, mode) === 0 ? (
          <span className="text-amber-400">solve today to keep it</span>
        ) : (
          <span className="text-neutral-500">consecutive active days</span>
        ),
    },
    {
      label: "Longest streak",
      value: `${m.longestStreak} ${m.longestStreak === 1 ? "day" : "days"}`,
      note: <span className="text-neutral-500">in this period</span>,
    },
    {
      label: "Last 7 days",
      value: `${m.last7} ${unit}`,
      note: <Trend now={m.last7} before={m.prev7} span="7 days" />,
    },
    {
      label: "Last 30 days",
      value: `${m.last30} ${unit}`,
      note: <Trend now={m.last30} before={m.prev30} span="30 days" />,
    },
  ];

  // In accepted mode, only count submissions to problems not already solved,
  // so re-submits to old problems don't drag down the day's ratio.
  const selectedSubmissionCount = selected
    ? filteredTotal(selected.counts, enabled, mode === "accepted" ? "fresh" : "all")
    : 0;
  const selectedAcceptedCount = selected
    ? filteredTotal(selected.counts, enabled, "accepted")
    : 0;

  const togglePlatform = (key: Platform) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="relative">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="mr-2 flex h-7 w-fit overflow-hidden rounded-full border border-neutral-700 text-xs leading-none">
          {(
            [
              ["accepted", "Accepted"],
              ["all", "Submission"],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex items-center px-3 transition-colors ${
                mode === m
                  ? "bg-emerald-600 text-white"
                  : "bg-neutral-900 text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="h-7 rounded-full border border-neutral-700 bg-neutral-900 px-3 py-0 text-xs leading-none text-neutral-300 outline-none"
          aria-label="Heatmap period"
        >
          <option value="rolling">Last 365 days</option>
          <option value="all">All time</option>
          {data.availableYears.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        {PLATFORMS.map((p) => (
          <button
            key={p.key}
            onClick={() => togglePlatform(p.key)}
            className={`flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs leading-none transition-colors ${
              enabled.has(p.key)
                ? "border-neutral-600 bg-neutral-800 text-neutral-200"
                : "border-neutral-800 bg-transparent text-neutral-600"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${enabled.has(p.key) ? p.dot : "bg-neutral-700"}`}
            />
            {p.label}
          </button>
        ))}
      </div>

      <p className="mb-4 text-sm text-neutral-400">
        {visibleTotal.toLocaleString()}{" "}
        {mode === "accepted" ? "accepted submissions" : "submissions"} on {activeDays} active
        days {data.year != null ? `in ${data.year}` : data.allTime ? `since ${data.since}` : "in the last year"}
      </p>

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {momentumCards.map((c) => (
          <div key={c.label} className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
            <div className="text-xs text-neutral-400">{c.label}</div>
            <p className="mt-1 text-lg font-semibold text-white">{c.value}</p>
            <p className="text-xs">{c.note}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-none lg:auto-cols-fr lg:grid-flow-col">
        {PLATFORMS.filter((p) => enabled.has(p.key) && data.stats?.[p.key]).map((p) => {
          const s = data.stats[p.key];
          return (
            <div
              key={p.key}
              className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3"
            >
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <span className={`h-2 w-2 rounded-full ${p.dot}`} />
                {p.label}
              </div>
              <p className="mt-1 text-lg font-semibold text-white">
                {s.accuracy != null ? `${s.accuracy}%` : "—"}
              </p>
              <p className="text-xs text-neutral-500">
                {s.accepted != null
                  ? `${s.accepted} / ${s.submissions} accepted`
                  : `${s.submissions} submissions`}
              </p>
            </div>
          );
        })}
      </div>

      <div className="pb-2">
        <div
          className="mb-1 grid gap-[3px] text-[10px] text-neutral-500"
          style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
        >
          {weeks.map((_, wi) => {
            const label = monthLabels.find((m) => m.index === wi);
            return (
              <div key={wi} className="overflow-visible whitespace-nowrap">
                {label?.label ?? ""}
              </div>
            );
          })}
        </div>
        <div
          className="grid gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
        >
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day) => {
                const count = filteredTotal(day.counts, enabled, mode);
                const isSelected = selected?.date === day.date;
                return (
                  <button
                    key={day.date}
                    aria-label={`${day.date}: ${count} ${mode === "accepted" ? "accepted " : ""}submissions`}
                    className={`aspect-square w-full rounded-[2px] transition-transform hover:scale-125 ${level(count)} ${
                      isSelected ? "ring-2 ring-white" : ""
                    }`}
                    onClick={() => setSelected(isSelected ? null : day)}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const parent = e.currentTarget
                        .closest(".relative")!
                        .getBoundingClientRect();
                      setHovered({
                        cell: day,
                        x: rect.left - parent.left + 6,
                        y: rect.top - parent.top - 8,
                      });
                    }}
                    onMouseLeave={() => setHovered(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1 text-xs text-neutral-500">
        <span className="mr-1">Less</span>
        {LEVELS.map((cls) => (
          <div key={cls} className={`h-[11px] w-[11px] rounded-[2px] ${cls}`} />
        ))}
        <span className="ml-1">More</span>
      </div>

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs shadow-lg"
          style={{ left: hovered.x, top: hovered.y }}
        >
          <p className="font-medium text-neutral-200">
            {filteredTotal(hovered.cell.counts, enabled, mode)}{" "}
            {mode === "accepted" ? "accepted" : "submissions"}
          </p>
          <p className="text-neutral-500">{prettyDate(hovered.cell.date)}</p>
        </div>
      )}

      {selected && (
        <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">{selected.date === today
                  ? "Today"
                  : selected.date === shiftDate(today, -1)
                    ? "Yesterday"
                    : prettyDate(selected.date)}</h3>
              <p
                className={`mt-0.5 text-sm font-semibold ${
                  selectedSubmissionCount === 0
                    ? "text-neutral-400"
                    : selectedAcceptedCount / selectedSubmissionCount < 0.6
                      ? "text-red-400"
                      : "text-emerald-400"
                }`}
              >
                {mode === "accepted"
                  ? `${selectedAcceptedCount} accepted (${selectedSubmissionCount} submissions)`
                  : `${selectedSubmissionCount} submissions (${selectedAcceptedCount} AC)`}
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-neutral-500 hover:text-neutral-300"
            >
              ✕ close
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 lg:flex-nowrap lg:justify-between">
            {PLATFORMS.filter((p) => enabled.has(p.key)).map((p) => {
              const count =
                (mode === "accepted" ? selected.counts?.fresh?.[p.key] : undefined) ??
                selected.counts?.[p.key] ??
                0;
              const ac = selected.counts?.acc[p.key] ?? 0;
              return (
                <div key={p.key} className="flex items-center gap-1.5 whitespace-nowrap text-sm">
                  <span className={`h-2 w-2 rounded-full ${p.dot}`} />
                  <span className={count > 0 ? "text-neutral-200" : "text-neutral-600"}>
                    {p.label}: {mode === "accepted" ? ac : count}
                    {count > 0 && (
                      <span className={ac / count < 0.6 ? "text-red-400" : "text-emerald-400"}>
                        {" "}({mode === "accepted" ? `${count} SB` : `${ac} AC`})
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.errors.length > 0 && (
        <p className="mt-3 text-xs text-amber-500">
          Some platforms failed: {data.errors.join("; ")}
        </p>
      )}
      {(data.warnings?.length ?? 0) > 0 && (
        <div className="mt-3 rounded-md border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-400">
          {data.warnings!.map((w) => (
            <p key={w}>⚠ {w}</p>
          ))}
        </div>
      )}
    </div>
  );
}
