"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";

type Event = {
  flight: string;
  origin: string;
  dest: string;
  status: "Departed" | "In air" | "Landed" | "On approach";
  detail: string;
};

const FLIGHTS: Event[] = [
  { flight: "AA100", origin: "JFK", dest: "LHR", status: "In air", detail: "FL380 · 521 mph" },
  { flight: "DL210", origin: "ATL", dest: "CDG", status: "Departed", detail: "Gate B14" },
  { flight: "UA889", origin: "SFO", dest: "PEK", status: "In air", detail: "FL400 · 478 mph" },
  { flight: "BA286", origin: "LHR", dest: "SFO", status: "On approach", detail: "ILS 28R" },
  { flight: "QF11", origin: "SYD", dest: "LAX", status: "In air", detail: "FL360 · 502 mph" },
  { flight: "EK216", origin: "DXB", dest: "JFK", status: "Landed", detail: "Gate 7 arrived" },
  { flight: "SQ22", origin: "SIN", dest: "EWR", status: "In air", detail: "FL420 · 490 mph" },
  { flight: "LH400", origin: "FRA", dest: "JFK", status: "Departed", detail: "Climbing" },
  { flight: "AF7", origin: "CDG", dest: "JFK", status: "In air", detail: "FL370 · 488 mph" },
  { flight: "NH7", origin: "HND", dest: "ORD", status: "On approach", detail: "Final 10R" },
  { flight: "AC858", origin: "YYZ", dest: "LHR", status: "In air", detail: "FL360 · 510 mph" },
  { flight: "KE85", origin: "ICN", dest: "JFK", status: "In air", detail: "FL380 · 495 mph" },
  { flight: "QR701", origin: "DOH", dest: "JFK", status: "Departed", detail: "Climb to FL340" },
  { flight: "CX846", origin: "HKG", dest: "JFK", status: "Landed", detail: "Gate 4 arrived" },
];

// All status pills sit on the single sky-accent (#9fc7ff) ramp with subtle
// brightness/saturation differences — keeps the live feed editorial rather
// than introducing stray emerald/amber hues.
const STATUS_COLOR: Record<Event["status"], string> = {
  "In air":
    "text-[#d6e6ff] bg-[rgba(159,199,255,0.16)] border-[rgba(159,199,255,0.38)]",
  Departed:
    "text-[#bcd6ff] bg-[rgba(159,199,255,0.10)] border-[rgba(159,199,255,0.24)]",
  Landed:
    "text-zinc-300 bg-white/[0.04] border-white/10",
  "On approach":
    "text-[#e6f0ff] bg-[rgba(159,199,255,0.22)] border-[rgba(159,199,255,0.50)]",
};

/**
 * Compact "live" feed of cycling flight events. The list is rendered as fixed
 * rows; on every tick the rows slide up one slot and a new event appears at
 * the bottom with a brief highlight flash. Pure visual dressing — pauses when
 * off-screen via IntersectionObserver, respects reduced motion.
 */
export default function LiveActivityTicker({
  className,
  rows = 4,
  intervalMs = 2400,
}: {
  className?: string;
  rows?: number;
  intervalMs?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const list = root.querySelector("[data-list]") as HTMLElement | null;
      if (!list) return;
      if (prefersReducedMotion()) return;

      // Initial waterfall: stagger each row in from below as the ticker
      // mounts. Gives the live feed a sense of arriving rather than just
      // appearing fully formed.
      const initialRows = Array.from(list.children) as HTMLElement[];
      gsap.fromTo(
        initialRows,
        { autoAlpha: 0, y: 14 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.55,
          ease: "siloOut",
          stagger: 0.08,
          clearProps: "transform",
        },
      );

      let visible = true;
      const io = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
        },
        { threshold: 0.15 },
      );
      io.observe(root);

      let cursor = Math.floor(Math.random() * FLIGHTS.length);
      let timer: number | null = null;
      let cleanedUp = false;

      const advance = () => {
        if (!visible || !list || cleanedUp) {
          timer = window.setTimeout(advance, intervalMs);
          return;
        }
        const items = list.children;
        // Clone the second item to bottom (simulating a new arrival), drop top.
        const ev = FLIGHTS[cursor % FLIGHTS.length];
        cursor++;
        const newRow = makeRow(ev);
        list.appendChild(newRow);
        // Slide list up by one row's height, then snap back after removing the
        // first child.
        const first = items[0] as HTMLElement;
        const rowH = first.offsetHeight + 8;
        gsap.to(list, {
          y: -rowH,
          duration: 0.55,
          ease: "siloOut",
          onComplete: () => {
            first.remove();
            gsap.set(list, { y: 0 });
          },
        });
        gsap.fromTo(
          newRow,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.5, ease: "power2.out" },
        );
        // Brief highlight flash on the newest row.
        const flash = newRow.querySelector("[data-flash]") as HTMLElement | null;
        if (flash) {
          gsap.fromTo(
            flash,
            { opacity: 0.45 },
            { opacity: 0, duration: 1.2, ease: "power2.out" },
          );
        }
        timer = window.setTimeout(advance, intervalMs);
      };
      timer = window.setTimeout(advance, intervalMs);

      return () => {
        cleanedUp = true;
        if (timer) clearTimeout(timer);
        io.disconnect();
      };
    },
    { scope: ref, dependencies: [intervalMs] },
  );

  // Initial rows.
  const initial = Array.from({ length: rows }, (_, i) => FLIGHTS[i % FLIGHTS.length]);

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 backdrop-blur-sm ${className ?? ""}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] text-neutral-500">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-[rgba(159,199,255,0.55)]" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-[#9fc7ff]" />
          </span>
          Live · Recent activity
        </div>
        <span className="font-mono text-[10px] text-neutral-600">
          via OpenSky
        </span>
      </div>
      <div data-list className="flex flex-col gap-2">
        {initial.map((ev, i) => (
          <Row key={i} ev={ev} />
        ))}
      </div>
    </div>
  );
}

function Row({ ev }: { ev: Event }) {
  const cls = STATUS_COLOR[ev.status];
  return (
    <div className="relative flex items-center justify-between rounded-xl border border-white/[0.05] bg-black/30 px-3 py-2.5 text-sm">
      <span
        data-flash
        className="pointer-events-none absolute inset-0 rounded-xl"
        style={{ background: "rgba(159, 199, 255, 0.12)", opacity: 0 }}
      />
      <div className="relative flex items-center gap-3">
        <span className="font-mono text-xs text-neutral-300">{ev.flight}</span>
        <span className="font-mono text-base font-semibold text-neutral-50">
          {ev.origin}
        </span>
        <ArrowGlyph />
        <span className="font-mono text-base font-semibold text-neutral-50">
          {ev.dest}
        </span>
      </div>
      <div className="relative flex items-center gap-3">
        <span className="hidden text-xs text-neutral-500 sm:inline">
          {ev.detail}
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${cls}`}
        >
          {ev.status}
        </span>
      </div>
    </div>
  );
}

function ArrowGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="rgba(159,199,255,0.55)"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  );
}

function makeRow(ev: Event): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className =
    "relative flex items-center justify-between rounded-xl border border-white/[0.05] bg-black/30 px-3 py-2.5 text-sm";
  const flash = document.createElement("span");
  flash.dataset.flash = "1";
  flash.className = "pointer-events-none absolute inset-0 rounded-xl";
  flash.style.background = "rgba(159, 199, 255, 0.12)";
  flash.style.opacity = "0";
  wrapper.appendChild(flash);

  const left = document.createElement("div");
  left.className = "relative flex items-center gap-3";
  left.innerHTML = `
    <span class="font-mono text-xs text-neutral-300">${escapeHtml(ev.flight)}</span>
    <span class="font-mono text-base font-semibold text-neutral-50">${escapeHtml(ev.origin)}</span>
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="rgba(159,199,255,0.55)" stroke-width="1.6" stroke-linecap="round"><path d="M5 12h14M14 7l5 5-5 5"/></svg>
    <span class="font-mono text-base font-semibold text-neutral-50">${escapeHtml(ev.dest)}</span>
  `;
  wrapper.appendChild(left);

  const right = document.createElement("div");
  right.className = "relative flex items-center gap-3";
  const cls = STATUS_COLOR[ev.status];
  right.innerHTML = `
    <span class="hidden text-xs text-neutral-500 sm:inline">${escapeHtml(ev.detail)}</span>
    <span class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${cls}">${escapeHtml(ev.status)}</span>
  `;
  wrapper.appendChild(right);
  return wrapper;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
