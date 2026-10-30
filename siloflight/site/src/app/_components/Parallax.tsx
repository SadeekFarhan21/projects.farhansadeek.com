"use client";

import { useRef, type ReactNode, type CSSProperties } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";

/**
 * Scroll-linked vertical translate. The element moves by `distance` px over the
 * lifetime of its trigger range — positive distance moves it down, negative up.
 * Uses ScrollTrigger scrub for smooth, frame-perfect linking.
 */
export default function Parallax({
  children,
  distance = -80,
  scrub = 1,
  className,
  style,
  as: Tag = "div",
}: {
  children: ReactNode;
  /** total px to translate by over the trigger range. Negative goes up. */
  distance?: number;
  /** ScrollTrigger scrub (true | number). 0.4 - 1.5 feels nice. */
  scrub?: number | boolean;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "span" | "section";
}) {
  const ref = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (prefersReducedMotion()) return;

      const tween = gsap.to(el, {
        y: distance,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub,
          invalidateOnRefresh: true,
        },
      });

      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    },
    { scope: ref, dependencies: [distance, scrub] },
  );

  return (
    // @ts-expect-error - ref typing across union element types
    <Tag ref={ref} className={className} style={style}>
      {children}
    </Tag>
  );
}
