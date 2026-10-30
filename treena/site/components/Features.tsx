"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from "framer-motion";
import {
  Sparkles,
  GitBranch,
  Code2,
  TerminalSquare,
  type LucideIcon,
} from "lucide-react";
import { useGsap } from "@/lib/useGsap";
import { gsap } from "@/lib/gsap";
import { useMouseGlow } from "@/lib/useMouseGlow";
import KineticHeading from "./KineticHeading";
import type { ReactNode } from "react";

type Feature = {
  id: string;
  title: string;
  body: string;
  icon: LucideIcon;
  span: string;
  visual: ReactNode;
};

const ChatVisual = () => (
  <div className="rounded-xl border border-white/5 bg-black/40 font-mono text-[12px] divide-y divide-white/5 overflow-hidden">
    <div className="flex items-center gap-2 px-3 py-2 text-neutral-500">
      <span className="dot bg-emerald-500 live-dot" />
      <span>Claude Sonnet 4.6</span>
      <span className="ml-auto">streaming</span>
    </div>
    <div className="px-3 py-3 text-neutral-300">
      <span className="text-emerald-400">you</span> · fix the expired token bug
    </div>
    <div className="px-3 py-3 text-neutral-400 leading-relaxed">
      <span className="text-amber-300">agent</span> · reading{" "}
      <span className="text-neutral-200">auth/token.ts</span>
      <br />
      patching <span className="text-neutral-200">refresh()</span>…{" "}
      <span className="text-emerald-400">done</span>
    </div>
  </div>
);

const GitVisual = () => (
  <div className="rounded-xl border border-white/5 bg-black/40 font-mono text-[12px] overflow-hidden">
    <div className="px-3 py-2 text-neutral-500 border-b border-white/5">
      explorer · main
    </div>
    <ul className="p-2 space-y-0.5">
      {[
        ["app/", "folder"],
        ["  index.tsx", "M"],
        ["  layout.tsx", null],
        ["components/", "folder"],
        ["  Editor.tsx", "U"],
        ["  Agent.tsx", "M"],
        ["package.json", null],
      ].map(([name, status], i) => (
        <li key={i} className="flex items-center justify-between px-2 py-0.5">
          <span
            style={{
              color:
                status === "folder"
                  ? "var(--color-folder)"
                  : status === "M"
                  ? "var(--color-modified)"
                  : status === "U"
                  ? "var(--color-untracked)"
                  : "#D4D4D4",
            }}
          >
            {name}
          </span>
          {status && status !== "folder" && (
            <span
              className="text-[10px]"
              style={{
                color:
                  status === "M"
                    ? "var(--color-modified)"
                    : "var(--color-untracked)",
              }}
            >
              {status}
            </span>
          )}
        </li>
      ))}
    </ul>
  </div>
);

const EditorVisual = () => (
  <div className="relative rounded-xl border border-white/5 bg-black/40 font-mono text-[12px] overflow-hidden">
    {/* Live IDE pulse */}
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          "radial-gradient(420px 200px at 50% 100%, rgba(16,185,129,0.22), transparent 60%)",
        animation: "tokenGlow 3.6s ease-in-out infinite",
      }}
    />
    <div className="relative flex items-center gap-1.5 px-3 py-2 border-b border-white/5">
      <span className="w-2 h-2 rounded-full bg-[#FF5F56]" />
      <span className="w-2 h-2 rounded-full bg-[#FFBD2E]" />
      <span className="w-2 h-2 rounded-full bg-[#27C93F]" />
      <span className="ml-3 text-neutral-500 text-[11px]">index.tsx</span>
    </div>
    <pre className="relative p-3 m-0 leading-[1.7]">
      <div><span className="text-[#737373]">1</span>  <span className="text-[#C586C0] token-glow">import</span> <span className="text-[#9CDCFE]">{`{ Agent }`}</span> <span className="text-[#C586C0] token-glow">from</span> <span className="text-[#CE9178]">"treena"</span></div>
      <div><span className="text-[#737373]">2</span></div>
      <div><span className="text-[#737373]">3</span>  <span className="text-[#C586C0] token-glow">const</span> <span className="text-[#9CDCFE]">a</span> = <span className="text-[#C586C0] token-glow">new</span> <span className="text-[#DCDCAA]">Agent</span>()</div>
      <div><span className="text-[#737373]">4</span>  <span className="text-[#9CDCFE]">a</span>.<span className="text-[#DCDCAA] token-glow">stream</span>(<span className="text-[#CE9178]">"ship"</span>)</div>
    </pre>
  </div>
);

const TerminalVisual = () => (
  <div className="rounded-xl border border-white/5 bg-black/60 font-mono text-[12px] overflow-hidden">
    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 text-neutral-500">
      <span className="dot bg-emerald-500 live-dot" />
      you@prod · ~/api
    </div>
    <pre className="p-3 m-0 leading-[1.7]">
      <div className="text-emerald-500">$ pnpm test</div>
      <div className="text-neutral-400">  ✓ 128 tests passed</div>
      <div className="text-emerald-500">$ pnpm deploy</div>
      <div className="text-neutral-400">  → live in 14s</div>
      <div className="text-emerald-500">$ <span className="cursor">▍</span></div>
    </pre>
  </div>
);

const features: Feature[] = [
  {
    id: "agent",
    title: "An agent with real tools, not just chat",
    body: "Up to 200 rounds of tool calls per turn — read, patch, grep, run shell commands, spin up dev servers, browse URLs. Streams tokens, applies diffs, and you accept or reject inline.",
    icon: Sparkles,
    span: "md:col-span-2",
    visual: <ChatVisual />,
  },
  {
    id: "git",
    title: "Real git, not a mock",
    body: "Clone, commit, pull, push with isomorphic-git on-device. M/U/A/D badges, branch awareness, GitHub OAuth via PKCE.",
    icon: GitBranch,
    span: "md:col-span-1",
    visual: <GitVisual />,
  },
  {
    id: "editor",
    title: "VS Code-grade editor",
    body: "Syntax for 20+ languages via lowlight. JetBrains Mono, multi-tab, LSP diagnostics, go-to-definition. Tuned for thumbs.",
    icon: Code2,
    span: "md:col-span-1",
    visual: <EditorVisual />,
  },
  {
    id: "terminal",
    title: "A real PTY in a WebView",
    body: "xterm.js bundled into the app — no CDN, no emulator. PTY with resize, base64 I/O over postMessage, multi-tab. A virtual keyboard puts Tab, Esc, Ctrl and arrows under your thumb.",
    icon: TerminalSquare,
    span: "md:col-span-2",
    visual: <TerminalVisual />,
  },
];

function BentoCard({ feature }: { feature: Feature }) {
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const rotateX = useSpring(useMotionValue(0), { stiffness: 220, damping: 22 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 220, damping: 22 });

  const bg = useMotionTemplate`radial-gradient(420px circle at ${mx}% ${my}%, rgba(16,185,129,0.20), transparent 60%)`;

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    mx.set(px * 100);
    my.set(py * 100);
    rotateY.set((px - 0.5) * 6);
    rotateX.set(-(py - 0.5) * 6);
    // Drive the .glow-border ::before
    e.currentTarget.style.setProperty("--x", `${px * 100}%`);
    e.currentTarget.style.setProperty("--y", `${py * 100}%`);
  };

  const onMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  const Icon = feature.icon;

  return (
    <motion.div
      data-feature-card
      data-feature-id={feature.id}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={`group glow-border relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-neutral-900/60 to-neutral-950/60 p-6 will-change-transform [transform-style:preserve-3d] ${feature.span}`}
    >
      <motion.div
        aria-hidden
        style={{ background: bg }}
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
      />

      <div className="relative flex items-start gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
          <Icon className="size-5" strokeWidth={2} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold tracking-tight text-neutral-50">
            {feature.title}
          </h3>
          <p className="mt-1.5 text-[14.5px] text-neutral-400 leading-relaxed">
            {feature.body}
          </p>
        </div>
      </div>

      <div className="relative mt-6">{feature.visual}</div>
    </motion.div>
  );
}

export default function Features() {
  const ref = useGsap<HTMLElement>((_ctx, scope) => {
    const q = gsap.utils.selector(scope);

    gsap.from(q("[data-features-kicker]"), {
      opacity: 0,
      y: 16,
      duration: 0.8,
      scrollTrigger: { trigger: scope, start: "top 80%" },
    });
    gsap.from(q("[data-features-title]"), {
      opacity: 0,
      y: 22,
      duration: 1.0,
      scrollTrigger: { trigger: scope, start: "top 80%" },
      delay: 0.1,
    });
    gsap.from(q("[data-features-subhead]"), {
      opacity: 0,
      y: 18,
      duration: 0.9,
      scrollTrigger: { trigger: scope, start: "top 80%" },
      delay: 0.2,
    });

    gsap.from(q("[data-feature-card]"), {
      opacity: 0,
      y: 50,
      scale: 0.96,
      duration: 0.85,
      stagger: 0.1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: q("[data-features-grid]")[0],
        start: "top 82%",
      },
    });
  });

  return (
    <section ref={ref} id="features" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-2xl">
          <p
            data-features-kicker
            className="text-[11px] tracking-[0.22em] uppercase text-emerald-400 font-mono mb-4"
          >
            What's inside
          </p>
          <KineticHeading
            as="h2"
            data-features-title
            className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.05] text-neutral-50"
          >
            The IDE, rebuilt for your thumb.
          </KineticHeading>
          <p
            data-features-subhead
            className="mt-5 text-lg text-neutral-400 leading-relaxed"
          >
            Every piece of a modern editor — agent, git, terminal, file tree, syntax —
            re-imagined for a five-inch canvas and a flaky train connection.
          </p>
        </div>

        <div
          data-features-grid
          className="mt-14 grid gap-5 md:grid-cols-3"
        >
          {features.map((f) => (
            <BentoCard key={f.id} feature={f} />
          ))}
        </div>
      </div>
    </section>
  );
}
