"use client";

import React from "react";
import { useGsap } from "@/lib/useGsap";
import { gsap } from "@/lib/gsap";
import type { CSSProperties, ElementType } from "react";

type Props = {
  as?: ElementType;
  children: string;
  className?: string;
  style?: CSSProperties;
  /** Split by 'word' (default) or 'char' */
  split?: "word" | "char";
  /** Stagger between tokens, in seconds */
  stagger?: number;
  /** Y offset to animate from */
  from?: number;
  /** Animate on mount instead of via ScrollTrigger (use for above-the-fold headings) */
  immediate?: boolean;
  /** Delay before mount animation starts (when `immediate`) */
  delay?: number;
} & Record<`data-${string}`, string | undefined>;

export default function KineticHeading({
  as: Tag = "h2",
  children,
  className,
  style,
  split = "word",
  stagger = 0.06,
  from = 28,
  immediate = false,
  delay = 0,
  ...rest
}: Props) {
  const ref = useGsap<HTMLElement>((_ctx, scope) => {
    const tokens = scope.querySelectorAll("[data-kinetic]");
    if (!tokens.length) return;
    gsap.set(tokens, { yPercent: 110, opacity: 0, rotate: 4 });
    gsap.to(tokens, {
      yPercent: 0,
      opacity: 1,
      rotate: 0,
      duration: 0.85,
      ease: "expo.out",
      stagger,
      delay: immediate ? delay : 0,
      ...(immediate
        ? {}
        : { scrollTrigger: { trigger: scope, start: "top 85%", once: true } }),
    });
  }, [children, split, stagger, from, immediate, delay]);

  const tokens =
    split === "char"
      ? Array.from(children).map((ch, i) => ({ key: i, val: ch }))
      : children.split(/(\s+)/).map((w, i) => ({ key: i, val: w }));

  const inner = tokens.map(({ key, val }) =>
    /^\s+$/.test(val) ? (
      <span key={key}>{val}</span>
    ) : (
      <span
        key={key}
        className="inline-block overflow-hidden align-baseline pb-[0.08em]"
      >
        <span data-kinetic className="inline-block will-change-transform">
          {val}
        </span>
      </span>
    ),
  );

  return React.createElement(
    Tag,
    { ref, className, style, ...rest },
    inner,
  );
}
