"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play, Smartphone } from "lucide-react";
import { useGsap } from "@/lib/useGsap";
import { gsap } from "@/lib/gsap";
import Nebula3D from "./Nebula3D";

const codeLines: { t: string; c: "prompt" | "ok" | "dim" }[] = [
  { t: "$ treena clone you/api",                c: "prompt" },
  { t: "✓ cloned 4,128 files in 2.1s",          c: "ok"     },
  { t: "$ treena agent 'fix expired tokens'",   c: "prompt" },
  { t: "→ reading auth/token.ts",               c: "dim"    },
  { t: "→ patching refresh handler",            c: "dim"    },
  { t: "✓ 12 tests passed",                     c: "ok"     },
  { t: "$ git commit -am 'fix: token refresh'", c: "prompt" },
  { t: "$ git push origin main",                c: "prompt" },
  { t: "  2c3a8b1..1a9f0e2  main → main",       c: "ok"     },
];

const colorFor = (c: string) =>
  c === "prompt" ? "#10B981" :
  c === "ok"     ? "#86EFAC" :
  c === "dim"    ? "#737373" : "#FAFAFA";

export default function Hero() {
  const ref = useGsap<HTMLElement>((_ctx, scope) => {
    const q = gsap.utils.selector(scope);

    const tl = gsap.timeline({
      defaults: { ease: "power4.out" },
      delay: 0.2,
    });

    tl.from(q("[data-hero='badge']"), { opacity: 0, y: 30, duration: 0.7 })
      .from(q("[data-hero='subhead']"),  { opacity: 0, y: 24, duration: 0.7 }, "-=0.45")
      .from(q("[data-hero='footnote']"),  { opacity: 0, duration: 0.5 }, "-=0.05")
      .from(q("[data-hero='visual']"),    { opacity: 0, y: 60, scale: 0.94, duration: 1.0 }, "-=0.6");

    // Idle float
    gsap.to(q("[data-hero='visual']"), {
      y: "+=10",
      duration: 4,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      delay: 2.4,
    });

    // Frame glow pulse
    gsap.to(q("[data-hero-frame-glow]"), {
      opacity: 0.85,
      scale: 1.06,
      duration: 3,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });

    // Scroll parallax
    gsap.to(q("[data-hero='visual']"), {
      yPercent: 14,
      ease: "none",
      scrollTrigger: { trigger: scope, start: "top top", end: "bottom top", scrub: true },
    });
    gsap.to(q("[data-hero-aura]"), {
      yPercent: -22,
      ease: "none",
      scrollTrigger: { trigger: scope, start: "top top", end: "bottom top", scrub: true },
    });

    // Per-character typing — split each line's text into spans
    const lines = q("[data-hero-line]");
    const typeTl = gsap.timeline({ delay: 1.4 });
    lines.forEach((line, i) => {
      const chars = line.querySelectorAll("[data-ch]");
      typeTl.from(
        chars,
        { opacity: 0, duration: 0.012, stagger: 0.012, ease: "none" },
        i === 0 ? 0 : "+=0.18",
      );
    });
  });

  return (
    <section ref={ref} className="relative pt-28 md:pt-32 overflow-hidden">
      {/* Nebula sits BEHIND content — non-interactive */}
      <Nebula3D className="opacity-75" />
      <div data-hero-aura className="absolute inset-0 mesh-aura pointer-events-none" aria-hidden />
      <div className="absolute inset-0 grid-backdrop pointer-events-none" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-5 pb-24 md:pb-28">
        <div className="flex flex-col items-center text-center">
          <div
            data-hero="badge"
            className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-neutral-300"
          >
            <span className="dot bg-emerald-500 live-dot" />
            <Smartphone className="size-3.5 text-emerald-400" strokeWidth={2.2} />
            <span className="font-mono">v1 · now on iOS &amp; Android</span>
          </div>

          <h1 className="mt-6 text-5xl md:text-7xl lg:text-[5.5rem] font-semibold tracking-tight leading-[0.96] gradient-text">
            Ship code from your pocket.
          </h1>

          <p
            data-hero="subhead"
            className="mt-6 max-w-2xl text-[17px] md:text-xl text-neutral-400 leading-relaxed"
          >
            Treena is a real IDE in your pocket. Clone a repo, edit files,
            run a real shell, and hand an agent a 200-round tool loop —
            on-device or in a cloud workspace.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <motion.a
              href="#get-started"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="btn-neon inline-flex h-12 items-center justify-center gap-2 rounded-full border border-transparent px-6 text-sm font-medium leading-none will-change-transform"
            >
              Download Treena
              <ArrowRight className="size-4" strokeWidth={2.5} />
            </motion.a>
            <motion.a
              href="#flow"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.72, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/10 px-6 text-sm font-medium leading-none text-neutral-50 hover:border-emerald-500/40 hover:bg-white/5 transition-colors"
            >
              <Play className="size-4" strokeWidth={2.5} />
              See how it works
            </motion.a>
          </div>

          <p
            data-hero="footnote"
            className="mt-8 text-xs text-neutral-500 font-mono"
          >
            Bring your OpenRouter key · GitHub OAuth · Claude · GPT · Gemini
          </p>
        </div>

        {/* Phone-shaped terminal mockup with CRT scanline + typing */}
        <div className="relative mt-16 md:mt-20 mx-auto max-w-md">
          <div
            data-hero-frame-glow
            className="absolute -inset-12 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.28),transparent_60%)] blur-2xl pointer-events-none"
            aria-hidden
          />
          <div
            data-hero="visual"
            className="relative rounded-[2.4rem] glow-ring bg-neutral-900 border border-white/10 p-2 will-change-transform"
          >
            <div className="relative crt crt-flicker rounded-[2rem] bg-black overflow-hidden">
              {/* Notch */}
              <div className="relative flex items-center justify-center py-3">
                <div className="h-1.5 w-24 rounded-full bg-neutral-800" />
              </div>
              <div className="flex items-center gap-2 px-5 pb-3 text-[10px] text-neutral-500 font-mono">
                <span className="dot bg-emerald-500 live-dot" />
                <span>treena · main</span>
                <span className="ml-auto">14:23</span>
              </div>
              <pre className="text-[12px] leading-[1.7] font-mono px-5 pb-6 m-0 min-h-[340px] relative z-[1]">
                {codeLines.map((l, i) => (
                  <div key={i} data-hero-line style={{ color: colorFor(l.c) }}>
                    {Array.from(l.t).map((ch, j) => (
                      <span data-ch key={j}>{ch}</span>
                    ))}
                  </div>
                ))}
                <div className="text-emerald-500">
                  $ <span className="cursor">▍</span>
                </div>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
