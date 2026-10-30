"use client";

import { useMemo, useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";

/**
 * Headline whose characters drop into place with a slight 3D rotateX from the
 * top, then a brief scramble pass over a small subset of letters before
 * settling. The "highlight" substring receives a gradient class.
 */
export default function ScrambleHeadline({
  text,
  highlight,
  highlightClassName,
  className,
  delay = 0.1,
}: {
  text: string;
  highlight?: string;
  highlightClassName?: string;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLHeadingElement | null>(null);

  const tokens = useMemo(() => splitWordsWithHighlight(text, highlight), [
    text,
    highlight,
  ]);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const chars = Array.from(
        root.querySelectorAll("[data-char]"),
      ) as HTMLElement[];
      if (!chars.length) return;

      if (prefersReducedMotion()) {
        gsap.set(chars, { autoAlpha: 1, y: 0, rotateX: 0 });
        return;
      }

      gsap.set(chars, {
        autoAlpha: 0,
        y: 28,
        rotateX: -55,
        transformPerspective: 700,
        transformOrigin: "50% 100% -10px",
      });

      const tl = gsap.timeline({ delay });
      tl.to(chars, {
        autoAlpha: 1,
        y: 0,
        rotateX: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.022,
      });

      // Brief scramble pass on a few non-space letters of the highlight (or last word).
      const scrambleTargets = chars.filter(
        (el) =>
          el.dataset.scramble === "1" && (el.textContent ?? "").trim() !== "",
      );
      const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
      scrambleTargets.forEach((el, i) => {
        const original = el.textContent ?? "";
        let n = 0;
        const total = 6;
        const obj = { v: 0 };
        tl.to(
          obj,
          {
            v: 1,
            duration: 0.35,
            ease: "none",
            onUpdate: () => {
              n++;
              if (n < total) {
                el.textContent =
                  charset[Math.floor(Math.random() * charset.length)];
              } else {
                el.textContent = original;
              }
            },
            onComplete: () => {
              el.textContent = original;
            },
          },
          `-=${0.85 - i * 0.04}`,
        );
      });

      return () => {
        tl.kill();
      };
    },
    { scope: ref, dependencies: [text, highlight, delay] },
  );

  return (
    <h1 ref={ref} className={className}>
      {tokens.map((tok, i) =>
        tok.kind === "space" ? (
          <span key={i}>{" "}</span>
        ) : (
          <span
            key={i}
            className={`inline-block whitespace-pre ${
              tok.highlighted ? highlightClassName ?? "" : ""
            }`}
            style={{ perspective: "700px" }}
          >
            {Array.from(tok.text).map((ch, j) => (
              <span
                key={j}
                data-char
                data-scramble={tok.highlighted ? "1" : "0"}
                className="inline-block"
                style={{ willChange: "transform, opacity" }}
              >
                {ch}
              </span>
            ))}
          </span>
        ),
      )}
    </h1>
  );
}

type Token =
  | { kind: "word"; text: string; highlighted: boolean }
  | { kind: "space" };

function splitWordsWithHighlight(text: string, highlight?: string): Token[] {
  const result: Token[] = [];
  const lo = highlight?.trim().toLowerCase();
  const parts = text.split(/(\s+)/);
  const words = parts.filter((p) => !/^\s+$/.test(p));
  const hiWords = lo ? lo.split(/\s+/) : [];
  let hiStart = -1;
  if (hiWords.length) {
    for (let i = 0; i + hiWords.length <= words.length; i++) {
      let match = true;
      for (let j = 0; j < hiWords.length; j++) {
        const w = words[i + j].toLowerCase().replace(/[^\w]/g, "");
        if (!w.startsWith(hiWords[j])) {
          match = false;
          break;
        }
      }
      if (match) {
        hiStart = i;
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
        hiStart >= 0 &&
        wordIdx >= hiStart &&
        wordIdx < hiStart + hiWords.length;
      result.push({ kind: "word", text: p, highlighted: isHi });
      wordIdx++;
    }
  }
  return result;
}
