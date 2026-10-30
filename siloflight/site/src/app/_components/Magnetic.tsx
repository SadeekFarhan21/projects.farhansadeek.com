"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP, prefersReducedMotion, hasFineHover } from "@/lib/gsap";

/**
 * Wraps a child element so on hover it gently follows the cursor (within
 * ~`strength` px of its center) and snaps back smoothly on leave.
 * Uses gsap.quickTo for performance — no new tweens are created per pointermove.
 * Auto-disabled for prefers-reduced-motion and touch / coarse pointers.
 */
export default function Magnetic({
  children,
  strength = 14,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (prefersReducedMotion() || !hasFineHover()) return;

      const target = el.firstElementChild as HTMLElement | null;
      if (!target) return;

      const xTo = gsap.quickTo(target, "x", {
        duration: 0.45,
        ease: "power3.out",
      });
      const yTo = gsap.quickTo(target, "y", {
        duration: 0.45,
        ease: "power3.out",
      });

      const onMove = (e: PointerEvent) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        xTo(((e.clientX - cx) / rect.width) * 2 * strength);
        yTo(((e.clientY - cy) / rect.height) * 2 * strength);
      };
      const onLeave = () => {
        gsap.to(target, {
          x: 0,
          y: 0,
          duration: 0.7,
          ease: "elastic.out(1, 0.5)",
        });
      };

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);

      return () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: ref, dependencies: [strength] },
  );

  return (
    <span ref={ref} className={className} style={{ display: "inline-block" }}>
      {children}
    </span>
  );
}
