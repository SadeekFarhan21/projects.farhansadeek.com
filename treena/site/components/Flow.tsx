"use client";

import { KeyRound, GitBranchPlus, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useGsap } from "@/lib/useGsap";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useEffect } from "react";
import KineticHeading from "./KineticHeading";

type StepBlock = { line: string; tone: "prompt" | "ok" | "dim" | "neutral" };

type Step = {
  kbd: string;
  title: string;
  body: string;
  icon: LucideIcon;
  screen: StepBlock[];          // what shows on the pinned phone
  command: StepBlock[];         // command panel that animates around the phone
};

const steps: Step[] = [
  {
    kbd: "01",
    title: "Sign in, bring your key",
    body:
      "GitHub OAuth via PKCE on first launch. Drop in an OpenRouter key for the agent. Both stay in the platform keychain — Treena never sees them.",
    icon: KeyRound,
    screen: [
      { line: "treena · onboarding",                 tone: "dim" },
      { line: "",                                     tone: "neutral" },
      { line: "→ github.com (oauth · pkce)",          tone: "dim" },
      { line: "✓ signed in as you@github",            tone: "ok" },
      { line: "",                                     tone: "neutral" },
      { line: "OPENROUTER_API_KEY",                   tone: "neutral" },
      { line: "or-•••••••••••••••••••••••••••",       tone: "prompt" },
      { line: "✓ stored in keychain",                 tone: "ok" },
    ],
    command: [
      { line: "$ treena login",                       tone: "prompt" },
      { line: "→ opening github (pkce)",              tone: "dim" },
      { line: "→ paste your openrouter key",          tone: "dim" },
      { line: "✓ secured",                            tone: "ok" },
    ],
  },
  {
    kbd: "02",
    title: "On-device or in the cloud",
    body:
      "Pick a repo and Treena clones it on-device with isomorphic-git, or provisions a Fargate workspace with a real shell. One tap, either way.",
    icon: GitBranchPlus,
    screen: [
      { line: "treena · workspace",                   tone: "dim" },
      { line: "",                                     tone: "neutral" },
      { line: "→ provisioning fargate task",          tone: "dim" },
      { line: "✓ bridge ready · 14s",                 tone: "ok" },
      { line: "$ git clone you/api",                  tone: "prompt" },
      { line: "✓ 4,128 files in 2.1s",                tone: "ok" },
      { line: "",                                     tone: "neutral" },
      { line: "  app/  components/  lib/",            tone: "neutral" },
    ],
    command: [
      { line: "$ treena workspace --cloud",           tone: "prompt" },
      { line: "→ ecs task launching",                 tone: "dim" },
      { line: "→ resolving 4,128 objects",            tone: "dim" },
      { line: "✓ ready in 14s",                       tone: "ok" },
    ],
  },
  {
    kbd: "03",
    title: "Prompt, stream, commit",
    body:
      "Tell the agent what you want. Watch it read files and edit them live. Review the diff, stage, commit, push — without leaving the app.",
    icon: Send,
    screen: [
      { line: "treena · agent",                       tone: "dim" },
      { line: "",                                     tone: "neutral" },
      { line: "you · fix expired tokens",             tone: "prompt" },
      { line: "→ reading auth/token.ts",              tone: "dim" },
      { line: "→ patching refresh()",                 tone: "dim" },
      { line: "✓ 12 tests passed",                    tone: "ok" },
      { line: "",                                     tone: "neutral" },
      { line: "$ git push origin main",               tone: "prompt" },
      { line: "✓ shipped",                            tone: "ok" },
    ],
    command: [
      { line: "$ treena agent 'fix tokens'",          tone: "prompt" },
      { line: "→ patching refresh handler",           tone: "dim" },
      { line: "$ git push origin main",               tone: "prompt" },
      { line: "✓ shipped",                            tone: "ok" },
    ],
  },
];

const tone = (t: StepBlock["tone"]) =>
  t === "prompt" ? "#10B981" :
  t === "ok"     ? "#86EFAC" :
  t === "dim"    ? "#737373" : "#FAFAFA";

export default function Flow() {
  const ref = useGsap<HTMLElement>((_ctx, scope) => {
    const q = gsap.utils.selector(scope);

    // Header on entry
    gsap.from(q("[data-flow-header] > *"), {
      opacity: 0,
      y: 22,
      duration: 0.8,
      stagger: 0.08,
      scrollTrigger: { trigger: scope, start: "top 78%" },
    });

    const stage = q("[data-flow-stage]")[0] as HTMLElement | undefined;
    if (!stage) return;

    const stepEls    = q("[data-flow-step]");
    const screenEls  = q("[data-flow-screen]");
    const cmdEls     = q("[data-flow-cmd]");
    const iconEls    = q("[data-flow-icon]");
    const progress   = q("[data-flow-progress]")[0] as HTMLElement | undefined;
    const counter    = q("[data-flow-counter]")[0] as HTMLElement | undefined;

    // Initial states
    stepEls.forEach((el, i) => {
      gsap.set(el, { autoAlpha: i === 0 ? 1 : 0, y: i === 0 ? 0 : 30 });
    });
    screenEls.forEach((el, i) => {
      gsap.set(el, { autoAlpha: i === 0 ? 1 : 0 });
    });
    cmdEls.forEach((el, i) => {
      gsap.set(el, { autoAlpha: i === 0 ? 1 : 0, x: i === 0 ? 0 : 30 });
    });
    iconEls.forEach((el, i) => {
      gsap.set(el, { scale: i === 0 ? 1 : 0.4, autoAlpha: i === 0 ? 1 : 0 });
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: scope,
        start: "top top",
        end: "+=300%",
        pin: stage,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    if (progress) {
      gsap.fromTo(
        progress,
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            trigger: scope,
            start: "top top",
            end: "+=300%",
            scrub: 0.6,
          },
        },
      );
    }

    // Step transitions: 0 → 1 → 2
    for (let i = 0; i < steps.length - 1; i++) {
      const next = i + 1;
      tl
        // Hold current step a beat
        .to({}, { duration: 0.4 })
        // Animate icon out
        .to(iconEls[i], { scale: 0.4, autoAlpha: 0, duration: 0.25 }, "<")
        // Fade out current text + cmd
        .to(stepEls[i], { autoAlpha: 0, y: -30, duration: 0.35 }, "<")
        .to(cmdEls[i],  { autoAlpha: 0, x: -30, duration: 0.35 }, "<")
        .to(screenEls[i], { autoAlpha: 0, duration: 0.3 }, "<")
        // Bring the next in
        .fromTo(
          screenEls[next],
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.45 },
          ">-0.1",
        )
        .fromTo(
          stepEls[next],
          { autoAlpha: 0, y: 30 },
          { autoAlpha: 1, y: 0, duration: 0.5 },
          "<",
        )
        .fromTo(
          cmdEls[next],
          { autoAlpha: 0, x: 30 },
          { autoAlpha: 1, x: 0, duration: 0.5 },
          "<",
        )
        // Rubber-band icon in
        .fromTo(
          iconEls[next],
          { scale: 0.3, autoAlpha: 0, rotate: -12 },
          { scale: 1, autoAlpha: 1, rotate: 0, duration: 0.6, ease: "elastic.out(1.05, 0.4)" },
          "<0.05",
        )
        // Update counter text via onUpdate is overkill — just update via scrolltrigger callback
        .call(() => {
          if (counter) counter.textContent = String(next + 1).padStart(2, "0");
        });
    }
  });

  useEffect(() => {
    const t = setTimeout(() => ScrollTrigger.refresh(), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      ref={ref}
      id="flow"
      className="relative bg-neutral-950"
    >
      {/* Pinned stage — header + steps live together */}
      <div
        data-flow-stage
        className="relative h-screen w-full overflow-hidden"
      >
        <div className="absolute inset-0 mesh-bg pointer-events-none" />

        {/* Header at the top of the stage */}
        <div
          data-flow-header
          className="absolute top-0 left-0 right-0 mx-auto max-w-2xl text-center px-5 pt-16 md:pt-20 z-30"
        >
          <p className="text-[11px] tracking-[0.22em] uppercase text-emerald-400 font-mono mb-3">
            How it works
          </p>
          <KineticHeading
            as="h2"
            className="text-2xl md:text-4xl font-semibold tracking-tight leading-[1.05] text-neutral-50"
          >
            Three taps from idea to push.
          </KineticHeading>
          <p className="mt-3 text-sm md:text-base text-neutral-400 leading-relaxed">
            Onboard once, then ship from anywhere. Scroll to walk the path.
          </p>
        </div>

        {/* Progress strip directly under the header */}
        <div className="absolute top-[210px] md:top-[230px] left-6 right-6 md:left-16 md:right-16 z-30">
          <div className="flex items-center justify-between text-[10px] tracking-[0.22em] uppercase text-neutral-500 font-mono mb-2">
            <span>01 → <span data-flow-counter>01</span> · 03</span>
            <span>scroll</span>
          </div>
          <div className="h-[2px] bg-white/[0.07] rounded-full overflow-hidden">
            <div
              data-flow-progress
              className="h-full origin-left bg-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.6)]"
              style={{ transform: "scaleX(0)" }}
            />
          </div>
        </div>

        {/* Three-column layout: text | phone | command */}
        <div className="absolute inset-0 flex items-center px-5 md:px-12 pt-[280px] md:pt-[300px] pb-10">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_minmax(280px,360px)_1fr] gap-6 md:gap-10 items-center w-full max-w-6xl mx-auto">
          {/* LEFT — step text (stacked via grid-area, no absolute) */}
          <div className="hidden md:grid md:pr-2 [grid-template-areas:'stack']">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.kbd}
                  data-flow-step
                  className="[grid-area:stack] flex flex-col justify-center"
                >
                  <div className="flex items-center gap-3">
                    <span
                      data-flow-icon
                      className="inline-flex items-center justify-center w-12 h-12 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    >
                      <Icon className="size-5" strokeWidth={2} />
                    </span>
                    <div className="font-mono text-[13px] tracking-[0.2em] uppercase text-emerald-400">
                      Step {s.kbd}
                    </div>
                  </div>
                  <h3 className="mt-5 text-2xl md:text-3xl font-semibold tracking-tight text-neutral-50">
                    {s.title}
                  </h3>
                  <p className="mt-3 text-[15px] text-neutral-400 leading-relaxed max-w-md">
                    {s.body}
                  </p>
                </div>
              );
            })}
          </div>

          {/* CENTRE — pinned phone with swapping screen content */}
          <div className="relative mx-auto w-full max-w-[300px] md:max-w-none">
            <div className="absolute -inset-12 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.22),transparent_60%)] blur-2xl pointer-events-none" />
            <div className="relative rounded-[2.4rem] glow-ring bg-neutral-900 border border-white/10 p-2">
              <div className="relative crt crt-flicker rounded-[2rem] bg-black overflow-hidden min-h-[420px]">
                <div className="relative flex items-center justify-center py-3">
                  <div className="h-1.5 w-24 rounded-full bg-neutral-800" />
                </div>
                <div className="flex items-center gap-2 px-5 pb-3 text-[10px] text-neutral-500 font-mono">
                  <span className="dot bg-emerald-500 live-dot" />
                  <span>treena</span>
                  <span className="ml-auto">14:23</span>
                </div>
                <div className="grid [grid-template-areas:'stack']">
                  {steps.map((s) => (
                    <pre
                      key={s.kbd}
                      data-flow-screen
                      className="[grid-area:stack] text-[12px] leading-[1.7] font-mono px-5 pb-6 m-0 z-[1]"
                    >
                      {s.screen.map((b, j) => (
                        <div key={j} style={{ color: tone(b.tone) }}>
                          {b.line || " "}
                        </div>
                      ))}
                      <div className="text-emerald-500">
                        $ <span className="cursor">▍</span>
                      </div>
                    </pre>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — command panel */}
          <div className="hidden md:grid md:pl-2 [grid-template-areas:'stack'] items-center">
            {steps.map((s) => (
              <div
                key={s.kbd}
                data-flow-cmd
                className="[grid-area:stack] flex items-center"
              >
                <div className="rounded-2xl glass p-5 w-full max-w-md">
                  <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-500 mb-3">
                    <span className="dot bg-emerald-500 live-dot" />
                    treena · cli
                  </div>
                  <pre className="font-mono text-[13px] leading-[1.7] m-0">
                    {s.command.map((c, j) => (
                      <div key={j} style={{ color: tone(c.tone) }}>
                        {c.line}
                      </div>
                    ))}
                  </pre>
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>

        {/* MOBILE — stacked content under the phone */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 px-5 pb-6">
          <div className="relative">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.kbd}
                  data-flow-step
                  className="absolute inset-x-0 bottom-0"
                >
                  <div className="flex items-center gap-2">
                    <span
                      data-flow-icon
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    >
                      <Icon className="size-4" strokeWidth={2} />
                    </span>
                    <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-emerald-400">
                      Step {s.kbd}
                    </span>
                  </div>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight text-neutral-50">
                    {s.title}
                  </h3>
                  <p className="mt-1 text-[13px] text-neutral-400 leading-snug">
                    {s.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
