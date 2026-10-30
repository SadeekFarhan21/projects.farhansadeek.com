"use client";

import { animate } from "motion";
import {
  Boxes,
  GitBranch,
  Sparkles,
  Cpu,
  Smartphone,
  Cloud,
  Github,
  TerminalSquare,
} from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

const logos = [
  { name: "OpenRouter",     icon: <Boxes className="size-4" /> },
  { name: "Expo",           icon: <Smartphone className="size-4" /> },
  { name: "isomorphic-git", icon: <GitBranch className="size-4" /> },
  { name: "GitHub OAuth",   icon: <Github className="size-4" /> },
  { name: "AWS Fargate",    icon: <Cloud className="size-4" /> },
  { name: "xterm.js",       icon: <TerminalSquare className="size-4" /> },
  { name: "Claude",         icon: <Sparkles className="size-4" /> },
  { name: "OpenAI",         icon: <Cpu className="size-4" /> },
];

function Set({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-12 pr-12">{children}</div>
  );
}

export default function SocialBand() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Motion One — Web Animations API, GPU-accelerated
    const controls = animate(
      el,
      { x: ["0%", "-50%"] },
      { duration: 32, ease: "linear", repeat: Infinity },
    );
    return () => controls.stop();
  }, []);

  const set = (
    <Set>
      <span className="text-[11px] tracking-[0.22em] uppercase text-neutral-500 font-mono">
        Powered by
      </span>
      {logos.map((l) => (
        <span
          key={l.name}
          className="inline-flex items-center gap-2 text-neutral-300 hover:text-emerald-400 transition-colors"
        >
          <span className="text-emerald-500">{l.icon}</span>
          <span className="font-mono text-[14px] tracking-tight">{l.name}</span>
        </span>
      ))}
    </Set>
  );

  return (
    <section
      aria-label="Powered by"
      className="relative border-y border-white/[0.05] py-7 bg-neutral-950"
    >
      <div className="relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-neutral-950 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-neutral-950 to-transparent z-10 pointer-events-none" />
        <div ref={trackRef} className="flex w-max will-change-transform">
          {set}
          {set}
          {set}
          {set}
        </div>
      </div>
    </section>
  );
}
