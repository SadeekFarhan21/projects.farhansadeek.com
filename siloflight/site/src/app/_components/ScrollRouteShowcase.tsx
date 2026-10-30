"use client";

import { useRef } from "react";
import {
  gsap,
  ScrollTrigger,
  MotionPathPlugin,
  useGSAP,
  prefersReducedMotion,
} from "@/lib/gsap";

/**
 * Scroll-driven route showcase. As the section passes through the viewport:
 *   1) The great-circle SEA → ANC stroke "draws" via DrawSVG.
 *   2) A plane glyph rides the path with MotionPath (autoRotate to tangent).
 *   3) Four stat tiles count up in lockstep with scroll progress.
 *   4) Endpoint blocks and caption fade in at thresholds.
 */
export default function ScrollRouteShowcase() {
  const root = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;

      const path = el.querySelector("[data-route-path]") as SVGPathElement | null;
      const plane = el.querySelector("[data-route-plane]") as SVGGElement | null;
      const distEl = el.querySelector("[data-stat-dist]") as HTMLElement | null;
      const timeEl = el.querySelector("[data-stat-time]") as HTMLElement | null;
      const altEl = el.querySelector("[data-stat-alt]") as HTMLElement | null;
      const speedEl = el.querySelector("[data-stat-speed]") as HTMLElement | null;
      if (!path || !plane || !distEl || !timeEl || !altEl || !speedEl) return;

      if (prefersReducedMotion()) {
        gsap.set(path, { drawSVG: "0% 100%" });
        const len = path.getTotalLength();
        const end = path.getPointAtLength(len);
        gsap.set(plane, { x: end.x, y: end.y });
        distEl.textContent = "1,448";
        timeEl.textContent = "3h 45m";
        altEl.textContent = "37,000";
        speedEl.textContent = "498";
        return;
      }

      // Master timeline driven by scroll progress.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: "top 70%",
          end: "bottom 30%",
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });

      tl.fromTo(
        path,
        { drawSVG: "0% 0%" },
        { drawSVG: "0% 100%", duration: 1, ease: "none" },
        0,
      );

      tl.to(
        plane,
        {
          motionPath: {
            path,
            align: path,
            alignOrigin: [0.5, 0.5],
            autoRotate: true,
          },
          ease: "none",
          duration: 1,
        },
        0,
      );

      // Counters share the same scroll range.
      const counters = { dist: 0, mins: 0, alt: 0, speed: 0 };
      tl.to(
        counters,
        {
          dist: 1448,
          mins: 225,
          alt: 37000,
          speed: 498,
          ease: "none",
          duration: 1,
          onUpdate: () => {
            distEl.textContent = formatNum(counters.dist);
            const h = Math.floor(counters.mins / 60);
            const m = Math.floor(counters.mins % 60);
            timeEl.textContent = `${h}h ${m.toString().padStart(2, "0")}m`;
            altEl.textContent = formatNum(counters.alt);
            speedEl.textContent = formatNum(counters.speed);
          },
        },
        0,
      );

      // Discrete fade-ins for endpoint columns + caption — one ScrollTrigger.
      const dep = el.querySelector("[data-route-dep]");
      const arr = el.querySelector("[data-route-arr]");
      const caption = el.querySelector("[data-route-caption]");
      const stats = el.querySelectorAll("[data-route-stat]");

      const intro = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      });
      intro
        .from(caption, { autoAlpha: 0, y: 12, duration: 0.5, ease: "siloOut" })
        .from(
          [dep, arr],
          {
            autoAlpha: 0,
            y: 24,
            duration: 0.7,
            ease: "siloOut",
            stagger: 0.08,
          },
          "-=0.25",
        )
        .from(
          stats,
          {
            autoAlpha: 0,
            y: 16,
            duration: 0.5,
            ease: "siloOut",
            stagger: 0.06,
          },
          "-=0.4",
        );

      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
        intro.scrollTrigger?.kill();
        intro.kill();
      };
    },
    { scope: root },
  );

  // Reference MotionPathPlugin so tree-shaking keeps it.
  void MotionPathPlugin;

  return (
    <section
      ref={root}
      className="relative w-full px-6 py-32 lg:px-12 lg:py-40"
    >
      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center">
        <p
          data-route-caption
          className="mb-6 font-mono text-[10px] uppercase tracking-[0.5em] text-neutral-500"
        >
          Route detail · Auto-populated from FlightAware
        </p>

        <div className="grid w-full max-w-5xl grid-cols-2 items-center gap-2 sm:gap-8">
          <div data-route-dep className="text-left">
            <div className="text-7xl font-semibold tracking-tight text-neutral-50 sm:text-8xl">
              SEA
            </div>
            <div className="mt-2 text-xs uppercase tracking-widest text-neutral-500">
              Seattle · 08:55
            </div>
          </div>
          <div data-route-arr className="text-right">
            <div className="text-7xl font-semibold tracking-tight text-neutral-50 sm:text-8xl">
              ANC
            </div>
            <div className="mt-2 text-xs uppercase tracking-widest text-neutral-500">
              Anchorage · 12:40
            </div>
          </div>
        </div>

        <div className="relative mt-8 w-full max-w-5xl">
          <svg
            viewBox="0 0 1000 160"
            className="w-full"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient
                id="route-grad"
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <stop offset="0%" stopColor="rgba(159,199,255,0.3)" />
                <stop offset="50%" stopColor="rgba(159,199,255,0.95)" />
                <stop offset="100%" stopColor="rgba(159,199,255,0.3)" />
              </linearGradient>
              <filter id="route-glow">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Faint reference path (full curve, low opacity). */}
            <path
              d="M 30 110 Q 500 -30 970 110"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
              strokeDasharray="2 6"
            />
            {/* Drawn-on stroke that follows scroll progress. */}
            <path
              data-route-path
              d="M 30 110 Q 500 -30 970 110"
              fill="none"
              stroke="url(#route-grad)"
              strokeWidth="2.4"
              strokeLinecap="round"
              filter="url(#route-glow)"
            />
            <circle cx="30" cy="110" r="6" fill="#9fc7ff" />
            <circle cx="30" cy="110" r="14" fill="rgba(159,199,255,0.18)" />
            <circle cx="970" cy="110" r="6" fill="#9fc7ff" />
            <circle cx="970" cy="110" r="14" fill="rgba(159,199,255,0.18)" />

            <g data-route-plane>
              <path
                d="M 22 0 L 4 0 L 0 -4 L 8 -4 L 12 -8 L 14 -8 L 14 -4 L 18 -4 L 22 0 Z M 4 0 L 0 4 L 8 4 L 12 8 L 14 8 L 14 4 L 18 4 L 22 0 Z"
                fill="#e6f0ff"
                opacity="0.95"
              />
            </g>
          </svg>
        </div>

        <div className="mt-10 grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <Stat label="Distance" value="0" unit="mi" dataAttr="dist" />
          <Stat label="Time" value="0h 00m" unit="" dataAttr="time" />
          <Stat label="Altitude" value="0" unit="ft" dataAttr="alt" />
          <Stat label="Speed" value="0" unit="mph" dataAttr="speed" />
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  unit,
  dataAttr,
}: {
  label: string;
  value: string;
  unit: string;
  dataAttr: "dist" | "time" | "alt" | "speed";
}) {
  return (
    <div
      data-route-stat
      className="rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 backdrop-blur-sm"
    >
      <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span
          {...{ [`data-stat-${dataAttr}`]: "" }}
          className="text-2xl font-semibold tracking-tight text-neutral-50 tabular-nums"
        >
          {value}
        </span>
        {unit && <span className="text-xs text-neutral-500">{unit}</span>}
      </div>
    </div>
  );
}

function formatNum(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

// ScrollTrigger import kept for type-side registration in lib/gsap.ts.
void ScrollTrigger;
