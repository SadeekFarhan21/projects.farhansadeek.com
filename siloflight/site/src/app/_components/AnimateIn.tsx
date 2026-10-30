"use client";

import { useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from "@/lib/gsap";

type Props = {
  children: ReactNode;
  /** seconds */
  delay?: number;
  duration?: number;
  /** how far below the final position to start, in px */
  y?: number;
  /** stagger child elements (immediate children of the wrapper) by this many seconds */
  stagger?: number;
  /** trigger animation when element scrolls into the viewport (uses ScrollTrigger.batch) */
  whenVisible?: boolean;
  /** seconds before the start position used by ScrollTrigger.batch */
  start?: string;
  className?: string;
  /** wrapper element */
  as?: "div" | "section" | "ul" | "ol" | "header" | "main";
};

export default function AnimateIn({
  children,
  delay = 0,
  duration = 0.8,
  y = 22,
  stagger,
  whenVisible = false,
  start = "top 85%",
  className,
  as: Tag = "div",
}: Props) {
  const ref = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;

      const targets = stagger ? Array.from(root.children) : [root];

      if (prefersReducedMotion()) {
        gsap.set(targets, { opacity: 1, y: 0, clearProps: "all" });
        return;
      }

      // Initial state — hidden, slightly below.
      gsap.set(targets, { opacity: 0, y, force3D: true });

      const animate = () => {
        gsap.to(targets, {
          opacity: 1,
          y: 0,
          duration,
          delay,
          ease: "siloOut",
          stagger: stagger ?? 0,
          clearProps: "transform",
          overwrite: "auto",
        });
      };

      if (whenVisible) {
        // ScrollTrigger.batch — debounced, viewport-driven, refreshes on resize.
        const triggers = ScrollTrigger.batch(targets as Element[], {
          start,
          once: true,
          onEnter: (batch) => {
            gsap.to(batch, {
              opacity: 1,
              y: 0,
              duration,
              ease: "siloOut",
              stagger: stagger ?? 0.08,
              clearProps: "transform",
              overwrite: "auto",
            });
          },
        });
        return () => {
          triggers.forEach((t) => t.kill());
        };
      }

      animate();
    },
    { scope: ref, dependencies: [delay, duration, y, stagger, whenVisible, start] },
  );

  return (
    // @ts-expect-error - ref typing across union element types
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
