"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP, prefersReducedMotion, hasFineHover } from "@/lib/gsap";

/**
 * A subtle 3D tilt on hover. The card rotates toward the cursor on
 * rotationX/rotationY and lifts slightly on Z. Snaps back smoothly on leave.
 * Auto-disabled on touch and reduced-motion. Built with gsap.quickTo so we
 * never create new tweens per pointermove.
 */
export default function TiltCard({
  children,
  /** maximum rotation in degrees on either axis */
  max = 6,
  /** how high to lift the card on hover, in px */
  lift = 6,
  className,
}: {
  children: ReactNode;
  max?: number;
  lift?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (prefersReducedMotion() || !hasFineHover()) return;

      gsap.set(el, { transformPerspective: 700, transformStyle: "preserve-3d" });

      const rxTo = gsap.quickTo(el, "rotationX", {
        duration: 0.45,
        ease: "power3.out",
      });
      const ryTo = gsap.quickTo(el, "rotationY", {
        duration: 0.45,
        ease: "power3.out",
      });
      const zTo = gsap.quickTo(el, "z", {
        duration: 0.45,
        ease: "power3.out",
      });

      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5; // -0.5 .. 0.5
        const py = (e.clientY - r.top) / r.height - 0.5;
        ryTo(px * 2 * max);
        rxTo(-py * 2 * max);
        zTo(lift);
      };
      const onLeave = () => {
        gsap.to(el, {
          rotationX: 0,
          rotationY: 0,
          z: 0,
          duration: 0.7,
          ease: "elastic.out(1, 0.55)",
        });
      };

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      return () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: ref, dependencies: [max, lift] },
  );

  return (
    <div ref={ref} className={className} style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}
