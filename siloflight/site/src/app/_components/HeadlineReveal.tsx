"use client";

import { useRef, type ReactNode } from "react";
import {
  gsap,
  SplitText,
  useGSAP,
  prefersReducedMotion,
} from "@/lib/gsap";

/**
 * Curtain-reveal headline. Each visible line rises from behind a clip mask
 * using GSAP SplitText (mask:"lines"), then settles. autoSplit re-runs when
 * fonts load or width changes.
 *
 * Two text blocks are rendered side by side:
 *   - `children`  → the main text
 *   - `highlight` → a styled phrase that gets the same line-mask reveal but
 *                   with a slight delay, so the eye lands on it last.
 */
export default function HeadlineReveal({
  children,
  highlight,
  highlightClassName,
  className,
  delay = 0.1,
  as: Tag = "h1",
}: {
  children: ReactNode;
  highlight?: string;
  highlightClassName?: string;
  className?: string;
  delay?: number;
  as?: "h1" | "h2";
}) {
  const ref = useRef<HTMLHeadingElement | null>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const main = root.querySelector("[data-headline-main]") as HTMLElement | null;
      const accent = root.querySelector(
        "[data-headline-accent]",
      ) as HTMLElement | null;

      const splits: SplitText[] = [];

      if (prefersReducedMotion()) {
        if (main) main.style.visibility = "visible";
        if (accent) accent.style.visibility = "visible";
        return;
      }

      if (main) {
        const s = SplitText.create(main, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) => {
            main.style.visibility = "visible";
            return gsap.from(self.lines, {
              yPercent: 110,
              duration: 0.95,
              ease: "siloOut",
              stagger: 0.1,
              delay,
            });
          },
        });
        splits.push(s);
      }

      if (accent) {
        const s = SplitText.create(accent, {
          type: "lines, chars",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) => {
            accent.style.visibility = "visible";
            const tl = gsap.timeline({ delay: delay + 0.55 });
            tl.from(self.lines, {
              yPercent: 110,
              duration: 0.85,
              ease: "siloOut",
            });
            tl.from(
              self.chars,
              {
                autoAlpha: 0,
                yPercent: 30,
                rotateX: -45,
                transformOrigin: "50% 100% -10px",
                duration: 0.6,
                ease: "siloOut",
                stagger: 0.025,
              },
              "-=0.5",
            );
            return tl;
          },
        });
        splits.push(s);
      }

      return () => {
        splits.forEach((s) => s.revert());
      };
    },
    { scope: ref, dependencies: [delay] },
  );

  return (
    <Tag ref={ref} className={className} style={{ perspective: "800px" }}>
      <span
        data-headline-main
        className="block"
        style={{ visibility: "hidden" }}
      >
        {children}
      </span>
      {highlight ? (
        <span
          data-headline-accent
          className={`block ${highlightClassName ?? ""}`}
          style={{ visibility: "hidden" }}
        >
          {highlight}
        </span>
      ) : null}
    </Tag>
  );
}
