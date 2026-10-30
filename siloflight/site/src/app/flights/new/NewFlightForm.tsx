"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
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

export default function NewFlightForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState<FormState>(() => ({
    ...EMPTY,
    flightNumber: (params.get("flightNumber") ?? "").toUpperCase(),
    date: params.get("date") ?? "",
  }));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
    if (key === "flightNumber" || key === "date") setLookupError(null);
  }

  function clear<K extends keyof FormState>(key: K) {
    setForm((s) => ({ ...s, [key]: "" as FormState[K] }));
  }

  useEffect(() => {
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
        setLookupError(
          err instanceof Error ? err.message : "Lookup failed.",
        );
      } finally {
        if (!controller.signal.aborted) setLooking(false);
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [form.flightNumber, form.date]);

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
      router.push("/flights");
      router.refresh();
    } catch {
      setSaveError("Network error. Please check your connection and retry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#000000] text-neutral-50">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-[#000000]/95 px-4 py-4 backdrop-blur-md">
        <Link
          href="/flights"
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-200 transition-colors hover:bg-white/5"
        >
          <BackIcon />
        </Link>
        <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          Create a new flight
          {looking && (
            <span
              aria-label="Looking up flight"
              className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white"
            />
          )}
        </h1>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !form.flightNumber || !form.date}
          className="rounded-full px-3 py-1.5 text-base font-medium text-neutral-100 transition-colors hover:bg-white/5 disabled:text-neutral-500"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
        className="flex flex-1 flex-col gap-6 px-5 pb-24 pt-6"
      >
        {lookupError && (
          <div
            role="alert"
            className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-neutral-200"
          >
            {lookupError}
          </div>
        )}
        {saveError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-900/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-200"
          >
            {saveError}
          </div>
        )}
        <Section title="General">
          <Field
            label="Date"
            icon={<CalendarIcon />}
            value={form.date}
          >
            <span
              className={`pl-12 text-base ${
                form.date ? "text-neutral-50" : "text-neutral-600"
              }`}
            >
              {form.date ? formatDate(form.date) : " "}
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
              className="w-full bg-transparent pl-12 pr-10 text-base text-neutral-50 placeholder:text-neutral-600 focus:outline-none"
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
              className="w-full bg-transparent pl-12 pr-10 text-base text-neutral-50 placeholder:text-neutral-600 focus:outline-none"
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
              placeholder=" "
              value={form.flightNumber}
              onChange={(e) =>
                update("flightNumber", e.target.value.toUpperCase())
              }
              className="w-full bg-transparent pl-12 pr-10 text-base uppercase text-neutral-50 placeholder:text-neutral-600 focus:outline-none"
            />
          </Field>

          <Field
            label="Departure Time"
            icon={<ClockIcon />}
            value={form.departureTime}
          >
            <span
              className={`pl-12 text-base ${
                form.departureTime ? "text-neutral-50" : "text-neutral-600"
              }`}
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
                className="w-full bg-transparent pl-12 pr-16 text-base text-neutral-50 placeholder:text-neutral-600 focus:outline-none"
              />
              {form.distance && (
                <span className="pointer-events-none absolute right-12 text-base text-neutral-400">
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
              className="w-full bg-transparent pl-12 pr-10 text-base text-neutral-50 placeholder:text-neutral-600 focus:outline-none"
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
              className="w-full bg-transparent pl-12 pr-10 text-base text-neutral-50 placeholder:text-neutral-600 focus:outline-none"
            />
          </Field>

          <Field
            label="Duration"
            icon={<DurationIcon />}
            value={form.duration}
            onClear={() => clear("duration")}
          >
            <input
              type="text"
              placeholder=" "
              value={form.duration}
              onChange={(e) => update("duration", e.target.value)}
              className="w-full bg-transparent pl-12 pr-10 text-base text-neutral-50 placeholder:text-neutral-600 focus:outline-none"
            />
          </Field>

          <Field
            label="Aircraft Registration"
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
              className="w-full bg-transparent pl-12 pr-10 text-base uppercase text-neutral-50 placeholder:text-neutral-600 focus:outline-none"
            />
          </Field>

          <PlainField icon={<SeatIcon />} value={form.seat} onClear={() => clear("seat")}>
            <input
              type="text"
              placeholder="Seat"
              value={form.seat}
              onChange={(e) => update("seat", e.target.value)}
              className="w-full bg-transparent pl-12 pr-10 text-base text-neutral-50 placeholder:text-neutral-500 focus:outline-none"
            />
          </PlainField>

          <LockedField icon={<NotesIcon />} label="Notes" />

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

          <LockedField icon={<TagsIcon />} label="Tags" floatingLabel />
        </Section>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-2xl font-semibold tracking-tight text-neutral-200">
        {title}
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  icon,
  value,
  children,
  onClear,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  children: ReactNode;
  onClear?: () => void;
}) {
  const filled = value.trim().length > 0;
  return (
    <label className="relative block">
      <div className="relative flex h-16 items-center rounded-xl border border-white/10 bg-transparent transition-colors focus-within:border-[var(--accent)]/60">
        <span className="pointer-events-none absolute left-4 text-[var(--accent)]">
          {icon}
        </span>
        <span className="pointer-events-none absolute left-3 -top-2 bg-[#0b1117] px-1.5 text-xs text-neutral-400">
          {label}
        </span>
        {children}
        {filled && onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label={`Clear ${label.toLowerCase()}`}
            className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-white/5 hover:text-neutral-200"
          >
            <XIcon />
          </button>
        )}
      </div>
    </label>
  );
}

function PlainField({
  icon,
  value,
  children,
  onClear,
}: {
  icon: ReactNode;
  value: string;
  children: ReactNode;
  onClear?: () => void;
}) {
  const filled = value.trim().length > 0;
  return (
    <label className="relative block">
      <div className="relative flex h-16 items-center rounded-xl border border-white/10 bg-transparent transition-colors focus-within:border-[var(--accent)]/60">
        <span className="pointer-events-none absolute left-4 text-[var(--accent)]">
          {icon}
        </span>
        {children}
        {filled && onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear"
            className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-white/5 hover:text-neutral-200"
          >
            <XIcon />
          </button>
        )}
      </div>
    </label>
  );
}

function LockedField({
  icon,
  label,
  floatingLabel = false,
}: {
  icon: ReactNode;
  label: string;
  floatingLabel?: boolean;
}) {
  return (
    <div className="relative flex h-16 items-center rounded-xl border border-white/10 bg-transparent">
      <span className="pointer-events-none absolute left-4 text-[var(--accent)]">
        {icon}
      </span>
      {floatingLabel ? (
        <span className="pointer-events-none absolute left-3 -top-2 bg-[#0b1117] px-1.5 text-xs text-neutral-400">
          {label}
        </span>
      ) : (
        <span className="pl-12 text-base text-neutral-500">{label}</span>
      )}
      <span className="absolute right-4 text-neutral-300">
        <LockIcon />
      </span>
    </div>
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
      <div className="relative flex h-16 items-center rounded-xl border border-white/10 bg-transparent transition-colors focus-within:border-[var(--accent)]/60">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`h-full w-full appearance-none bg-transparent pl-4 pr-10 text-base focus:outline-none ${
            value ? "text-neutral-50" : "text-neutral-500"
          }`}
        >
          <option value="" disabled hidden>
            {label}
          </option>
          {options.map((opt) => (
            <option key={opt} value={opt} className="bg-[#0b1117] text-neutral-50">
              {opt}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-4 text-neutral-300">
          <ChevronDown />
        </span>
      </div>
    </label>
  );
}

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

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <rect x="7" y="13" width="3" height="3" rx="0.5" fill="currentColor" />
    </svg>
  );
}

function DepartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M3 19h18v1.5H3zM21 13.6 6.5 9.5l1.7-2.4L11 7l3.2-3.6c.5-.6 1.7-.6 2.2 0 .5.6.5 1.5 0 2.1L13.7 9l4 1.1c.7.2 1.1.9 1 1.6-.2.7-.9 1.1-1.7.9z" />
    </svg>
  );
}

function ArriveIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M3 19h18v1.5H3zM2.7 13.7c-.2-.7.2-1.4.9-1.6L7.5 11 6 5.7c-.2-.7.4-1.4 1.1-1.2l1.4.4 3.2 5.1 4.4-1.2c.8-.2 1.6.2 1.8 1 .2.8-.3 1.6-1 1.8L4.4 14.7c-.7.2-1.5-.3-1.7-1z" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2.5a2 2 0 0 0 0 5V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.5a2 2 0 0 0 0-5V7zm4 1.5v7c0 .3.2.5.5.5s.5-.2.5-.5v-7c0-.3-.2-.5-.5-.5s-.5.2-.5.5z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h16M14 6l6 6-6 6" />
    </svg>
  );
}

function TailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M3.5 16.5 18 4.5c1.4-1.2 3.5-.2 3.5 1.6V18a1.5 1.5 0 0 1-1.5 1.5H5c-1.7 0-2.6-2-1.5-3z" opacity=".25" />
      <path d="M3.5 16.5 18 4.5c1.4-1.2 3.5-.2 3.5 1.6V18a1.5 1.5 0 0 1-1.5 1.5H5c-1.7 0-2.6-2-1.5-3z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function PlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
    </svg>
  );
}

function DurationIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17" />
      <path d="M12 12 12 3.5A8.5 8.5 0 0 1 20.5 12z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SeatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4v8a3 3 0 0 0 3 3h7" />
      <path d="M6 15l-1 5h3l1-3" />
      <path d="M16 15v5h3" />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M5 7h14M5 12h14M5 17h8" />
    </svg>
  );
}

function TagsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
      <path d="M5 5h7l7 7-7 7-7-7V5z" />
      <circle cx="9" cy="9" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
