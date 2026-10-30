"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { useGsap } from "@/lib/useGsap";
import { gsap } from "@/lib/gsap";
import { useMouseGlow } from "@/lib/useMouseGlow";
import KineticHeading from "./KineticHeading";

type Model = { name: string; context: string; use: string };
type Provider = {
  id: string;
  name: string;
  color: string;
  blurb: string;
  models: Model[];
};

const providers: Provider[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    color: "#D97706",
    blurb: "Best in class for agentic coding and long-running edits.",
    models: [
      { name: "Claude Sonnet 4.6", context: "200K", use: "Agent · default" },
      { name: "Claude Opus 4.6",   context: "200K", use: "Hard refactors" },
      { name: "Claude Sonnet 4.5", context: "200K", use: "Cheap & fast" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    color: "#10A37F",
    blurb: "Strong general reasoning and tool calling. Good multilingual support.",
    models: [
      { name: "GPT-5.4", context: "1M",   use: "Frontier reasoning" },
      { name: "GPT-4o",  context: "128K", use: "Cheap multimodal" },
    ],
  },
  {
    id: "google",
    name: "Google",
    color: "#4285F4",
    blurb: "Million-token context for whole-codebase work.",
    models: [
      { name: "Gemini 3 Flash",        context: "1M", use: "Whole-repo" },
      { name: "Gemini 2.5 Flash Lite", context: "1M", use: "Cheap whole-repo" },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    color: "#4D6BFE",
    blurb: "Open-weights reasoning model. Strong on math and code.",
    models: [{ name: "DeepSeek R1", context: "128K", use: "Reasoning" }],
  },
  {
    id: "meta",
    name: "Meta",
    color: "#0668E1",
    blurb: "Self-hostable foundation models, friendly licenses.",
    models: [{ name: "Llama 3.3 70B", context: "128K", use: "Open weights" }],
  },
  {
    id: "mistral",
    name: "Mistral",
    color: "#F97316",
    blurb: "Fast European-hosted models with strong code completion.",
    models: [{ name: "Mistral Large", context: "128K", use: "EU residency" }],
  },
];

export default function Models() {
  const [active, setActive] = useState(providers[0].id);
  const current = providers.find((p) => p.id === active) ?? providers[0];

  const { ref: glowRef, onPointerMove } = useMouseGlow<HTMLDivElement>();

  const ref = useGsap<HTMLElement>((_ctx, scope) => {
    const q = gsap.utils.selector(scope);
    gsap.from(q("[data-models-card]"), {
      opacity: 0,
      y: 30,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: { trigger: q("[data-models-card]")[0], start: "top 82%" },
    });
  });

  return (
    <section ref={ref} id="models" className="relative py-24 md:py-32">
      <div className="absolute inset-0 mesh-bg pointer-events-none" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-5">
        <div className="max-w-2xl mb-12">
          <p className="text-[11px] tracking-[0.22em] uppercase text-emerald-400 font-mono mb-4">
            Model picker
          </p>
          <KineticHeading
            as="h2"
            className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.05] text-neutral-50"
          >
            Every frontier model. One tap away.
          </KineticHeading>
          <p className="mt-5 text-lg text-neutral-400 leading-relaxed">
            10 models across 6 providers, routed through OpenRouter with
            token-by-token streaming. Up to{" "}
            <span className="text-neutral-50">1M tokens</span> of context for
            whole-codebase work.
          </p>
        </div>

        <div
          ref={glowRef}
          onPointerMove={onPointerMove}
          data-models-card
          className="glass-strong glow-border rounded-2xl p-2 md:p-3 glow-soft"
        >
          {/* Tab strip */}
          <div className="relative overflow-x-auto" data-lenis-prevent>
            <div className="flex gap-1 p-1 min-w-max">
              {providers.map((p) => {
                const isActive = p.id === active;
                return (
                  <button
                    key={p.id}
                    onClick={() => setActive(p.id)}
                    className="relative px-4 py-2 text-sm font-medium tracking-tight transition-colors"
                  >
                    {isActive && (
                      <motion.span
                        layoutId="model-tab-indicator"
                        className="absolute inset-0 rounded-lg bg-emerald-500/14 ring-1 ring-emerald-500/35"
                        transition={{ type: "spring", stiffness: 380, damping: 28 }}
                      />
                    )}
                    <span
                      className={`relative z-10 inline-flex items-center gap-2 ${
                        isActive ? "text-neutral-50" : "text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      <span className="dot" style={{ background: p.color }} />
                      {p.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Panel */}
          <div className="relative mt-2 rounded-xl glass overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
                className="grid md:grid-cols-[1fr_2fr] gap-0"
              >
                <div className="p-6 border-b md:border-b-0 md:border-r border-white/[0.05]">
                  <div className="flex items-center gap-2.5">
                    <span className="dot" style={{ background: current.color }} />
                    <span className="text-[11px] tracking-[0.18em] uppercase font-mono text-neutral-400">
                      {current.name}
                    </span>
                  </div>
                  <p className="mt-3 text-[15px] text-neutral-300 leading-relaxed">
                    {current.blurb}
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 text-[12px] text-neutral-500 font-mono">
                    <Sparkles className="size-3.5 text-emerald-500" />
                    {current.models.length} model{current.models.length === 1 ? "" : "s"} available
                  </div>
                </div>

                <ul className="divide-y divide-white/[0.05]">
                  {current.models.map((m) => (
                    <li
                      key={m.name}
                      className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-white/[0.025] transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-[14px] text-neutral-50 truncate">
                          {m.name}
                        </div>
                        <div className="mt-0.5 text-[12px] text-neutral-500">{m.use}</div>
                      </div>
                      <span className="shrink-0 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-mono text-emerald-300 ring-1 ring-emerald-500/20">
                        {m.context} ctx
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
