"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";

type Blob = {
  size: number;
  left: string;
  top: string;
  color: string;
  delay: number;
};

// Tonal accent variants of #9fc7ff — keeps the page on a single hue and
// avoids stray colors that fight the editorial dark palette.
const DEFAULT_BLOBS: Blob[] = [
  {
    size: 460,
    left: "8%",
    top: "12%",
    color: "rgba(159, 199, 255, 0.10)",
    delay: 0,
  },
  {
    size: 360,
    left: "70%",
    top: "10%",
    color: "rgba(126, 177, 255, 0.07)",
    delay: 0.4,
  },
  {
    size: 520,
    left: "55%",
    top: "70%",
    color: "rgba(159, 199, 255, 0.06)",
    delay: 0.8,
  },
  {
    size: 320,
    left: "5%",
    top: "75%",
    color: "rgba(190, 217, 255, 0.05)",
    delay: 1.2,
  },
];

/**
 * Floating ambient blurred blobs that drift gently in random directions on an
 * infinite yoyo. They sit behind everything, blend with the page, and never
 * intercept pointer events. Disabled for reduced-motion.
 */
export default function AmbientBlobs({ blobs = DEFAULT_BLOBS }: { blobs?: Blob[] }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const els = Array.from(root.children) as HTMLElement[];
      if (prefersReducedMotion()) return;

      // Each blob gets its own infinite drift tween with random offsets and
      // duration via gsap.utils.random — organic, never-quite-the-same feel.
      const tweens = els.map((el, i) => {
        const dx = gsap.utils.random(-60, 60, 1);
        const dy = gsap.utils.random(-50, 50, 1);
        const dur = gsap.utils.random(10, 18, 0.1);
        return gsap.to(el, {
          x: dx,
          y: dy,
          duration: dur,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: i * 0.4,
        });
      });

      return () => tweens.forEach((t) => t.kill());
    },
    { scope: ref },
  );

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {blobs.map((b, i) => (
        <span
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            width: b.size,
            height: b.size,
            left: b.left,
            top: b.top,
            background: `radial-gradient(closest-side, ${b.color}, transparent 70%)`,
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
}
