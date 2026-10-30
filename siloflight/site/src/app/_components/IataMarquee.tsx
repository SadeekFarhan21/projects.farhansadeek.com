"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";

const CODES = [
  "JFK",
  "LAX",
  "SEA",
  "LHR",
  "CDG",
  "HND",
  "DXB",
  "SIN",
  "SYD",
  "GIG",
  "CPH",
  "MEX",
  "IST",
  "SFO",
  "HKG",
  "DEL",
  "NBO",
  "ARN",
  "AMS",
  "FRA",
  "ICN",
  "BKK",
  "MAD",
  "FCO",
  "ZRH",
  "YYZ",
  "ORD",
  "DEN",
  "BOS",
  "MIA",
];

export default function IataMarquee({
  speed = 50,
  className,
}: {
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const root = ref.current;
      if (!root) return;
      const track = root.querySelector("[data-track]") as HTMLElement | null;
      if (!track) return;
      const half = track.scrollWidth / 2;
      const duration = half / speed;
      const tween = gsap.to(track, {
        x: -half,
        duration,
        ease: "none",
        repeat: -1,
      });
      return () => {
        tween.kill();
      };
    },
    { scope: ref, dependencies: [speed] },
  );

  const list = [...CODES, ...CODES];

  return (
    <div
      ref={ref}
      className={`relative flex w-full overflow-hidden ${className ?? ""}`}
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
      }}
      aria-hidden
    >
      <div data-track className="flex shrink-0 items-center gap-12 whitespace-nowrap">
        {list.map((c, i) => (
          <span
            key={`${c}-${i}`}
            className="font-mono text-xs uppercase tracking-[0.4em] text-neutral-500"
          >
            <span className="text-neutral-300">{c}</span>
            <span className="ml-12 text-neutral-700">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
