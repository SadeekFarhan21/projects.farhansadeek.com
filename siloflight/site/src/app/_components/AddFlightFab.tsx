"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP, prefersReducedMotion, hasFineHover } from "@/lib/gsap";
import FlightFormModal from "./FlightFormModal";

type Step = "closed" | "search" | "form";

export default function AddFlightFab() {
  const [step, setStep] = useState<Step>("closed");
  const [flightNumber, setFlightNumber] = useState("");
  const [date, setDate] = useState("");
  const fabRef = useRef<HTMLButtonElement | null>(null);

  // Magnetic hover on the FAB — uses quickTo so we never create new tweens
  // on each pointermove. Auto-disabled for reduced-motion / touch.
  useGSAP(
    () => {
      const el = fabRef.current;
      if (!el) return;
      if (prefersReducedMotion() || !hasFineHover()) return;

      const xTo = gsap.quickTo(el, "x", { duration: 0.45, ease: "power3.out" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.45, ease: "power3.out" });

      const onMove = (e: PointerEvent) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        xTo(((e.clientX - cx) / rect.width) * 18);
        yTo(((e.clientY - cy) / rect.height) * 18);
      };
      const onLeave = () => {
        gsap.to(el, {
          x: 0,
          y: 0,
          duration: 0.7,
          ease: "elastic.out(1, 0.5)",
        });
      };

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      return () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: fabRef },
  );

  function openSearch() {
    setFlightNumber("");
    setDate(new Date().toISOString().slice(0, 10));
    setStep("search");
  }

  function search() {
    const fn = flightNumber.replace(/\s+/g, "").toUpperCase();
    if (!fn || !date) return;
    setFlightNumber(fn);
    setStep("form");
  }

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        onClick={openSearch}
        aria-label="Add flight"
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem)] right-4 z-20 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl font-light text-black shadow-lg shadow-black/40 transition-shadow duration-200 hover:shadow-[0_0_24px_rgba(255,255,255,0.35)] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:right-6 lg:bottom-8"
      >
        +
      </button>

      <SearchModal
        open={step === "search"}
        onClose={() => setStep("closed")}
        flightNumber={flightNumber}
        date={date}
        onFlightNumberChange={setFlightNumber}
        onDateChange={setDate}
        onSubmit={search}
      />

      <FlightFormModal
        open={step === "form"}
        onClose={() => setStep("closed")}
        initialFlightNumber={flightNumber}
        initialDate={date}
      />
    </>
  );
}

function SearchModal({
  open,
  onClose,
  flightNumber,
  date,
  onFlightNumberChange,
  onDateChange,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  flightNumber: string;
  date: string;
  onFlightNumberChange: (v: string) => void;
  onDateChange: (v: string) => void;
  onSubmit: () => void;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useGSAP(
    () => {
      if (!open) return;
      const backdrop = backdropRef.current;
      const card = cardRef.current;
      if (!backdrop || !card) return;

      if (prefersReducedMotion()) {
        gsap.set(backdrop, { autoAlpha: 1 });
        gsap.set(card, { autoAlpha: 1, y: 0, scale: 1 });
        return;
      }

      const tl = gsap.timeline({ defaults: { ease: "siloOut" } });
      tl.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 });
      tl.fromTo(
        card,
        { autoAlpha: 0, y: 24, scale: 0.96 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, clearProps: "transform" },
        "-=0.18",
      );
    },
    { scope: backdropRef, dependencies: [open] },
  );

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-flight-search-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-md sm:items-center"
      style={{ opacity: 0 }}
    >
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d12]/95 p-5 shadow-2xl shadow-black/60 backdrop-blur-xl"
        style={{ opacity: 0 }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
        />
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="add-flight-search-title"
            className="text-base font-semibold text-neutral-50"
          >
            Add a flight
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-white/5 hover:text-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <XIcon />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="flex flex-col gap-3"
        >
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-400">
            <span>Flight number</span>
            <input
              required
              autoFocus
              value={flightNumber}
              onChange={(e) => onFlightNumberChange(e.target.value.toUpperCase())}
              placeholder="AS21"
              autoComplete="off"
              spellCheck={false}
              inputMode="text"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-base uppercase text-neutral-50 placeholder:text-neutral-600 focus:border-[var(--accent)]/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-400">
            <span>Date</span>
            <input
              required
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-neutral-50 focus:border-[var(--accent)]/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
            />
          </label>
          <button
            type="submit"
            disabled={!flightNumber || !date}
            className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:bg-white/30 disabled:text-neutral-500"
          >
            <SearchIcon />
            Search
          </button>
        </form>
      </div>
    </div>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4-4" />
    </svg>
  );
}
