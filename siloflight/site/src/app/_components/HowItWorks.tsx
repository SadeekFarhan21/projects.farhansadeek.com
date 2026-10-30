"use client";

import { useRef } from "react";
import {
  gsap,
  ScrollTrigger,
  useGSAP,
  prefersReducedMotion,
} from "@/lib/gsap";

type Step = {
  num: string;
  title: string;
  body: string;
  detail: { label: string; value: string }[];
};

const STEPS: Step[] = [
  {
    num: "01",
    title: "Type a flight number.",
    body: "Just the airline code and number — AA100, BA286, UA889. That's all the input we need.",
    detail: [
      { label: "Carrier", value: "AA — American Airlines" },
      { label: "Flight", value: "100" },
      { label: "Date", value: "2026-05-04" },
    ],
  },
  {
    num: "02",
    title: "Auto-populate the rest.",
    body: "We hit FlightAware AeroAPI + AeroDataBox in parallel and merge the response. Departure, arrival, gates, aircraft, registration, baggage claim — done.",
    detail: [
      { label: "Departure", value: "JFK · Gate B22" },
      { label: "Arrival", value: "LHR · Gate 12" },
      { label: "Aircraft", value: "B772 · N776AN" },
    ],
  },
  {
    num: "03",
    title: "Watch your map fill in.",
    body: "Every logged flight draws a great-circle arc on your personal globe. Miles, hours, top airports, and year-over-year — all charted automatically.",
    detail: [
      { label: "Flights", value: "8 logged" },
      { label: "Miles", value: "16,876" },
      { label: "Hours airborne", value: "31h 51m" },
    ],
  },
];

/**
 * Pinned horizontal-scroll showcase. The section is pinned to the viewport
 * while the inner track translates left as the user scrolls vertically. Three
 * step cards slide past, each peeking from the right and exiting to the left.
 *
 * Disables on touch / coarse pointers and reduced-motion (falls back to a
 * vertical stack of step cards).
 */
export default function HowItWorks() {
  const root = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      if (prefersReducedMotion()) return;

      const isCoarse =
        typeof window !== "undefined" &&
        window.matchMedia("(hover: none) and (pointer: coarse)").matches;
      if (isCoarse) {
        // On touch devices, just let it scroll vertically — easier to use.
        return;
      }

      const track = el.querySelector("[data-track]") as HTMLElement | null;
      if (!track) return;

      const totalScroll = () =>
        Math.max(0, track.scrollWidth - window.innerWidth + 96);

      const tween = gsap.to(track, {
        x: () => `-${totalScroll()}px`,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          pin: true,
          start: "top top",
          end: () => `+=${totalScroll()}`,
          scrub: 0.6,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });

      // Subtle parallax on each step's number; happens within the same
      // container animation so it tracks horizontal scroll position.
      const numbers = el.querySelectorAll("[data-step-num]");
      numbers.forEach((n, i) => {
        gsap.fromTo(
          n,
          { yPercent: 12 },
          {
            yPercent: -12,
            ease: "none",
            scrollTrigger: {
              containerAnimation: tween,
              trigger: n,
              start: "left right",
              end: "right left",
              scrub: true,
            },
          },
        );
        // Fade in details on enter, out on exit.
        const details = (n.parentElement?.querySelectorAll(
          "[data-step-detail]",
        ) ?? []) as NodeListOf<HTMLElement>;
        gsap.fromTo(
          details,
          { autoAlpha: 0, y: 18 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.6,
            ease: "siloOut",
            stagger: 0.08,
            scrollTrigger: {
              containerAnimation: tween,
              trigger: n.parentElement!,
              start: "left 70%",
              toggleActions: "play none none reverse",
            },
          },
        );
        void i;
      });

      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
        ScrollTrigger.getAll()
          .filter((st) => st.vars?.containerAnimation === tween)
          .forEach((st) => st.kill());
      };
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="relative w-full overflow-hidden"
      style={{ minHeight: "100vh" }}
      aria-label="How SiloFlight works"
    >
      <div className="relative h-screen w-full">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-6 pt-10 lg:px-12 lg:pt-16">
          <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-neutral-500">
            How it works
          </p>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-neutral-50 sm:text-4xl">
            Three steps to a complete flight log.
          </h2>
        </div>

        <div
          data-track
          className="absolute inset-y-0 left-0 flex h-full items-center gap-10 px-12 will-change-transform sm:gap-16"
          style={{ paddingTop: "180px", paddingBottom: "60px" }}
        >
          {STEPS.map((s, i) => (
            <StepCard step={s} key={i} />
          ))}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex items-center justify-between px-6 lg:px-12">
          <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-neutral-600">
            scroll to advance
          </div>
          <div className="flex gap-2 font-mono text-[10px] text-neutral-600">
            01 · 02 · 03
          </div>
        </div>
      </div>
    </section>
  );
}

function StepCard({ step }: { step: Step }) {
  return (
    <div
      className="relative flex h-[60vh] w-[80vw] max-w-[640px] shrink-0 flex-col justify-between rounded-3xl border border-white/[0.06] bg-white/[0.025] p-8 backdrop-blur-sm sm:p-10"
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px rgba(255,255,255,0.02)",
      }}
    >
      <div
        data-step-num
        className="select-none font-mono text-[120px] font-semibold leading-none tracking-tight text-white/[0.06] sm:text-[160px]"
      >
        {step.num}
      </div>
      <div>
        <h3 className="text-2xl font-semibold tracking-tight text-neutral-50 sm:text-3xl">
          {step.title}
        </h3>
        <p className="mt-3 max-w-md text-sm text-neutral-400 sm:text-base">
          {step.body}
        </p>
        <dl className="mt-6 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          {step.detail.map((d) => (
            <div
              key={d.label}
              data-step-detail
              className="flex items-baseline gap-3 rounded-xl border border-white/[0.05] bg-black/30 px-3 py-2"
            >
              <dt className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                {d.label}
              </dt>
              <dd className="ml-auto truncate text-sm text-neutral-200">
                {d.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
