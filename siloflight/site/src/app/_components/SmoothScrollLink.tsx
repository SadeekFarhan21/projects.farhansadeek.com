"use client";

import { useRef, type ReactNode } from "react";
import {
  gsap,
  ScrollToPlugin,
  useGSAP,
  prefersReducedMotion,
} from "@/lib/gsap";

/**
 * Anchor that smoothly tweens scroll position to a target via GSAP's
 * ScrollToPlugin. Falls back to a plain jump for reduced-motion users.
 */
export default function SmoothScrollLink({
  to,
  className,
  children,
  duration = 1.1,
}: {
  to: string;
  className?: string;
  children: ReactNode;
  duration?: number;
}) {
  const ref = useRef<HTMLAnchorElement | null>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const onClick = (e: MouseEvent) => {
        e.preventDefault();
        const target =
          to === "top" || to === "#top" || to === "#"
            ? 0
            : (document.querySelector(to) as HTMLElement | null);
        if (target == null) return;
        if (prefersReducedMotion()) {
          window.scrollTo({
            top: typeof target === "number" ? target : target.offsetTop,
            behavior: "auto",
          });
          return;
        }
        gsap.to(window, {
          duration,
          scrollTo:
            typeof target === "number"
              ? { y: target, autoKill: true }
              : { y: target, offsetY: 16, autoKill: true },
          ease: "siloInOut",
        });
      };
      el.addEventListener("click", onClick);
      return () => el.removeEventListener("click", onClick);
    },
    { scope: ref, dependencies: [to, duration] },
  );

  // Reference plugin so tree-shaking keeps it.
  void ScrollToPlugin;

  return (
    <a ref={ref} href={to} className={className}>
      {children}
    </a>
  );
}
