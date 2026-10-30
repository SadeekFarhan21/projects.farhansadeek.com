"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import LoadMore from "../LoadMore";
import type { AtCoderProblem, AtCoderTopic } from "../../lib/atcoder-topicwise";

type SortKey = "order" | "contest" | "problem" | "topic" | "difficulty" | "solved";

const PAGE_SIZE = 100;

// Beginner, Regular, and Grand contests; EDPC, FPS 24, and the rest are "Other".
const types = ["ABC", "ARC", "AGC", "Other"] as const;

const typeStyles: Record<string, { chip: string; dot: string }> = {
  ABC: { chip: "bg-sky-500/10 text-sky-300 ring-sky-400/30", dot: "bg-sky-400" },
  ARC: { chip: "bg-orange-500/10 text-orange-300 ring-orange-400/30", dot: "bg-orange-400" },
  AGC: { chip: "bg-rose-500/10 text-rose-300 ring-rose-400/30", dot: "bg-rose-400" },
  Other: { chip: "bg-white/5 text-neutral-300 ring-white/15", dot: "bg-neutral-400" },
};

// AtCoder's rating colors in 400-point bands, as AtCoder Problems draws them on a dark background.
const bandColors = ["#c0c0c0", "#b08c56", "#3faf3f", "#42e0e0", "#8888ff", "#ffff56", "#ffb836", "#ff6767"];
const difficultyColor = (value: number) => bandColors[Math.min(Math.floor(Math.max(value, 0) / 400), bandColors.length - 1)];

// Contest ids sort naturally ("abc99" before "abc100"), then by problem letter.
const contestKey = (p: AtCoderProblem) => `${p.contest} ${p.index}`;
const collator = new Intl.Collator("en", { numeric: true });

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

function ExternalIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3 opacity-0 transition group-hover:opacity-70" aria-hidden>
      <path d="M8 4H4v12h12v-4M11 3h6v6M17 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProblemLink({ problem, color }: { problem: AtCoderProblem; color?: string }) {
  return (
    <a
      href={problem.url}
      target="_blank"
      rel="noreferrer"
      className="group inline-flex min-w-0 max-w-full items-center gap-1.5 font-medium text-neutral-100 decoration-white/30 underline-offset-4 hover:underline"
    >
      <span className="truncate" style={color ? { color } : undefined}>
        {problem.index}. {problem.title}
      </span>
      <ExternalIcon />
    </a>
  );
}

// A ring filled from the bottom by how far the value sits into its color band, like AtCoder Problems.
function DifficultyCircle({ value }: { value: number }) {
  const color = difficultyColor(value);
  const fill = Math.round(((Math.max(value, 0) % 400) / 400) * 100);
  const background = value >= 3200 ? `linear-gradient(to right, ${color}, white, ${color})` : `linear-gradient(to top, ${color} ${fill}%, transparent ${fill}%)`;
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border" style={{ borderColor: color, background }} aria-hidden />;
}

function Difficulty({ value }: { value: number | null }) {
  if (value == null) return <span className="text-neutral-700">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums" style={{ color: difficultyColor(value) }}>
      <DifficultyCircle value={value} />
      {value}
    </span>
  );
}

function ContestChip({ problem }: { problem: AtCoderProblem }) {
  const style = typeStyles[problem.type] ?? typeStyles.Other;
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-xs font-medium ring-1 ring-inset ${style.chip}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
      <span className="truncate">{problem.contest.toUpperCase()}</span>
    </span>
  );
}

export default function AtCoderTable({
  problems,
  topics,
}: {
  problems: AtCoderProblem[];
  topics: Record<string, AtCoderTopic>;
}) {
  const [query, setQuery] = useState("");
  const [activeTypes, setActiveTypes] = useState<string[]>([...types]);
  const [category, setCategory] = useState("");
  const [topic, setTopic] = useState("");
  const [hideSolved, setHideSolved] = useState(false);
  const [minDifficulty, setMinDifficulty] = useState("");
  const [maxDifficulty, setMaxDifficulty] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("order");
  const [sortAsc, setSortAsc] = useState(true);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [hideTopics, setHideTopics] = usePreference("atcoder-topicwise:hideTopics", false);
  // Difficulty hints at the approach, so it can be hidden like on AtCoder Categories.
  const [hideDifficulty, setHideDifficulty] = usePreference("atcoder-topicwise:hideDifficulty", false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Restore filters from the URL so a filtered view can be bookmarked or shared.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get("q") ?? "");
    if (params.get("type")) setActiveTypes(params.get("type")!.split(","));
    setCategory(params.get("category") ?? "");
    setTopic(params.get("topic") ?? "");
    setHideSolved(params.get("unsolved") === "1");
    setMinDifficulty(params.get("min") ?? "");
    setMaxDifficulty(params.get("max") ?? "");
    const sort = params.get("sort");
    if (sort) {
      setSortKey(sort.replace(/^-/, "") as SortKey);
      setSortAsc(!sort.startsWith("-"));
    }
    // A shared link with advanced filters should show them, not hide them behind the button.
    if (["category", "topic", "unsolved", "min", "max"].some((key) => params.has(key))) setFiltersOpen(true);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (activeTypes.length !== types.length) params.set("type", activeTypes.join(","));
    if (category) params.set("category", category);
    if (topic) params.set("topic", topic);
    if (hideSolved) params.set("unsolved", "1");
    if (minDifficulty) params.set("min", minDifficulty);
    if (maxDifficulty) params.set("max", maxDifficulty);
    if (sortKey !== "order" || !sortAsc) params.set("sort", `${sortAsc ? "" : "-"}${sortKey}`);
    const search = params.toString();
    window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
    setVisible(PAGE_SIZE);
  }, [ready, query, activeTypes, category, topic, hideSolved, minDifficulty, maxDifficulty, sortKey, sortAsc]);

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

  const orderedTopics = useMemo(
    () => Object.entries(topics).sort(([, a], [, b]) => a.order - b.order),
    [topics]
  );

  const categories = useMemo(() => [...new Set(orderedTopics.map(([, t]) => t.category))], [orderedTopics]);

  // Topics grouped by category for the <select>, narrowed to the chosen category.
  const topicGroups = useMemo(() => {
    const groups = new Map<string, [string, AtCoderTopic][]>();
    for (const entry of orderedTopics) {
      const c = entry[1].category;
      if (category && c !== category) continue;
      groups.set(c, [...(groups.get(c) ?? []), entry]);
    }
    return [...groups];
  }, [orderedTopics, category]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of problems) counts[p.type] = (counts[p.type] ?? 0) + 1;
    return counts;
  }, [problems]);

  // A few problems rate above 4000; the top of the slider means "no upper limit".
  const difficultyBounds = { min: 0, max: 4000 };
  const difficultySpan = difficultyBounds.max - difficultyBounds.min;
  const low = minDifficulty === "" ? difficultyBounds.min : Math.max(Number(minDifficulty), difficultyBounds.min);
  const high = maxDifficulty === "" ? difficultyBounds.max : Math.min(Number(maxDifficulty), difficultyBounds.max);

  // A thumb resting at the edge of the range means "no limit", so it stays out of the URL.
  function setLow(value: number) {
    setMinDifficulty(value <= difficultyBounds.min ? "" : String(value));
  }

  function setHigh(value: number) {
    setMaxDifficulty(value >= difficultyBounds.max ? "" : String(value));
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const min = minDifficulty === "" ? -Infinity : Number(minDifficulty);
    const max = maxDifficulty === "" ? Infinity : Number(maxDifficulty);

    const rows = problems
      .map((problem, order) => ({ problem, order }))
      .filter(({ problem: p }) => {
        if (!activeTypes.includes(p.type)) return false;
        // A problem can sit in several categories (Greedy and DP, say), so match any of them.
        if (category && !p.topics.some((t) => topics[t]?.category === category)) return false;
        if (topic && !p.topics.includes(topic)) return false;
        if (hideSolved && p.solved) return false;
        if (p.difficulty != null && (p.difficulty < min || p.difficulty > max)) return false;
        if (!needle) return true;
        return [p.id, p.contest, p.title, `${p.contest} ${p.index}`, ...p.topics.map((t) => topics[t]?.title)].some((field) =>
          field?.toLowerCase().includes(needle)
        );
      });

    const direction = sortAsc ? 1 : -1;
    rows.sort((a, b) => {
      const pa = a.problem;
      const pb = b.problem;
      let result = 0;
      if (sortKey === "contest") result = collator.compare(contestKey(pa), contestKey(pb));
      if (sortKey === "problem") result = pa.title.localeCompare(pb.title);
      if (sortKey === "topic") result = (topics[pa.topic]?.order ?? 0) - (topics[pb.topic]?.order ?? 0);
      // With one topic picked, its problems read easy to hard like the topic's own page, rather
      // than grouped by each problem's primary topic.
      if (sortKey === "difficulty" || (sortKey === "order" && topic))
        result = (pa.difficulty ?? Infinity) - (pb.difficulty ?? Infinity);
      // Ascending puts solved problems first.
      if (sortKey === "solved") result = Number(pb.solved) - Number(pa.solved);
      return (result || a.order - b.order) * direction;
    });

    return rows.map(({ problem }) => problem);
  }, [problems, topics, query, activeTypes, category, topic, hideSolved, minDifficulty, maxDifficulty, sortKey, sortAsc]);

  const shown = filtered.slice(0, visible);
  const advancedCount =
    (category ? 1 : 0) +
    (topic ? 1 : 0) +
    (hideSolved ? 1 : 0) +
    (minDifficulty !== "" || maxDifficulty !== "" ? 1 : 0);
  const isFiltered = query !== "" || activeTypes.length !== types.length || advancedCount > 0;

  function toggleType(type: string) {
    setActiveTypes((current) => (current.includes(type) ? current.filter((t) => t !== type) : [...current, type]));
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function pickTopic(id: string) {
    setCategory(topics[id]?.category ?? "");
    setTopic(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setQuery("");
    setActiveTypes([...types]);
    setCategory("");
    setTopic("");
    setHideSolved(false);
    setMinDifficulty("");
    setMaxDifficulty("");
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
      {/* Search, contest types, and the filters toggle */}
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
            {types.map((type) => {
              const on = activeTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  aria-pressed={on}
                  className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium ring-1 ring-inset transition ${
                    on ? typeStyles[type].chip : "text-neutral-500 ring-white/10 hover:text-neutral-300 hover:ring-white/20"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${on ? typeStyles[type].dot : "bg-neutral-600"}`} />
                  {type}
                  <span className="tabular-nums text-xs opacity-60">{typeCounts[type] ?? 0}</span>
                </button>
              );
            })}
          </div>
        </div>

        {filtersOpen && (
          <div className="mt-3 grid gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-500">
              Category
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setTopic("");
                }}
                className={`${fieldClass} w-full min-w-0`}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-500">
              Topic
              <select
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  if (e.target.value) setCategory(topics[e.target.value]?.category ?? "");
                }}
                className={`${fieldClass} w-full min-w-0`}
              >
                <option value="">All topics</option>
                {topicGroups.map(([c, items]) => (
                  <optgroup key={c} label={c}>
                    {items.map(([id, meta]) => (
                      <option key={id} value={id}>
                        {"\u00a0\u00a0".repeat(meta.depth)}
                        {meta.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-1.5 text-xs font-medium text-neutral-500">
              <span className="flex justify-between">
                Difficulty
                <span className="tabular-nums text-neutral-300">
                  {low}–{high >= difficultyBounds.max ? `${difficultyBounds.max}+` : high}
                </span>
              </span>
              <div className="relative h-9 w-full">
                <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/10" />
                <div
                  className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/70"
                  style={{
                    left: `${((low - difficultyBounds.min) / difficultySpan) * 100}%`,
                    right: `${((difficultyBounds.max - high) / difficultySpan) * 100}%`,
                  }}
                />
                <input
                  type="range"
                  min={difficultyBounds.min}
                  max={difficultyBounds.max}
                  step="100"
                  value={low}
                  onChange={(e) => setLow(Math.min(Number(e.target.value), high))}
                  aria-label="Minimum difficulty"
                  className={`${sliderClass} ${low > difficultyBounds.max - 100 ? "z-20" : "z-10"}`}
                />
                <input
                  type="range"
                  min={difficultyBounds.min}
                  max={difficultyBounds.max}
                  step="100"
                  value={high}
                  onChange={(e) => setHigh(Math.max(Number(e.target.value), low))}
                  aria-label="Maximum difficulty"
                  className={`${sliderClass} z-10`}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-3 border-t border-white/5 pt-4 sm:col-span-2 lg:col-span-3">
              <Switch checked={hideSolved} onChange={setHideSolved} label="Hide solved" />
              <Switch checked={hideTopics} onChange={setHideTopics} label="Hide topics" />
              <Switch checked={hideDifficulty} onChange={setHideDifficulty} label="Hide difficulty" />
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
                <col className="w-36" />
                <col className="w-[36%]" />
                {!hideTopics && <col />}
                {!hideDifficulty && <col className="w-28" />}
                <col className="w-20" />
              </colgroup>
              <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  {header("Contest", "contest")}
                  {header("Problem", "problem")}
                  {!hideTopics && header("Topic", "topic")}
                  {!hideDifficulty && header("Difficulty", "difficulty", "text-right")}
                  {header("Solved", "solved", "text-center")}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {shown.map((p) => (
                  <tr key={p.id} className="align-top transition hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5">
                      <ContestChip problem={p} />
                    </td>
                    <td className="px-4 py-2.5">
                      <ProblemLink problem={p} color={hideDifficulty || p.difficulty == null ? undefined : difficultyColor(p.difficulty)} />
                      <span className="block font-mono text-xs text-neutral-500">{p.id}</span>
                    </td>
                    {!hideTopics && (
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => pickTopic(p.topic)}
                          title="Show only this topic"
                          className="group flex min-w-0 items-baseline gap-2 text-left"
                        >
                          {topics[p.topic]?.depth > 0 && (
                            <span className="shrink-0 font-mono text-xs text-neutral-500 group-hover:text-neutral-300">
                              {topics[p.topic]?.category}
                            </span>
                          )}
                          <span className="text-neutral-300 group-hover:text-white">{topics[p.topic]?.title}</span>
                        </button>
                      </td>
                    )}
                    {!hideDifficulty && (
                      <td className="px-4 py-2.5 text-right">
                        <Difficulty value={p.difficulty} />
                      </td>
                    )}
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
              <li key={p.id} className="rounded-xl border border-white/10 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <ProblemLink problem={p} color={hideDifficulty || p.difficulty == null ? undefined : difficultyColor(p.difficulty)} />
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${(typeStyles[p.type] ?? typeStyles.Other).dot}`} />
                        {p.contest.toUpperCase()}
                      </span>
                      <span className="font-mono">{p.id}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!hideDifficulty && p.difficulty != null && (
                      <span className="text-xs">
                        <Difficulty value={p.difficulty} />
                      </span>
                    )}
                    <SolvedMark solved={p.solved} />
                  </div>
                </div>
                {!hideTopics && (
                  <button
                    onClick={() => pickTopic(p.topic)}
                    className="mt-2 flex items-baseline gap-2 text-left text-sm"
                  >
                    {topics[p.topic]?.depth > 0 && (
                      <span className="font-mono text-xs text-neutral-500">{topics[p.topic]?.category}</span>
                    )}
                    <span className="text-neutral-300">{topics[p.topic]?.title}</span>
                  </button>
                )}
              </li>
            ))}
          </ul>

          <LoadMore shown={shown.length} total={filtered.length} onMore={() => setVisible((v) => v + PAGE_SIZE)} />
        </>
      )}
    </div>
  );
}
