import Link from "next/link";
import { notFound } from "next/navigation";
import { getFlightById } from "@/lib/server-flights";
import { lookupAirport } from "@/lib/airports";
import {
  airlineLogoUrl,
  computeDuration,
  dayDelta,
  deriveAirlineBadge,
  formatDate,
  formatLocalTime,
  formatMilitaryTime,
  formatFlightCode,
  greatCircleMiles,
} from "@/lib/flight-display";

import DeleteFlightButton from "./DeleteFlightButton";
import CopyButton from "../../_components/CopyButton";
import FlightGlobe from "../../_components/FlightGlobe";
import AnimateIn from "../../_components/AnimateIn";
import AirplaneIcon from "../../_components/AirplaneIcon";

export default async function FlightDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const flight = await getFlightById(id);
  if (!flight) notFound();

  const f = flight.result;
  const dep = f.departure;
  const arr = f.arrival;
  const distance = greatCircleMiles(dep.coordinates, arr.coordinates);
  const duration = computeDuration(dep.scheduled, arr.scheduled);
  const airlineName =
    f.airline.name ?? f.airline.iata ?? f.flightNumber.slice(0, 2);
  const flightCode = formatFlightCode(f.flightNumber, f.airline.iata);
  const badge = deriveAirlineBadge(f.airline, f.flightNumber);
  const airlineInitial = (airlineName.trim().charAt(0) || "✈").toUpperCase();
  const { url: logoUrl, scale: logoScale } = airlineLogoUrl(f.airline.iata);
  const depAirport = lookupAirport(dep.iata);
  const arrAirport = lookupAirport(arr.iata);
  const depTz = depAirport?.tz;
  const arrTz = arrAirport?.tz;
  const depLocal = formatLocalTime(dep.scheduled, depTz);
  const arrLocal = formatLocalTime(arr.scheduled, arrTz);
  const depMilitary = formatMilitaryTime(dep.scheduled, depTz);
  const arrDayOffset = dayDelta(dep.scheduled, depTz, arr.scheduled, arrTz);
  const depCity = depAirport?.city ?? null;
  const arrCity = arrAirport?.city ?? null;

  const barcodeId = [
    f.flightNumber,
    f.date,
    dep.iata ?? "---",
    arr.iata ?? "---",
  ].join("-");

  return (
    <div className="page-accent flex min-h-screen flex-col bg-[var(--bg)] text-neutral-50">
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-28 sm:px-6 sm:pt-6 sm:pb-32">
        <Link
          href="/flights"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <BackIcon />
          <span>Flights</span>
        </Link>
        {/* Boarding pass */}
        <AnimateIn as="header" duration={0.8} y={24} className="mt-6 mb-12 block">
          <div className="relative flex flex-col overflow-hidden rounded-3xl bg-[#0a0a0a] shadow-2xl md:flex-row">
            {/* Main pass section */}
            <div className="relative flex-grow border-b border-dashed border-neutral-700 p-5 sm:p-8 md:border-b-0 md:border-r md:p-10">
              <div className="mb-8 flex items-start justify-between gap-3 sm:mb-10 sm:gap-4">
                <div className="flex min-w-0 items-center gap-3 sm:gap-5">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={`${airlineName} logo`}
                      className="h-14 w-14 shrink-0 object-contain sm:h-20 sm:w-20"
                      style={
                        logoScale !== 1
                          ? { transform: `scale(${logoScale})` }
                          : undefined
                      }
                      width={80}
                      height={80}
                    />
                  ) : (
                    <div
                      aria-hidden
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-xl font-bold italic ring-1 ring-inset sm:h-20 sm:w-20 sm:rounded-2xl sm:text-3xl"
                      style={{
                        background: `linear-gradient(135deg, ${badge.from}, ${badge.to})`,
                        color: badge.fg,
                        boxShadow: `inset 0 0 0 1px ${badge.ring}`,
                      }}
                    >
                      {airlineInitial}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="mb-1 truncate text-[10px] uppercase tracking-widest text-neutral-400 sm:text-xs">
                      {airlineName}
                    </p>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-bold tabular-nums sm:text-2xl">
                        {flightCode}
                      </h1>
                      <CopyButton value={flightCode} label="" />
                    </div>
                    <p className="mt-1 text-xs text-neutral-500 tabular-nums sm:text-sm">
                      {formatDate(f.date)}
                      {depMilitary && (
                        <span className="ml-2">{depMilitary}</span>
                      )}
                    </p>
                  </div>
                </div>
                {duration && (
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 sm:text-xs">
                      Duration
                    </p>
                    <p className="text-xs font-medium tabular-nums sm:text-sm">{duration}</p>
                  </div>
                )}
              </div>

              {/* Route */}
              <div className="flex items-center justify-between gap-2 py-4 sm:gap-3 sm:py-6 md:gap-6">
                <div className="min-w-0 max-w-[36%] shrink-0 text-left">
                  <div className="text-3xl font-bold tracking-tighter text-zinc-100 sm:text-5xl md:text-7xl">
                    {dep.iata ?? "—"}
                  </div>
                  {dep.airport && (
                    <p className="mt-1.5 truncate text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-500 sm:mt-2 sm:text-[10px] md:text-xs">
                      {dep.airport}
                    </p>
                  )}
                  {depLocal && (
                    <p className="mt-1 truncate text-[10px] text-zinc-400 tabular-nums sm:text-xs">
                      {depLocal}
                    </p>
                  )}
                </div>

                <div className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-2 px-1 sm:gap-2.5 sm:px-2">
                  {/* Duration above */}
                  {duration && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                      {duration}
                    </span>
                  )}

                  {/* Route line + plane */}
                  <div className="relative flex w-full items-center justify-center">
                    {/* Soft gradient line spanning the full width */}
                    <div
                      aria-hidden
                      className="absolute h-px w-full"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent 0%, rgba(228,228,231,0.55) 18%, rgba(228,228,231,0.55) 82%, transparent 100%)",
                      }}
                    />
                    {/* Endpoint dots */}
                    <span
                      aria-hidden
                      className="absolute left-0 h-1.5 w-1.5 rounded-full bg-zinc-200"
                      style={{
                        boxShadow: "0 0 8px rgba(228,228,231,0.5)",
                      }}
                    />
                    <span
                      aria-hidden
                      className="absolute right-0 h-1.5 w-1.5 rounded-full bg-zinc-200"
                      style={{
                        boxShadow: "0 0 8px rgba(228,228,231,0.5)",
                      }}
                    />
                    {/* Plane glyph in the centre — bigger, glowing, on top */}
                    <span
                      className="relative z-10 flex h-5 w-5 items-center justify-center text-zinc-100 drop-shadow-[0_0_8px_rgba(159,199,255,0.55)] sm:h-7 sm:w-7"
                      style={{ transform: "rotate(45deg)" }}
                      aria-hidden
                    >
                      <AirplaneIcon className="h-full w-full" />
                    </span>
                  </div>

                  {/* Distance below */}
                  {distance != null && (
                    <span className="font-mono text-[10px] tabular-nums text-zinc-500">
                      {distance.toLocaleString()} mi
                    </span>
                  )}
                </div>

                <div className="min-w-0 max-w-[36%] shrink-0 text-right">
                  <div className="text-3xl font-bold tracking-tighter text-zinc-100 sm:text-5xl md:text-7xl">
                    {arr.iata ?? "—"}
                  </div>
                  {arr.airport && (
                    <p className="mt-1.5 truncate text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-500 sm:mt-2 sm:text-[10px] md:text-xs">
                      {arr.airport}
                    </p>
                  )}
                  {arrLocal && (
                    <p className="mt-1 truncate text-[10px] text-zinc-400 tabular-nums sm:text-xs">
                      {arrLocal}
                      {arrDayOffset !== 0 && (
                        <span className="ml-1 text-[var(--accent)]">
                          ({arrDayOffset > 0 ? "+" : ""}
                          {arrDayOffset})
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Tear-off stub */}
            <div className="relative flex flex-col justify-between bg-[#111111] p-5 sm:p-8 md:w-64">
              {/* Decorative semicircle cutouts on the dashed seam (desktop) */}
              <div className="absolute left-0 top-0 bottom-0 hidden w-4 overflow-hidden md:block">
                <div className="flex h-full flex-col justify-around">
                  <div className="-ml-2 h-4 w-4 rounded-full bg-[#000000]" />
                  <div className="-ml-2 h-4 w-4 rounded-full bg-[#000000]" />
                  <div className="-ml-2 h-4 w-4 rounded-full bg-[#000000]" />
                </div>
              </div>

              <div>
                <p className="mb-4 text-xs uppercase tracking-widest text-neutral-400">
                  Gate Information
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase text-neutral-500">Gate</p>
                    <p className="text-lg font-bold">{dep.gate ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-neutral-500">
                      Terminal
                    </p>
                    <p className="text-lg font-bold">{dep.terminal ?? "—"}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Barcode seed={barcodeId} />
                <p className="mt-1 truncate text-center text-[8px] uppercase tracking-[0.4em] text-neutral-600">
                  {barcodeId}
                </p>
              </div>
            </div>
          </div>
        </AnimateIn>

        {/* Route globe */}
        {dep.coordinates && arr.coordinates && (
          <AnimateIn as="section" whenVisible className="mb-10 block sm:mb-12">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 sm:mb-4">
              <h2 className="text-lg font-semibold text-neutral-200 sm:text-xl">Route</h2>
              {distance != null && (
                <span className="text-xs text-neutral-400 tabular-nums sm:text-sm">
                  {distance.toLocaleString()} mi great circle
                </span>
              )}
            </div>
            <FlightGlobe
              departure={{
                lat: dep.coordinates.lat,
                lon: dep.coordinates.lon,
              }}
              arrival={{
                lat: arr.coordinates.lat,
                lon: arr.coordinates.lon,
              }}
              departureLabel={dep.iata ?? "Departure"}
              arrivalLabel={arr.iata ?? "Arrival"}
            />
          </AnimateIn>
        )}

        {/* General */}
        <AnimateIn as="section" whenVisible className="mb-12 block">
          <h2 className="mb-6 text-xl font-semibold text-neutral-200">General</h2>
          <div className="rounded-3xl border border-neutral-800 bg-[#0a0a0a] p-6 shadow-xl md:p-8">
            <div className="grid grid-cols-1 gap-6 divide-y divide-neutral-800 md:grid-cols-3 md:divide-x md:divide-y-0">
              <GeneralTile
                icon="calendar_today"
                label="Date"
                value={formatDate(f.date)}
              />
              <GeneralTile
                icon="flight_takeoff"
                label="From"
                value={joinNonEmpty(depCity, dep.iata)}
              />
              <GeneralTile
                icon="flight_land"
                label="To"
                value={joinNonEmpty(arrCity, arr.iata)}
              />
            </div>
          </div>
        </AnimateIn>

        {/* Details */}
        <AnimateIn as="section" whenVisible className="mb-12 block">
          <h2 className="mb-4 text-xl font-semibold text-neutral-200">Details</h2>
          <dl className="divide-y divide-neutral-800 rounded-3xl border border-neutral-800 bg-[#0a0a0a] px-6 md:px-8">
            <DetailRow
              icon="confirmation_number"
              label="Flight number"
              value={flightCode}
            />
            <DetailRow
              icon="schedule"
              label="Arrival Time"
              value={
                arrLocal
                  ? arrDayOffset !== 0
                    ? `${arrLocal} (${arrDayOffset > 0 ? "+" : ""}${arrDayOffset})`
                    : arrLocal
                  : "—"
              }
            />
            <DetailRow
              icon="straighten"
              label="Distance"
              value={distance != null ? `${distance.toLocaleString()} mi` : "—"}
            />
            <DetailRow
              icon="airlines"
              label="Airline"
              value={joinNonEmpty(airlineName, f.airline.iata)}
            />
            <DetailRow
              icon="flight"
              label="Aircraft"
              value={f.aircraft?.model ?? "—"}
            />
            <DetailRow
              icon="pie_chart"
              label="Duration"
              value={duration ?? "—"}
            />
            <DetailRow
              icon="badge"
              label="Aircraft Registration"
              value={f.aircraft?.registration ?? "—"}
            />
            <DetailRow
              icon="door_back"
              label="Departure Gate"
              value={joinNonEmpty(
                dep.terminal ? `T${dep.terminal}` : null,
                dep.gate ? `Gate ${dep.gate}` : null,
              )}
            />
            <DetailRow
              icon="door_front"
              label="Arrival Gate"
              value={joinNonEmpty(
                arr.terminal ? `T${arr.terminal}` : null,
                arr.gate ? `Gate ${arr.gate}` : null,
              )}
            />
            {arr.baggageClaim && (
              <DetailRow
                icon="luggage"
                label="Baggage"
                value={arr.baggageClaim}
              />
            )}
          </dl>
        </AnimateIn>
      </main>

      <DeleteFlightButton id={flight.id} flightNumber={f.flightNumber} />
    </div>
  );
}

function GeneralTile({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 pt-4 md:pt-0 md:first:pl-0 md:[&:not(:first-child)]:pl-8">
      <div className="rounded-2xl bg-neutral-800/50 p-3 text-neutral-400">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="mb-1 text-xs uppercase tracking-widest text-neutral-500">
          {label}
        </p>
        <p className="truncate text-sm font-medium text-neutral-200">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 py-4">
      <span
        aria-hidden
        className="material-symbols-outlined shrink-0 text-neutral-300"
        style={{ fontSize: "24px" }}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-neutral-500">{label}</dt>
        <dd className="truncate text-base text-neutral-100 tabular-nums">
          {value || "—"}
        </dd>
      </div>
    </div>
  );
}

function Barcode({ seed }: { seed: string }) {
  // Deterministic bar pattern derived from the seed so each flight gets a unique-looking barcode.
  const widths = [1, 2, 3, 4, 5];
  const heights = ["h-1/2", "h-2/3", "h-3/4", "h-4/5", "h-full"];
  const bars: { w: number; h: string }[] = [];
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = (h * 33) ^ seed.charCodeAt(i);
  for (let i = 0; i < 28; i++) {
    h = Math.imul(h ^ (h >>> 13), 1597334677);
    bars.push({
      w: widths[Math.abs(h) % widths.length]!,
      h: heights[Math.abs(h >> 5) % heights.length]!,
    });
  }
  return (
    <div className="flex h-12 w-full items-end gap-[2px]">
      {bars.map((bar, i) => (
        <div
          key={i}
          className={`bg-neutral-500 ${bar.h}`}
          style={{ width: `${bar.w}px` }}
        />
      ))}
    </div>
  );
}

function joinNonEmpty(...parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" · ");
}

function BackIcon() {
  return (
    <svg
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}
