"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion, hasFineHover } from "@/lib/gsap";

/**
 * A soft radial glow that follows the cursor inside its parent container.
 * Renders as a fixed-position element scoped to the parent's bounds via
 * IntersectionObserver-free pointermove math. Disabled on touch + reduced-motion.
 *
 * Drop inside any positioned container; absolute-positioned by default.
 */
export default function CursorGlow({
  size = 480,
  color = "rgba(125, 211, 252, 0.18)",
  className = "",
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  const dotRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const dot = dotRef.current;
      if (!dot) return;
      if (prefersReducedMotion() || !hasFineHover()) {
        dot.style.display = "none";
        return;
      }

      const parent = dot.parentElement;
      if (!parent) return;

      // quickTo gives us a single tween that we re-use on every pointermove —
      // this is the canonical performance pattern for cursor followers.
      const xTo = gsap.quickTo(dot, "x", { duration: 0.55, ease: "power3.out" });
      const yTo = gsap.quickTo(dot, "y", { duration: 0.55, ease: "power3.out" });
      const oTo = gsap.quickTo(dot, "opacity", {
        duration: 0.4,
        ease: "power2.out",
      });

      const onMove = (e: PointerEvent) => {
        const r = parent.getBoundingClientRect();
        xTo(e.clientX - r.left - size / 2);
        yTo(e.clientY - r.top - size / 2);
        oTo(1);
      };
      const onLeave = () => oTo(0);
      const onEnter = () => oTo(1);

      parent.addEventListener("pointermove", onMove);
      parent.addEventListener("pointerleave", onLeave);
      parent.addEventListener("pointerenter", onEnter);
      return () => {
        parent.removeEventListener("pointermove", onMove);
        parent.removeEventListener("pointerleave", onLeave);
        parent.removeEventListener("pointerenter", onEnter);
      };
    },
    { dependencies: [size] },
  );

  return (
    <div
      ref={dotRef}
      aria-hidden
      className={`pointer-events-none absolute left-0 top-0 z-0 rounded-full blur-3xl opacity-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(closest-side, ${color}, transparent 70%)`,
        mixBlendMode: "screen",
      }}
    />
  );
}
