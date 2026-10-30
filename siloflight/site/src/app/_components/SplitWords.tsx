"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from "@/lib/gsap";

/**
 * Splits the given text into per-word spans and reveals them one by one with a
 * lift + opacity stagger. Optional `wordsToHighlight` get a gradient treatment
 * applied via wrapper className so the design stays in the consumer's hands.
 *
 * The text is plain string only (so we can split safely); style the result by
 * wrapping the component or via the `wordClassName` prop.
 */
export default function SplitWords({
  text,
  delay = 0,
  duration = 0.9,
  stagger = 0.07,
  y = 28,
  whenVisible = false,
  className,
  wordClassName,
  highlight,
  highlightClassName,
  as: Tag = "h1",
}: {
  text: string;
  delay?: number;
  duration?: number;
  stagger?: number;
  y?: number;
  whenVisible?: boolean;
  className?: string;
  wordClassName?: string;
  /** A substring (must be one or more contiguous words) to wrap in a special class */
  highlight?: string;
  highlightClassName?: string;
  as?: "h1" | "h2" | "h3" | "p" | "div";
}): ReactNode {
  const ref = useRef<HTMLElement | null>(null);

  const tokens = useMemo(() => splitTokens(text, highlight), [text, highlight]);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const words = Array.from(root.querySelectorAll("[data-word]"));
      if (!words.length) return;

      if (prefersReducedMotion()) {
        gsap.set(words, { autoAlpha: 1, y: 0 });
        return;
      }

      gsap.set(words, { autoAlpha: 0, y, willChange: "transform, opacity" });

      const animate = () => {
        gsap.to(words, {
          autoAlpha: 1,
          y: 0,
          duration,
          delay,
          ease: "power3.out",
          stagger,
          clearProps: "willChange,transform",
          overwrite: "auto",
        });
      };

      if (whenVisible) {
        const trigger = ScrollTrigger.create({
          trigger: root,
          start: "top 88%",
          once: true,
          onEnter: animate,
        });
        return () => trigger.kill();
      }
      animate();
    },
    { scope: ref, dependencies: [delay, duration, stagger, y, whenVisible, text] },
  );

  return (
    // @ts-expect-error - ref typing across union element types
    <Tag ref={ref} className={className}>
      {tokens.map((tok, i) =>
        tok.kind === "space" ? (
          <span key={i}>{" "}</span>
        ) : (
          <span
            key={i}
            data-word
            className={`inline-block ${wordClassName ?? ""} ${
              tok.highlighted ? highlightClassName ?? "" : ""
            }`}
            style={{ willChange: "transform, opacity" }}
          >
            {tok.text}
          </span>
        ),
      )}
    </Tag>
  );
}

type Token =
  | { kind: "word"; text: string; highlighted: boolean }
  | { kind: "space" };

function splitTokens(text: string, highlight?: string): Token[] {
  const result: Token[] = [];
  const lo = highlight?.trim().toLowerCase();
  const parts = text.split(/(\s+)/);
  // Pre-split highlight into a set of word-positions (matched as a contiguous slice).
  const words = parts.filter((p) => !/^\s+$/.test(p));
  const highlightWords = lo ? lo.split(/\s+/) : [];
  // Find first contiguous match (case-insensitive).
  let highlightStart = -1;
  if (highlightWords.length) {
    for (let i = 0; i + highlightWords.length <= words.length; i++) {
      let match = true;
      for (let j = 0; j < highlightWords.length; j++) {
        const w = words[i + j].toLowerCase().replace(/[^\w]/g, "");
        if (!w.startsWith(highlightWords[j])) {
          match = false;
          break;
        }
      }
      if (match) {
        highlightStart = i;
        break;
      }
    }
  }
  let wordIdx = 0;
  for (const p of parts) {
    if (/^\s+$/.test(p)) {
      result.push({ kind: "space" });
    } else {
      const isHi =
        highlightStart >= 0 &&
        wordIdx >= highlightStart &&
        wordIdx < highlightStart + highlightWords.length;
      result.push({ kind: "word", text: p, highlighted: isHi });
      wordIdx++;
    }
  }
  return result;
}
