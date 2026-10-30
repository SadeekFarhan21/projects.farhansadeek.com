"use client";

import { Apple, Smartphone, Cpu, Database, TerminalSquare, Server, Cloud, KeyRound } from "lucide-react";
import { useGsap } from "@/lib/useGsap";
import { gsap } from "@/lib/gsap";
import { useMouseGlow } from "@/lib/useMouseGlow";
import KineticHeading from "./KineticHeading";
import type { ReactNode } from "react";

function GlowTile({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { ref, onPointerMove } = useMouseGlow<HTMLDivElement>();
  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      data-spec-tile
      className={`glow-border relative overflow-hidden rounded-2xl glass p-6 glow-soft ${className}`}
    >
      {children}
    </div>
  );
}

const tableRows: { label: string; value: string }[] = [
  { label: "Editor",        value: "lowlight · 20+ languages" },
  { label: "Git",           value: "isomorphic-git · GitHub OAuth (PKCE)" },
  { label: "Terminal",      value: "xterm.js + PTY · WebSocket" },
  { label: "Agent",         value: "OpenRouter · up to 200 tool rounds" },
  { label: "LSP",           value: "TypeScript · diagnostics, go-to-def" },
  { label: "Auth",          value: "expo-secure-store · platform keychain" },
];

export default function Specs() {
  const ref = useGsap<HTMLElement>((_ctx, scope) => {
    const q = gsap.utils.selector(scope);
    gsap.from(q("[data-spec-tile]"), {
      opacity: 0,
      y: 36,
      scale: 0.97,
      duration: 0.85,
      ease: "power3.out",
      stagger: 0.08,
      scrollTrigger: { trigger: scope, start: "top 80%" },
    });
  });

  return (
    <section
      ref={ref}
      id="specs"
      className="relative py-24 md:py-32 border-y border-white/[0.05]"
    >
      <div className="absolute inset-0 mesh-bg pointer-events-none" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-5">
        <div className="max-w-2xl mb-12">
          <p className="text-[11px] tracking-[0.22em] uppercase text-emerald-400 font-mono mb-4">
            Technical specs
          </p>
          <KineticHeading
            as="h2"
            className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.05] text-neutral-50"
          >
            The receipts.
          </KineticHeading>
          <p className="mt-5 text-lg text-neutral-400 leading-relaxed">
            What's actually under the hood — no marketing math.
          </p>
        </div>

        {/* Bento — 4 col on lg, 2 col on md */}
        <div className="grid gap-4 md:grid-cols-4 md:grid-rows-3 md:[grid-auto-rows:140px] lg:[grid-auto-rows:160px]">
          {/* Big platform tile */}
          <GlowTile className="md:col-span-2 md:row-span-2 flex flex-col">
            <div className="flex items-center gap-3 text-emerald-400">
              <Smartphone className="size-5" />
              <span className="text-[11px] tracking-[0.2em] uppercase font-mono">
                Platforms
              </span>
            </div>
            <div className="mt-auto pt-6">
              <div className="flex items-baseline gap-3 font-mono">
                <Apple className="size-7 text-neutral-300" />
                <span className="text-3xl md:text-4xl text-neutral-50">iOS 16+</span>
              </div>
              <div className="mt-3 flex items-baseline gap-3 font-mono">
                <Smartphone className="size-7 text-neutral-300" />
                <span className="text-3xl md:text-4xl text-neutral-50">Android 10+</span>
              </div>
              <p className="mt-5 text-[14px] text-neutral-400 leading-relaxed max-w-sm">
                Native Expo / React Native. No web wrapper, no React Native bridges in the hot path.
              </p>
            </div>
          </GlowTile>

          {/* Context window */}
          <GlowTile className="md:col-span-2">
            <div className="flex items-center gap-3 text-emerald-400">
              <Database className="size-5" />
              <span className="text-[11px] tracking-[0.2em] uppercase font-mono">
                Context
              </span>
            </div>
            <div className="mt-3 font-mono">
              <span className="text-4xl md:text-5xl text-neutral-50">1,000,000</span>
              <span className="ml-2 text-base text-neutral-500">tokens</span>
            </div>
            <p className="mt-2 text-[13px] text-neutral-400">
              Up to 1M ctx for whole-codebase work via Gemini 3 Flash &amp; GPT-5.4.
            </p>
          </GlowTile>

          {/* Cloud workspaces */}
          <GlowTile className="md:col-span-2">
            <div className="flex items-center gap-3 text-emerald-400">
              <Cloud className="size-5" />
              <span className="text-[11px] tracking-[0.2em] uppercase font-mono">
                Cloud workspaces
              </span>
            </div>
            <p className="mt-3 font-mono text-[14px] text-neutral-50">
              AWS ECS Fargate · on-demand
            </p>
            <p className="mt-2 text-[13px] text-neutral-400">
              One-tap container with a real shell, LSP, and a WebSocket bridge. Idle tasks auto-destroy after 50 min.
            </p>
          </GlowTile>

          {/* Terminal */}
          <GlowTile className="md:col-span-2">
            <div className="flex items-center gap-3 text-emerald-400">
              <TerminalSquare className="size-5" />
              <span className="text-[11px] tracking-[0.2em] uppercase font-mono">
                Terminal
              </span>
            </div>
            <p className="mt-3 font-mono text-[14px] text-neutral-50">
              xterm.js + PTY · multi-tab
            </p>
            <p className="mt-2 text-[13px] text-neutral-400">
              Bundled into the app — no CDN. Resize-aware PTY over WebSocket. Virtual keyboard for Tab, Esc, Ctrl, arrows.
            </p>
          </GlowTile>

          {/* AI routing */}
          <GlowTile className="md:col-span-2">
            <div className="flex items-center gap-3 text-emerald-400">
              <Cpu className="size-5" />
              <span className="text-[11px] tracking-[0.2em] uppercase font-mono">
                AI routing
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-3 font-mono">
              <span className="text-3xl md:text-4xl text-neutral-50">10</span>
              <span className="text-sm text-neutral-500">models · 6 providers</span>
            </div>
            <p className="mt-2 text-[13px] text-neutral-400">
              Anthropic, OpenAI, Google, DeepSeek, Meta, Mistral — all routed via OpenRouter with token-by-token streaming.
            </p>
          </GlowTile>

          {/* Bridge */}
          <GlowTile className="md:col-span-2 md:row-span-1">
            <div className="flex items-center gap-3 text-emerald-400">
              <Server className="size-5" />
              <span className="text-[11px] tracking-[0.2em] uppercase font-mono">
                Workspace bridge
              </span>
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[13px] text-neutral-200">
              <li>Node.js · WebSocket</li>
              <li>PTY + filesystem RPC</li>
              <li>chokidar file watcher</li>
              <li>typescript-language-server</li>
            </ul>
          </GlowTile>

          {/* Storage / privacy */}
          <GlowTile className="md:col-span-2">
            <div className="flex items-center gap-3 text-emerald-400">
              <KeyRound className="size-5" />
              <span className="text-[11px] tracking-[0.2em] uppercase font-mono">
                Auth &amp; secrets
              </span>
            </div>
            <p className="mt-3 font-mono text-[14px] text-neutral-50">
              Platform keychain · on-device
            </p>
            <p className="mt-2 text-[13px] text-neutral-400">
              OpenRouter keys, GitHub PATs, and bridge JWTs live in expo-secure-store. Tokens are redacted from the chat display.
            </p>
          </GlowTile>

          {/* Misc condensed table */}
          <GlowTile className="md:col-span-4">
            <div className="grid gap-2 md:grid-cols-3 font-mono">
              {tableRows.map((r) => (
                <div
                  key={r.label}
                  className="flex items-baseline justify-between gap-3 px-3 py-1.5 rounded-lg hover:bg-white/[0.02]"
                >
                  <span className="text-[11px] tracking-[0.14em] uppercase text-neutral-500">
                    {r.label}
                  </span>
                  <span className="text-[13px] text-neutral-100 text-right">{r.value}</span>
                </div>
              ))}
            </div>
          </GlowTile>
        </div>
      </div>
    </section>
  );
}
