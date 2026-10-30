"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from "@/lib/gsap";

// Alternating accent + zinc tones — both palettes are first-class CSS tokens
// (--accent + --text-1/2/3), so each slice stays in-system while reading
// distinctly. The donut needs real contrast between adjacent arcs or it
// looks like a single ring.
const COLORS = [
  "#9fc7ff", // accent base — largest slice
  "#e4e4e7", // zinc-200 — high contrast against accent
  "#7eb1ff", // accent strong
  "#b0b0b0", // text-2 (mid zinc)
  "#5e93e6", // accent deep
  "#8a8a8a", // text-3 (deep zinc)
];

// Visible gap between slices, in degrees. Converted to arc-length below.
const SLICE_GAP_DEG = 3;

type Slice = { code: string; count: number };

export default function AirportsDonut({ data }: { data: Slice[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const ref = useRef<HTMLDivElement | null>(null);

  const r = 64;
  const stroke = 18;
  const c = 2 * Math.PI * r;

  // Convert the fixed angular gap into arc length, so every slice — large or
  // small — gets the same visual breathing room.
  const gapLen = (SLICE_GAP_DEG / 360) * c;
  const slices = data.reduce<
    Array<Slice & { color: string; dasharray: string; dashoffset: number; pct: number }>
  >((out, d, i) => {
    const acc = out.reduce((s, x) => s + x.pct, 0);
    const frac = d.count / Math.max(1, total);
    const fullLen = frac * c;
    // Subtract the gap from the visible arc (clamped so tiny slices still
    // render at least a sliver).
    const visibleLen = Math.max(2, fullLen - gapLen);
    out.push({
      ...d,
      color: COLORS[i % COLORS.length],
      dasharray: `${visibleLen} ${c - visibleLen}`,
      dashoffset: -acc * c,
      pct: frac,
    });
    return out;
  }, []);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const arcs = root.querySelectorAll("[data-donut-arc]");
      const center = root.querySelector("[data-donut-center]");
      const items = root.querySelectorAll("[data-legend]");
      if (!arcs.length) return;

      if (prefersReducedMotion()) {
        gsap.set(arcs, { drawSVG: "0% 100%" });
        gsap.set([center, ...items], { autoAlpha: 1 });
        return;
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
        defaults: { ease: "siloOut" },
      });

      tl.fromTo(
        arcs,
        { drawSVG: "0% 0%" },
        { drawSVG: "0% 100%", duration: 0.9, stagger: 0.08 },
        0,
      );
      tl.from(
        center,
        { autoAlpha: 0, scale: 0.85, duration: 0.5 },
        0.3,
      );
      tl.from(
        items,
        { autoAlpha: 0, x: 12, duration: 0.5, stagger: 0.05 },
        0.4,
      );
    },
    { scope: ref, dependencies: [total] },
  );

  if (total === 0) return null;

  // Reference for tree-shaking
  void ScrollTrigger;

  return (
    <div
      ref={ref}
      className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6"
    >
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="-80 -80 160 160" className="h-full w-full -rotate-90">
          <circle
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={stroke}
          />
          {slices.map((s) => (
            <circle
              key={s.code}
              data-donut-arc
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
              strokeDasharray={s.dasharray}
              strokeDashoffset={s.dashoffset}
            />
          ))}
        </svg>
        <div
          data-donut-center
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Airports
          </span>
          <span className="text-3xl font-semibold tabular-nums text-zinc-50">
            {data.length}
          </span>
          <span className="mt-0.5 text-[10px] tabular-nums text-zinc-500">
            {total} visits
          </span>
        </div>
      </div>
      <ul className="flex w-full flex-col gap-2 text-sm">
        {slices.map((s) => (
          <li
            key={s.code}
            data-legend
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="font-medium text-zinc-100">{s.code}</span>
            </div>
            <div className="flex items-center gap-2 tabular-nums text-zinc-500">
              <span>{s.count}</span>
              <span className="text-zinc-700">·</span>
              <span className="w-9 text-right">{Math.round(s.pct * 100)}%</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
