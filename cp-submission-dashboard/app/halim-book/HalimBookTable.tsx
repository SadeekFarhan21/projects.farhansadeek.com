"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import LoadMore from "../LoadMore";
import type { HalimBookProblem } from "../../lib/halim-book";

type SortKey = "order" | "judge" | "problem" | "section" | "dacu" | "points" | "solved";

const PAGE_SIZE = 100;

const judges = ["UVa", "Kattis", "LeetCode"] as const;

const judgeStyles: Record<string, { chip: string; dot: string }> = {
  UVa: { chip: "bg-sky-500/10 text-sky-300 ring-sky-400/30", dot: "bg-sky-400" },
  Kattis: { chip: "bg-amber-500/10 text-amber-300 ring-amber-400/30", dot: "bg-amber-400" },
  LeetCode: { chip: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/30", dot: "bg-emerald-400" },
};

const chapterNames: Record<string, string> = {
  "1": "Introduction",
  "2": "Data Structures",
  "3": "Problem Solving Paradigms",
  "4": "Graph",
  "5": "Mathematics",
  "6": "String Processing",
  "7": "Geometry",
  "8": "Advanced Topics",
  "9": "Rare Topics",
};

const fieldClass =
  "h-9 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-neutral-200 placeholder:text-neutral-500 transition focus:border-white/25 focus:bg-white/[0.05] focus:outline-none";

// Two stacked range inputs make a dual-thumb slider; only the thumbs receive pointer events.
const sliderClass =
  "pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent focus:outline-none " +
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 " +
  "[&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full " +
  "[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(255,255,255,0.08)] " +
  "[&::-webkit-slider-thumb]:transition focus-visible:[&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(255,255,255,0.25)] " +
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 " +
  "[&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 " +
  "[&::-moz-range-thumb]:bg-white [&::-moz-range-track]:bg-transparent";

function compareSections(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true });
}

function chapterOf(section: string) {
  return section.split(".")[0];
}

// Display preferences are personal, so they live in localStorage rather than the URL.
function usePreference(key: string, fallback: boolean) {
  const [value, setValue] = useState(fallback);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) setValue(stored === "1");
    } catch {}
  }, [key]);
  function update(next: boolean) {
    setValue(next);
    try {
      localStorage.setItem(key, next ? "1" : "0");
    } catch {}
  }
  return [value, update] as const;
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-sm text-neutral-400 transition hover:text-neutral-200"
    >
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-white/80" : "bg-white/10"}`}>
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full shadow transition-all ${
            checked ? "left-[18px] bg-neutral-900" : "left-0.5 bg-white"
          }`}
        />
      </span>
      {label}
    </button>
  );
}

function SolvedMark({ solved }: { solved: boolean }) {
  if (!solved) return null;
  return (
    <span title="Solved" className="inline-flex text-emerald-400">
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
        <path d="m4.5 10.5 3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="sr-only">Solved</span>
    </span>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m13.5 13.5 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M3 5h14M6 10h8M8.5 15h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3 opacity-0 transition group-hover:opacity-70" aria-hidden>
      <path d="M8 4H4v12h12v-4M11 3h6v6M17 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProblemLink({ problem }: { problem: HalimBookProblem }) {
  const label = problem.title ?? problem.id;
  const content = (
    <>
      <span className="truncate">{label}</span>
      {problem.url && <ExternalIcon />}
    </>
  );
  return problem.url ? (
    <a
      href={problem.url}
      target="_blank"
      rel="noreferrer"
      className="group inline-flex min-w-0 max-w-full items-center gap-1.5 font-medium text-neutral-100 decoration-white/30 underline-offset-4 hover:underline"
    >
      {content}
    </a>
  ) : (
    <span className="inline-flex min-w-0 max-w-full items-center font-medium text-neutral-100">{content}</span>
  );
}

// Hidden hints sit behind an eye button, so a spoiler is only revealed on purpose.
function Hint({ hint, hidden, className = "" }: { hint: string; hidden: boolean; className?: string }) {
  const [revealed, setRevealed] = useState(false);
  if (!hidden || revealed) return <p className={className}>{hint}</p>;
  return (
    <button
      onClick={() => setRevealed(true)}
      className={`inline-flex items-center gap-1.5 text-xs text-neutral-500 transition hover:text-neutral-200 ${className}`}
    >
      <EyeIcon />
      Show hint
    </button>
  );
}

function CP5Badge() {
  return <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-neutral-500">CP5</span>;
}

export default function HalimBookTable({ problems }: { problems: HalimBookProblem[] }) {
  const [query, setQuery] = useState("");
  const [activeJudges, setActiveJudges] = useState<string[]>([...judges]);
  const [chapter, setChapter] = useState("");
  const [section, setSection] = useState("");
  const [cp5Only, setCp5Only] = useState(false);
  const [hideSolved, setHideSolved] = useState(false);
  const [minPoints, setMinPoints] = useState("");
  const [maxPoints, setMaxPoints] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("order");
  const [sortAsc, setSortAsc] = useState(true);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [hideHints, setHideHints] = usePreference("halim-book:hideHints", true);
  const [hideSections, setHideSections] = usePreference("halim-book:hideSections", false);
  const [showDacu, setShowDacu] = usePreference("halim-book:showDacu", false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Restore filters from the URL so a filtered view can be bookmarked or shared.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get("q") ?? "");
    if (params.get("judge")) setActiveJudges(params.get("judge")!.split(","));
    setChapter(params.get("chapter") ?? "");
    setSection(params.get("section") ?? "");
    setCp5Only(params.get("cp5") === "1");
    setHideSolved(params.get("unsolved") === "1");
    setMinPoints(params.get("min") ?? "");
    setMaxPoints(params.get("max") ?? "");
    const sort = params.get("sort");
    if (sort) {
      setSortKey(sort.replace(/^-/, "") as SortKey);
      setSortAsc(!sort.startsWith("-"));
    }
    // A shared link with advanced filters should show them, not hide them behind the button.
    if (["chapter", "section", "cp5", "unsolved", "min", "max"].some((key) => params.has(key))) setFiltersOpen(true);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (activeJudges.length !== judges.length) params.set("judge", activeJudges.join(","));
    if (chapter) params.set("chapter", chapter);
    if (section) params.set("section", section);
    if (cp5Only) params.set("cp5", "1");
    if (hideSolved) params.set("unsolved", "1");
    if (minPoints) params.set("min", minPoints);
    if (maxPoints) params.set("max", maxPoints);
    if (sortKey !== "order" || !sortAsc) params.set("sort", `${sortAsc ? "" : "-"}${sortKey}`);
    const search = params.toString();
    window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
    setVisible(PAGE_SIZE);
  }, [ready, query, activeJudges, chapter, section, cp5Only, hideSolved, minPoints, maxPoints, sortKey, sortAsc]);

  // Press "/" anywhere to jump to search.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (event.key === "/" && !["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const chapters = useMemo(
    () => [...new Set(problems.map((p) => chapterOf(p.section)))].sort(compareSections),
    [problems]
  );

  const sectionGroups = useMemo(() => {
    const topics = new Map<string, string>();
    for (const p of problems) topics.set(p.section, p.topic);
    const groups = new Map<string, [string, string][]>();
    for (const [s, topic] of [...topics].sort(([a], [b]) => compareSections(a, b))) {
      const c = chapterOf(s);
      if (chapter && c !== chapter) continue;
      groups.set(c, [...(groups.get(c) ?? []), [s, topic]]);
    }
    return [...groups];
  }, [problems, chapter]);

  const judgeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of problems) counts[p.judge] = (counts[p.judge] ?? 0) + 1;
    return counts;
  }, [problems]);

  const pointBounds = useMemo(() => {
    const values = problems.map((p) => p.points);
    return { min: Math.floor(Math.min(...values)), max: Math.ceil(Math.max(...values)) };
  }, [problems]);
  const pointSpan = pointBounds.max - pointBounds.min || 1;
  const low = minPoints === "" ? pointBounds.min : Math.max(Number(minPoints), pointBounds.min);
  const high = maxPoints === "" ? pointBounds.max : Math.min(Number(maxPoints), pointBounds.max);

  // A thumb resting at the edge of the range means "no limit", so it stays out of the URL.
  function setLow(value: number) {
    setMinPoints(value <= pointBounds.min ? "" : value.toFixed(1));
  }

  function setHigh(value: number) {
    setMaxPoints(value >= pointBounds.max ? "" : value.toFixed(1));
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const min = minPoints === "" ? -Infinity : Number(minPoints);
    const max = maxPoints === "" ? Infinity : Number(maxPoints);

    const rows = problems
      .map((problem, order) => ({ problem, order }))
      .filter(({ problem: p }) => {
        if (!activeJudges.includes(p.judge)) return false;
        if (chapter && chapterOf(p.section) !== chapter) return false;
        if (section && p.section !== section) return false;
        if (cp5Only && !p.cp5) return false;
        if (hideSolved && p.solved) return false;
        if (p.points < min || p.points > max) return false;
        if (!needle) return true;
        return [p.id, p.title, p.topic, p.hint, p.section].some((field) =>
          field?.toLowerCase().includes(needle)
        );
      });

    const direction = sortAsc ? 1 : -1;
    rows.sort((a, b) => {
      const pa = a.problem;
      const pb = b.problem;
      let result = 0;
      if (sortKey === "judge") result = pa.judge.localeCompare(pb.judge);
      if (sortKey === "problem") result = (pa.title ?? pa.id).localeCompare(pb.title ?? pb.id);
      if (sortKey === "section") result = compareSections(pa.section, pb.section);
      if (sortKey === "dacu") result = (pa.dacu ?? -1) - (pb.dacu ?? -1);
      if (sortKey === "points") result = pa.points - pb.points;
      // Ascending puts solved problems first.
      if (sortKey === "solved") result = Number(pb.solved) - Number(pa.solved);
      return (result || a.order - b.order) * direction;
    });

    return rows.map(({ problem }) => problem);
  }, [problems, query, activeJudges, chapter, section, cp5Only, hideSolved, minPoints, maxPoints, sortKey, sortAsc]);

  const shown = filtered.slice(0, visible);
  const advancedCount =
    (chapter ? 1 : 0) +
    (section ? 1 : 0) +
    (cp5Only ? 1 : 0) +
    (hideSolved ? 1 : 0) +
    (minPoints !== "" || maxPoints !== "" ? 1 : 0);
  const isFiltered = query !== "" || activeJudges.length !== judges.length || advancedCount > 0;

  function toggleJudge(judge: string) {
    setActiveJudges((current) =>
      current.includes(judge) ? current.filter((j) => j !== judge) : [...current, judge]
    );
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(key !== "dacu" && key !== "points");
    }
  }

  function pickSection(s: string) {
    setChapter(chapterOf(s));
    setSection(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setQuery("");
    setActiveJudges([...judges]);
    setChapter("");
    setSection("");
    setCp5Only(false);
    setHideSolved(false);
    setMinPoints("");
    setMaxPoints("");
    setSortKey("order");
    setSortAsc(true);
  }

  function header(label: string, key: SortKey, className = "") {
    const active = sortKey === key;
    return (
      <th className={`px-4 py-2.5 font-medium ${className}`}>
        <button
          onClick={() => toggleSort(key)}
          className={`inline-flex items-center gap-1 uppercase tracking-wide transition hover:text-neutral-200 ${active ? "text-neutral-200" : ""}`}
        >
          {label}
          <span className={`text-[10px] ${active ? "opacity-100" : "opacity-0"}`}>{sortAsc ? "▲" : "▼"}</span>
        </button>
      </th>
    );
  }

  return (
    <div>
      {/* Search, judges, and the filters toggle */}
      <div className="z-20 -mx-4 mb-4 border-b border-white/5 bg-[#0a0a0b]/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 md:sticky md:top-0">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-500">
                <SearchIcon />
              </span>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search problems..."
                className={`${fieldClass} h-10 w-full pl-9 pr-10`}
              />
              <kbd className="pointer-events-none absolute inset-y-0 right-3 my-auto hidden h-5 items-center rounded border border-white/10 px-1.5 font-mono text-[11px] text-neutral-500 sm:flex">
                /
              </kbd>
            </div>
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              aria-expanded={filtersOpen}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium ring-1 ring-inset transition ${
                filtersOpen
                  ? "bg-white/10 text-white ring-white/20"
                  : "text-neutral-300 ring-white/10 hover:bg-white/5 hover:text-white"
              }`}
            >
              <FilterIcon />
              Filters
              {advancedCount > 0 && (
                <span className="rounded-full bg-white px-1.5 text-[11px] font-semibold tabular-nums text-neutral-900">
                  {advancedCount}
                </span>
              )}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {judges.map((judge) => {
              const on = activeJudges.includes(judge);
              return (
                <button
                  key={judge}
                  onClick={() => toggleJudge(judge)}
                  aria-pressed={on}
                  className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium ring-1 ring-inset transition ${
                    on ? judgeStyles[judge].chip : "text-neutral-500 ring-white/10 hover:text-neutral-300 hover:ring-white/20"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${on ? judgeStyles[judge].dot : "bg-neutral-600"}`} />
                  {judge}
                  <span className="tabular-nums text-xs opacity-60">{judgeCounts[judge] ?? 0}</span>
                </button>
              );
            })}
          </div>
        </div>

        {filtersOpen && (
          <div className="mt-3 grid gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-500">
              Chapter
              <select
                value={chapter}
                onChange={(e) => {
                  setChapter(e.target.value);
                  setSection("");
                }}
                className={`${fieldClass} w-full min-w-0`}
              >
                <option value="">All chapters</option>
                {chapters.map((c) => (
                  <option key={c} value={c}>
                    {c}
                    {chapterNames[c] ? ` · ${chapterNames[c]}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-500">
              Section
              <select
                value={section}
                onChange={(e) => {
                  setSection(e.target.value);
                  if (e.target.value) setChapter(chapterOf(e.target.value));
                }}
                className={`${fieldClass} w-full min-w-0`}
              >
                <option value="">All sections</option>
                {sectionGroups.map(([c, items]) => (
                  <optgroup key={c} label={`Chapter ${c}${chapterNames[c] ? ` · ${chapterNames[c]}` : ""}`}>
                    {items.map(([s, topic]) => (
                      <option key={s} value={s}>
                        {s} · {topic}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-1.5 text-xs font-medium text-neutral-500">
              <span className="flex justify-between">
                Points
                <span className="tabular-nums text-neutral-300">
                  {low.toFixed(1)}–{high.toFixed(1)}
                </span>
              </span>
              <div className="relative h-9 w-full">
                <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/10" />
                <div
                  className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/70"
                  style={{
                    left: `${((low - pointBounds.min) / pointSpan) * 100}%`,
                    right: `${((pointBounds.max - high) / pointSpan) * 100}%`,
                  }}
                />
                <input
                  type="range"
                  min={pointBounds.min}
                  max={pointBounds.max}
                  step="0.1"
                  value={low}
                  onChange={(e) => setLow(Math.min(Number(e.target.value), high))}
                  aria-label="Minimum points"
                  className={`${sliderClass} ${low > pointBounds.max - 0.5 ? "z-20" : "z-10"}`}
                />
                <input
                  type="range"
                  min={pointBounds.min}
                  max={pointBounds.max}
                  step="0.1"
                  value={high}
                  onChange={(e) => setHigh(Math.max(Number(e.target.value), low))}
                  aria-label="Maximum points"
                  className={`${sliderClass} z-10`}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-3 border-t border-white/5 pt-4 sm:col-span-2 lg:col-span-3">
              <Switch checked={cp5Only} onChange={setCp5Only} label="New in CP5" />
              <Switch checked={hideSolved} onChange={setHideSolved} label="Hide solved" />
              <Switch checked={hideHints} onChange={setHideHints} label="Hide hints" />
              <Switch checked={hideSections} onChange={setHideSections} label="Hide sections" />
              <Switch checked={showDacu} onChange={setShowDacu} label="Show DACU" />
            </div>
          </div>
        )}
      </div>

      <div className="mb-3 flex min-h-8 items-center justify-between gap-3 text-sm">
        <span className="tabular-nums text-neutral-400">
          <span className="font-medium text-neutral-100">{filtered.length.toLocaleString()}</span>{" "}
          {filtered.length === 1 ? "problem" : "problems"} found
        </span>
        {isFiltered && (
          <button onClick={reset} className="text-neutral-400 transition hover:text-white">
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-20 text-center">
          <div className="mb-3 rounded-full bg-white/5 p-3 text-neutral-400">
            <SearchIcon />
          </div>
          <p className="font-medium text-neutral-200">No problems match these filters</p>
          <p className="mt-1 text-sm text-neutral-500">Try a different search or loosen the filters.</p>
          <button
            onClick={reset}
            className="mt-5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-200"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-white/10 md:block">
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col className="w-28" />
                <col />
                {!hideSections && <col className="w-[24%]" />}
                <col className="w-44" />
                {showDacu && <col className="w-20" />}
                <col className="w-16" />
                <col className="w-20" />
              </colgroup>
              <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  {header("Judge", "judge")}
                  {header("Problem", "problem")}
                  {!hideSections && header("Section", "section")}
                  <th className="px-4 py-2.5 font-medium">Hint</th>
                  {showDacu && header("DACU", "dacu", "text-right")}
                  {header("Pts", "points", "text-right")}
                  {header("Solved", "solved", "text-center")}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {shown.map((p) => (
                  <tr key={`${p.judge}:${p.id}`} className="align-top transition hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${judgeStyles[p.judge]?.chip}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${judgeStyles[p.judge]?.dot}`} />
                        {p.judge}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <ProblemLink problem={p} />
                        {p.cp5 && <CP5Badge />}
                      </div>
                      {p.title && p.title !== p.id && (
                        <span className="font-mono text-xs text-neutral-500">{p.id}</span>
                      )}
                    </td>
                    {!hideSections && (
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => pickSection(p.section)}
                          title="Show only this section"
                          className="group flex min-w-0 items-baseline gap-2 text-left"
                        >
                          <span className="shrink-0 font-mono text-xs text-neutral-500 group-hover:text-neutral-300">
                            {p.section}
                          </span>
                          <span className="text-neutral-300 group-hover:text-white">{p.topic}</span>
                        </button>
                      </td>
                    )}
                    <td className="px-4 py-2.5 leading-relaxed text-neutral-400">
                      <Hint key={String(hideHints)} hint={p.hint} hidden={hideHints} />
                    </td>
                    {showDacu && (
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-400">
                        {p.dacu ? p.dacu.toLocaleString() : <span className="text-neutral-700">—</span>}
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-right tabular-nums text-neutral-300">{p.points.toFixed(1)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <SolvedMark solved={p.solved} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="flex flex-col gap-2 md:hidden">
            {shown.map((p) => (
              <li key={`${p.judge}:${p.id}`} className="rounded-xl border border-white/10 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <ProblemLink problem={p} />
                      {p.cp5 && <CP5Badge />}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${judgeStyles[p.judge]?.dot}`} />
                        {p.judge}
                      </span>
                      {p.title && p.title !== p.id && <span className="font-mono">{p.id}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs tabular-nums text-neutral-300">{p.points.toFixed(1)} pts</span>
                    <SolvedMark solved={p.solved} />
                  </div>
                </div>
                {!hideSections && (
                  <button
                    onClick={() => pickSection(p.section)}
                    className="mt-2 flex items-baseline gap-2 text-left text-sm"
                  >
                    <span className="font-mono text-xs text-neutral-500">{p.section}</span>
                    <span className="text-neutral-300">{p.topic}</span>
                  </button>
                )}
                <Hint
                  key={String(hideHints)}
                  hint={p.hint}
                  hidden={hideHints}
                  className="mt-1.5 text-sm leading-relaxed text-neutral-400"
                />
              </li>
            ))}
          </ul>

          <LoadMore shown={shown.length} total={filtered.length} onMore={() => setVisible((v) => v + PAGE_SIZE)} />
        </>
      )}
    </div>
  );
}
