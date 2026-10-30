"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import type { LookupResult } from "@/lib/flight";

type FormState = {
  date: string;
  from: string;
  to: string;
  flightNumber: string;
  departureTime: string;
  distance: string;
  airline: string;
  aircraft: string;
  duration: string;
  registration: string;
  seat: string;
  reason: string;
  cabinClass: string;
};

const EMPTY: FormState = {
  date: "",
  from: "",
  to: "",
  flightNumber: "",
  departureTime: "",
  distance: "",
  airline: "",
  aircraft: "",
  duration: "",
  registration: "",
  seat: "",
  reason: "",
  cabinClass: "",
};

const FLIGHT_RE = /^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function FlightFormModal({
  open,
  onClose,
  initialFlightNumber = "",
  initialDate,
}: {
  open: boolean;
  onClose: () => void;
  initialFlightNumber?: string;
  initialDate?: string;
}) {
  const router = useRouter();
  const backdropRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const today = () => new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState<FormState>(() => ({
    ...EMPTY,
    flightNumber: initialFlightNumber.toUpperCase(),
    date: initialDate ?? today(),
  }));
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
    if (key === "flightNumber" || key === "date") {
      setLookupError(null);
      setSaveError(null);
    }
  }

  function clear<K extends keyof FormState>(key: K) {
    setForm((s) => ({ ...s, [key]: "" as FormState[K] }));
  }

  // Reset form on the rising edge of `open` only — re-running on every prop
  // change while open clobbers in-progress edits and trips the
  // react-hooks/set-state-in-effect rule.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setForm({
        ...EMPTY,
        flightNumber: initialFlightNumber.toUpperCase(),
        date: initialDate ?? today(),
      });
      setLookupError(null);
      setSaveError(null);
    }
    wasOpen.current = open;
  }, [open, initialFlightNumber, initialDate]);

  // Lock body scroll + Escape to close while open.
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

  // Open animation — backdrop fade, card scale/lift, glass blur in.
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
      tl.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 });
      tl.fromTo(
        card,
        { autoAlpha: 0, y: 30, scale: 0.96 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, clearProps: "transform" },
        "-=0.2",
      );
    },
    { scope: backdropRef, dependencies: [open] },
  );

  // Auto-lookup when flight number + date are valid.
  useEffect(() => {
    if (!open) return;
    const fn = form.flightNumber.trim().toUpperCase();
    const date = form.date.trim();
    if (!FLIGHT_RE.test(fn) || !DATE_RE.test(date)) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLooking(true);
      setLookupError(null);
      try {
        const res = await fetch("/api/flight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ flightNumber: fn, date }),
          signal: controller.signal,
        });
        const json = (await res.json()) as LookupResult;
        if (controller.signal.aborted) return;
        if (!json.ok) {
          setLookupError(json.error);
          return;
        }
        const f = json.flight;
        const dist = greatCircleMiles(
          f.departure.coordinates,
          f.arrival.coordinates,
        );
        const dur = computeDuration(f.departure.scheduled, f.arrival.scheduled);
        setForm((s) => ({
          ...s,
          flightNumber: f.flightNumber,
          from: formatAirport(f.departure.airport, f.departure.iata),
          to: formatAirport(f.arrival.airport, f.arrival.iata),
          departureTime: timeOfDay(f.departure.scheduled),
          distance: dist != null ? String(dist) : s.distance,
          airline: f.airline.name
            ? `${f.airline.name}${f.airline.iata ? ` (${f.airline.iata})` : ""}`
            : s.airline,
          aircraft: f.aircraft?.model ?? s.aircraft,
          duration: dur ?? s.duration,
          registration: f.aircraft?.registration ?? s.registration,
        }));
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setLookupError(err instanceof Error ? err.message : "Lookup failed.");
      } finally {
        if (!controller.signal.aborted) setLooking(false);
      }
    }, 350);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [open, form.flightNumber, form.date]);

  async function onSave() {
    if (!form.flightNumber || !form.date || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/flight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flightNumber: form.flightNumber,
          date: form.date,
          save: true,
        }),
      });
      if (!res.ok) {
        setSaveError("Couldn't save this flight. Please try again.");
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-flight-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-md sm:items-center sm:py-10"
      style={{ opacity: 0 }}
    >
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d12]/95 shadow-2xl shadow-black/60 backdrop-blur-xl"
        style={{ opacity: 0 }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
        />
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/5 bg-[#0b0d12]/95 px-5 py-4 backdrop-blur-md">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-white/5 hover:text-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <XIcon />
          </button>
          <h2
            id="add-flight-modal-title"
            className="flex items-center gap-2 text-base font-semibold tracking-tight text-neutral-50"
          >
            New flight
            {looking && (
              <span
                aria-label="Looking up flight"
                className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white"
              />
            )}
          </h2>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !form.flightNumber || !form.date}
            className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-black transition-colors hover:bg-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:bg-white/30 disabled:text-neutral-500"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </header>

        {/* Body */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
          className="flex max-h-[min(75vh,720px)] flex-col gap-5 overflow-y-auto px-5 py-5"
        >
          {(lookupError || saveError) && (
            <div
              role="alert"
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
            >
              {saveError ?? lookupError}
            </div>
          )}

          <Section title="General">
            <Field label="Date" icon={<CalendarIcon />} value={form.date}>
              <span
                className={`pl-11 text-sm ${form.date ? "text-neutral-50" : "text-neutral-600"}`}
              >
                {form.date ? formatDate(form.date) : " "}
              </span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Date"
              />
            </Field>

            <Field
              label="From"
              icon={<DepartIcon />}
              value={form.from}
              onClear={() => clear("from")}
            >
              <input
                type="text"
                placeholder=" "
                value={form.from}
                onChange={(e) => update("from", e.target.value)}
                className="w-full bg-transparent pl-11 pr-9 text-sm text-neutral-50 placeholder:text-neutral-600 focus:outline-none"
              />
            </Field>

            <Field
              label="To"
              icon={<ArriveIcon />}
              value={form.to}
              onClear={() => clear("to")}
            >
              <input
                type="text"
                placeholder=" "
                value={form.to}
                onChange={(e) => update("to", e.target.value)}
                className="w-full bg-transparent pl-11 pr-9 text-sm text-neutral-50 placeholder:text-neutral-600 focus:outline-none"
              />
            </Field>
          </Section>

          <Section title="Details">
            <Field
              label="Flight number"
              icon={<TicketIcon />}
              value={form.flightNumber}
              onClear={() => clear("flightNumber")}
            >
              <input
                type="text"
                placeholder="AS21"
                value={form.flightNumber}
                onChange={(e) =>
                  update("flightNumber", e.target.value.toUpperCase())
                }
                autoComplete="off"
                spellCheck={false}
                className="w-full bg-transparent pl-11 pr-9 text-sm uppercase text-neutral-50 placeholder:text-neutral-600 focus:outline-none"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Departure"
                icon={<ClockIcon />}
                value={form.departureTime}
                compact
              >
                <span
                  className={`pl-11 text-sm tabular-nums ${form.departureTime ? "text-neutral-50" : "text-neutral-600"}`}
                >
                  {form.departureTime || " "}
                </span>
                <input
                  type="time"
                  value={form.departureTime}
                  onChange={(e) => update("departureTime", e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Departure time"
                />
              </Field>
              <Field
                label="Duration"
                icon={<DurationIcon />}
                value={form.duration}
                onClear={() => clear("duration")}
                compact
              >
                <input
                  type="text"
                  placeholder="00:00"
                  value={form.duration}
                  onChange={(e) => update("duration", e.target.value)}
                  className="w-full bg-transparent pl-11 pr-9 text-sm tabular-nums text-neutral-50 placeholder:text-neutral-600 focus:outline-none"
                />
              </Field>
            </div>

            <Field
              label="Distance"
              icon={<ArrowIcon />}
              value={form.distance}
              onClear={() => clear("distance")}
            >
              <div className="relative flex flex-1 items-center">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder=" "
                  value={form.distance}
                  onChange={(e) =>
                    update("distance", e.target.value.replace(/[^\d]/g, ""))
                  }
                  className="w-full bg-transparent pl-11 pr-14 text-sm text-neutral-50 placeholder:text-neutral-600 focus:outline-none"
                />
                {form.distance && (
                  <span className="pointer-events-none absolute right-10 text-xs text-neutral-400">
                    mi
                  </span>
                )}
              </div>
            </Field>

            <Field
              label="Airline"
              icon={<TailIcon />}
              value={form.airline}
              onClear={() => clear("airline")}
            >
              <input
                type="text"
                placeholder=" "
                value={form.airline}
                onChange={(e) => update("airline", e.target.value)}
                className="w-full bg-transparent pl-11 pr-9 text-sm text-neutral-50 placeholder:text-neutral-600 focus:outline-none"
              />
            </Field>

            <Field
              label="Aircraft"
              icon={<PlaneIcon />}
              value={form.aircraft}
              onClear={() => clear("aircraft")}
            >
              <input
                type="text"
                placeholder=" "
                value={form.aircraft}
                onChange={(e) => update("aircraft", e.target.value)}
                className="w-full bg-transparent pl-11 pr-9 text-sm text-neutral-50 placeholder:text-neutral-600 focus:outline-none"
              />
            </Field>

            <Field
              label="Registration"
              icon={<TailIcon />}
              value={form.registration}
              onClear={() => clear("registration")}
            >
              <input
                type="text"
                placeholder=" "
                value={form.registration}
                onChange={(e) =>
                  update("registration", e.target.value.toUpperCase())
                }
                className="w-full bg-transparent pl-11 pr-9 text-sm uppercase text-neutral-50 placeholder:text-neutral-600 focus:outline-none"
              />
            </Field>

            <Field
              label="Seat"
              icon={<SeatIcon />}
              value={form.seat}
              onClear={() => clear("seat")}
            >
              <input
                type="text"
                placeholder=" "
                value={form.seat}
                onChange={(e) => update("seat", e.target.value)}
                className="w-full bg-transparent pl-11 pr-9 text-sm text-neutral-50 placeholder:text-neutral-600 focus:outline-none"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Reason"
                value={form.reason}
                onChange={(v) => update("reason", v)}
                options={["Leisure", "Business", "Commute", "Relocation", "Other"]}
              />
              <SelectField
                label="Class"
                value={form.cabinClass}
                onChange={(v) => update("cabinClass", v)}
                options={["Economy", "Premium Economy", "Business", "First"]}
              />
            </div>
          </Section>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
        {title}
      </h3>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  );
}

function Field({
  label,
  icon,
  value,
  children,
  onClear,
  compact = false,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  children: ReactNode;
  onClear?: () => void;
  compact?: boolean;
}) {
  const filled = value.trim().length > 0;
  return (
    <label className="relative block">
      <div
        className={`relative flex ${
          compact ? "h-12" : "h-14"
        } items-center rounded-xl border border-white/10 bg-white/[0.02] transition-colors focus-within:border-[var(--accent)]/60 focus-within:bg-white/[0.04]`}
      >
        <span className="pointer-events-none absolute left-3.5 text-[var(--accent)]">
          {icon}
        </span>
        <span className="pointer-events-none absolute left-2.5 -top-2 bg-[#0b0d12] px-1.5 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
          {label}
        </span>
        {children}
        {filled && onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label={`Clear ${label.toLowerCase()}`}
            className="absolute right-2 flex h-7 w-7 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-white/5 hover:text-neutral-200"
          >
            <XIconSmall />
          </button>
        )}
      </div>
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="relative block">
      <div className="relative flex h-12 items-center rounded-xl border border-white/10 bg-white/[0.02] transition-colors focus-within:border-[var(--accent)]/60 focus-within:bg-white/[0.04]">
        <span className="pointer-events-none absolute left-2.5 -top-2 bg-[#0b0d12] px-1.5 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
          {label}
        </span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`h-full w-full appearance-none bg-transparent pl-3.5 pr-9 text-sm focus:outline-none ${
            value ? "text-neutral-50" : "text-neutral-500"
          }`}
        >
          <option value="" disabled hidden>
            Select
          </option>
          {options.map((opt) => (
            <option key={opt} value={opt} className="bg-[#0b0d12] text-neutral-50">
              {opt}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 text-neutral-400">
          <ChevronDown />
        </span>
      </div>
    </label>
  );
}

// helpers ----------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatAirport(name: string | null, iata: string | null): string {
  if (name && iata) return `${name} (${iata})`;
  return name ?? iata ?? "";
}

function timeOfDay(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function greatCircleMiles(
  a: { lat: number; lon: number } | null,
  b: { lat: number; lon: number } | null,
): number | null {
  if (!a || !b) return null;
  const R = 3958.7613;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
}

function computeDuration(
  depIso: string | null,
  arrIso: string | null,
): string | null {
  if (!depIso || !arrIso) return null;
  const dep = new Date(depIso).getTime();
  const arr = new Date(arrIso).getTime();
  if (!Number.isFinite(dep) || !Number.isFinite(arr) || arr <= dep) return null;
  const mins = Math.round((arr - dep) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

// icons ------------------------------------------------------------------

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}
function DepartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M3 19h18v1.5H3zM21 13.6 6.5 9.5l1.7-2.4L11 7l3.2-3.6c.5-.6 1.7-.6 2.2 0 .5.6.5 1.5 0 2.1L13.7 9l4 1.1c.7.2 1.1.9 1 1.6-.2.7-.9 1.1-1.7.9z" />
    </svg>
  );
}
function ArriveIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M3 19h18v1.5H3zM2.7 13.7c-.2-.7.2-1.4.9-1.6L7.5 11 6 5.7c-.2-.7.4-1.4 1.1-1.2l1.4.4 3.2 5.1 4.4-1.2c.8-.2 1.6.2 1.8 1 .2.8-.3 1.6-1 1.8L4.4 14.7c-.7.2-1.5-.3-1.7-1z" />
    </svg>
  );
}
function TicketIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2.5a2 2 0 0 0 0 5V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.5a2 2 0 0 0 0-5V7zm4 1.5v7c0 .3.2.5.5.5s.5-.2.5-.5v-7c0-.3-.2-.5-.5-.5s-.5.2-.5.5z" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h16M14 6l6 6-6 6" />
    </svg>
  );
}
function TailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M3.5 16.5 18 4.5c1.4-1.2 3.5-.2 3.5 1.6V18a1.5 1.5 0 0 1-1.5 1.5H5c-1.7 0-2.6-2-1.5-3z" />
    </svg>
  );
}
function PlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
    </svg>
  );
}
function DurationIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 12 12 3.5A8.5 8.5 0 0 1 20.5 12z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function SeatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4v8a3 3 0 0 0 3 3h7" />
      <path d="M6 15l-1 5h3l1-3" />
      <path d="M16 15v5h3" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
function XIconSmall() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
function ChevronDown() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
