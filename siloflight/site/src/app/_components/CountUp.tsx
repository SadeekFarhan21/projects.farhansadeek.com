"use client";

import { useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from "@/lib/gsap";

type FormatMode = "number" | "time-minutes";

type Props = {
  value: number;
  duration?: number;
  decimals?: number;
  /** thousand-separator format the result (only when format="number") */
  thousands?: boolean;
  prefix?: string;
  suffix?: string;
  /** Built-in formatter mode (string, not a callback — props cross the SC/CC boundary). */
  format?: FormatMode;
  /** Replay the count-up when the element scrolls into view. Default true. */
  scrollReplay?: boolean;
  className?: string;
};

function formatValue(
  n: number,
  format: FormatMode,
  decimals: number,
  thousands: boolean,
): string {
  if (format === "time-minutes") {
    const total = Math.max(0, Math.round(n));
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${h}h ${m}m`;
  }
  return thousands
    ? n.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : n.toFixed(decimals);
}

export default function CountUp({
  value,
  duration = 1.6,
  decimals = 0,
  thousands = true,
  prefix,
  suffix,
  format = "number",
  scrollReplay = true,
  className,
}: Props) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const fmt = (n: number) => formatValue(n, format, decimals, thousands);
  const [initial] = useState(() => fmt(value));

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      if (prefersReducedMotion()) {
        el.textContent = fmt(value);
        return;
      }

      const obj = { n: 0 };

      const run = () => {
        obj.n = 0;
        gsap.to(obj, {
          n: value,
          duration,
          ease: "power2.out",
          overwrite: "auto",
          onUpdate: () => {
            el.textContent = fmt(obj.n);
          },
        });
      };

      if (scrollReplay) {
        const trigger = ScrollTrigger.create({
          trigger: el,
          start: "top 85%",
          onEnter: run,
          onEnterBack: run,
        });
        return () => trigger.kill();
      }
      run();
    },
    {
      scope: ref,
      dependencies: [value, duration, format, decimals, thousands, scrollReplay],
    },
  );

  return (
    <span ref={ref} className={className}>
      {prefix}
      {initial}
      {suffix}
    </span>
  );
}
