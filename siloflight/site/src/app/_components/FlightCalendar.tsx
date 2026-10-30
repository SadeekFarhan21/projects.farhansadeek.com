"use client";

import { useRef } from "react";
import type { StoredFlight } from "@/lib/stats";
import {
  gsap,
  ScrollTrigger,
  useGSAP,
  prefersReducedMotion,
} from "@/lib/gsap";

const CELL = 12;
const GAP = 3;
const RADIUS = 2.5;
const MONTH_LABEL_H = 18;
const WEEKDAY_LABEL_W = 22;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const FILL = [
  "rgba(255,255,255,0.04)",
  "rgba(56,189,248,0.22)",
  "rgba(56,189,248,0.45)",
  "rgba(56,189,248,0.75)",
  "#7dd3fc",
];

type DayCell = {
  iso: string;
  date: Date;
  count: number;
  firstFlightId?: string;
  routes: string[];
  inYear: boolean;
};

export default function FlightCalendar({
  flights,
  year,
}: {
  flights: StoredFlight[];
  year?: number;
}) {
  const flightYears = Array.from(
    new Set(
      flights
        .map((f) => new Date(f.date).getUTCFullYear())
        .filter((y) => !Number.isNaN(y)),
    ),
  ).sort((a, b) => b - a);
  const targetYear = year ?? flightYears[0] ?? new Date().getUTCFullYear();

  const byDate = new Map<string, StoredFlight[]>();
  for (const f of flights) {
    const iso = isoDate(new Date(f.date));
    if (!iso) continue;
    const existing = byDate.get(iso);
    if (existing) existing.push(f);
    else byDate.set(iso, [f]);
  }

  const start = new Date(Date.UTC(targetYear, 0, 1));
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const end = new Date(Date.UTC(targetYear, 11, 31));
  end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));

  const cells: DayCell[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const iso = isoDate(cursor)!;
    const list = byDate.get(iso) ?? [];
    cells.push({
      iso,
      date: new Date(cursor),
      count: list.length,
      firstFlightId: list[0]?.id,
      routes: list.map(
        (x) =>
          `${x.result.departure.iata ?? "?"}→${x.result.arrival.iata ?? "?"}`,
      ),
      inYear: cursor.getUTCFullYear() === targetYear,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const weeks = Math.ceil(cells.length / 7);
  const width = WEEKDAY_LABEL_W + weeks * (CELL + GAP);
  const height = MONTH_LABEL_H + 7 * (CELL + GAP);

  const monthLabels: Array<{ x: number; label: string }> = [];
  for (let m = 0; m < 12; m++) {
    const first = new Date(Date.UTC(targetYear, m, 1));
    const idx = cells.findIndex((c) => c.iso === isoDate(first));
    if (idx < 0) continue;
    const col = Math.floor(idx / 7);
    monthLabels.push({
      x: WEEKDAY_LABEL_W + col * (CELL + GAP),
      label: first.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
    });
  }

  const max = Math.max(...cells.map((c) => c.count), 1);
  const totalInYear = cells.reduce(
    (sum, c) => sum + (c.inYear ? c.count : 0),
    0,
  );

  const rootRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const cellsEls = root.querySelectorAll("[data-cal-cell]");
      const monthEls = root.querySelectorAll("[data-cal-month]");
      if (!cellsEls.length) return;

      if (prefersReducedMotion()) {
        gsap.set([cellsEls, monthEls], { autoAlpha: 1, scale: 1 });
        return;
      }

      // Stagger cells diagonally from the top-left.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
        defaults: { ease: "siloOut" },
      });
      tl.from(monthEls, {
        autoAlpha: 0,
        y: -6,
        duration: 0.4,
        stagger: 0.02,
      });
      tl.from(
        cellsEls,
        {
          autoAlpha: 0,
          scale: 0.4,
          transformOrigin: "50% 50%",
          duration: 0.45,
          stagger: { each: 0.0025, from: "start" },
        },
        "-=0.2",
      );

      void ScrollTrigger;
    },
    { scope: rootRef, dependencies: [targetYear, totalInYear] },
  );

  return (
    <div ref={rootRef} className="space-y-3">
      <div className="flex items-baseline justify-between gap-3 text-[11px] tabular-nums text-zinc-500">
        <span>
          <span className="text-zinc-300">{targetYear}</span>
          <span className="ml-2">
            {totalInYear} flight{totalInYear === 1 ? "" : "s"}
          </span>
        </span>
        {flightYears.length > 1 && (
          <span className="hidden sm:inline">
            {flightYears.slice(0, 4).join(" · ")}
            {flightYears.length > 4 ? " · …" : ""}
          </span>
        )}
      </div>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="select-none"
          role="img"
          aria-label={`Flight calendar for ${targetYear}: ${totalInYear} flights`}
        >
          {monthLabels.map((m) => (
            <text
              key={m.label}
              data-cal-month
              x={m.x}
              y={12}
              fill="rgba(161,161,170,0.7)"
              fontSize="10"
            >
              {m.label}
            </text>
          ))}
          {[1, 3, 5].map((rowIndex) => (
            <text
              key={WEEKDAYS[rowIndex]}
              x={0}
              y={MONTH_LABEL_H + rowIndex * (CELL + GAP) + CELL - 2}
              fill="rgba(161,161,170,0.5)"
              fontSize="9"
            >
              {WEEKDAYS[rowIndex]}
            </text>
          ))}
          {cells.map((c, i) => {
            const col = Math.floor(i / 7);
            const row = i % 7;
            const x = WEEKDAY_LABEL_W + col * (CELL + GAP);
            const y = MONTH_LABEL_H + row * (CELL + GAP);
            const fill = c.inYear ? FILL[bucket(c.count, max)] : "transparent";
            const tip = formatTooltip(c);
            const rect = (
              <rect
                data-cal-cell
                x={x}
                y={y}
                width={CELL}
                height={CELL}
                rx={RADIUS}
                fill={fill}
                stroke={c.count > 0 ? "rgba(125,211,252,0.35)" : "transparent"}
                strokeWidth={c.count > 0 ? 0.5 : 0}
              >
                <title>{tip}</title>
              </rect>
            );
            if (c.firstFlightId) {
              return (
                <a
                  key={c.iso}
                  href={`/flights/${c.firstFlightId}`}
                  style={{ cursor: "pointer" }}
                >
                  {rect}
                </a>
              );
            }
            return <g key={c.iso}>{rect}</g>;
          })}
        </svg>
      </div>
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
      <span>Less</span>
      {FILL.map((f, i) => (
        <span
          key={i}
          aria-hidden
          className="inline-block h-2.5 w-2.5 rounded-[2px] ring-1 ring-inset ring-white/5"
          style={{ background: f }}
        />
      ))}
      <span>More</span>
    </div>
  );
}

function bucket(count: number, max: number): number {
  if (count <= 0) return 0;
  if (max <= 1) return 3;
  const r = count / max;
  if (r <= 0.25) return 1;
  if (r <= 0.5) return 2;
  if (r <= 0.75) return 3;
  return 4;
}

function isoDate(d: Date): string | null {
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function formatTooltip(c: DayCell): string {
  const human = c.date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  if (c.count === 0) return human;
  const routesPart = c.routes.length
    ? ` · ${c.routes.slice(0, 3).join(", ")}${c.routes.length > 3 ? "…" : ""}`
    : "";
  return `${human} · ${c.count} flight${c.count > 1 ? "s" : ""}${routesPart}`;
}
