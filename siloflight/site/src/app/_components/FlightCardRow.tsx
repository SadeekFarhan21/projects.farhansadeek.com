import type { StoredFlight } from "@/lib/stats";
import { lookupAirport } from "@/lib/airports";
import {
  airlineLogoUrl,
  computeDuration,
  deriveAirlineBadge,
  formatDate,
  formatFlightCode,
  formatMilitaryTime,
  greatCircleMiles,
  normalizeStatus,
  statusProgress,
} from "@/lib/flight-display";
import RouteProgress from "./RouteProgress";

export default function FlightCardRow({ flight }: { flight: StoredFlight }) {
  const f = flight.result;
  const dep = f.departure;
  const arr = f.arrival;
  const status = normalizeStatus(f.status);
  const distance = greatCircleMiles(dep.coordinates, arr.coordinates);
  const duration = computeDuration(dep.scheduled, arr.scheduled);
  const airlineName =
    f.airline.name ?? f.airline.iata ?? f.flightNumber.slice(0, 2);
  const flightCode = formatFlightCode(f.flightNumber, f.airline.iata);
  const depGateLine = formatGate(dep.gate, dep.terminal);
  const arrGateLine = formatGate(arr.gate, arr.terminal);
  const badge = deriveAirlineBadge(f.airline, f.flightNumber);
  const progress = statusProgress(status);
  const airlineInitial = (airlineName.trim().charAt(0) || "✈").toUpperCase();
  const { url: logoUrl, scale: logoScale } = airlineLogoUrl(f.airline.iata);
  const depAirport = lookupAirport(dep.iata);
  const arrAirport = lookupAirport(arr.iata);
  const depTz = depAirport?.tz;
  const depCity = depAirport?.city ?? null;
  const arrCity = arrAirport?.city ?? null;
  const depMilitary = formatMilitaryTime(dep.scheduled, depTz);

  return (
    <article className="group relative mb-4 flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 shadow-[inset_0_1px_0_rgb(255_255_255_/0.03)] backdrop-blur-sm transition-colors duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] sm:p-6">
      <header className="mb-5 flex items-center justify-between sm:mb-6">
        <div className="flex items-baseline gap-2 text-xs font-medium tracking-wide tabular-nums sm:text-base">
          <span className="text-zinc-300">{formatDate(f.date)}</span>
          {depMilitary && (
            <span className="text-zinc-500">{depMilitary}</span>
          )}
        </div>
      </header>

      <section className="relative mb-6 flex items-center justify-between gap-2 sm:mb-8 sm:gap-4">
        <div className="z-10 flex w-[18%] shrink-0 flex-col text-left">
          <h2 className="text-3xl font-bold leading-none tracking-tight text-zinc-100 sm:text-5xl">
            {dep.iata ?? "—"}
          </h2>
          {depCity && (
            <span className="mt-2 truncate text-xs font-medium text-zinc-400 sm:text-base">
              {depCity}
            </span>
          )}
          {depGateLine && (
            <span className="mt-1 truncate text-[11px] text-zinc-500 sm:text-xs">
              {depGateLine}
            </span>
          )}
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-6 px-0 pt-0 sm:gap-5 sm:px-1 sm:pt-0">
          <RouteProgress progress={progress} />
          <div className="flex items-center gap-1.5 text-xs tabular-nums text-zinc-400 sm:gap-2 sm:text-base">
            <span>{duration ?? "—"}</span>
            {distance ? (
              <>
                <span className="text-zinc-600">·</span>
                <span>{distance.toLocaleString()} mi</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="z-10 flex w-[18%] shrink-0 flex-col text-right">
          <h2 className="text-3xl font-bold leading-none tracking-tight text-zinc-100 sm:text-5xl">
            {arr.iata ?? "—"}
          </h2>
          {arrCity && (
            <span className="mt-2 truncate text-xs font-medium text-zinc-400 sm:text-base">
              {arrCity}
            </span>
          )}
          {arrGateLine && (
            <span className="mt-1 truncate text-[11px] text-zinc-500 sm:text-xs">
              {arrGateLine}
            </span>
          )}
        </div>
      </section>

      <footer className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4 sm:pt-6">
        <div className="flex min-w-0 items-center gap-5 sm:gap-6">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${airlineName} logo`}
              className="h-9 w-9 shrink-0 object-contain sm:h-12 sm:w-12"
              style={logoScale !== 1 ? { transform: `scale(${logoScale})` } : undefined}
              width={48}
              height={48}
            />
          ) : (
            <div
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base font-bold italic ring-1 ring-inset sm:h-12 sm:w-12 sm:rounded-xl sm:text-xl"
              style={{
                background: `linear-gradient(135deg, ${badge.from}, ${badge.to})`,
                color: badge.fg,
                boxShadow: `inset 0 0 0 1px ${badge.ring}`,
              }}
            >
              {airlineInitial}
            </div>
          )}
          <span className="truncate text-sm font-semibold text-zinc-200 sm:text-lg">
            {airlineName}
          </span>
        </div>
        <span className="shrink-0 font-mono text-xs text-zinc-400 tabular-nums sm:text-base">
          {flightCode}
        </span>
      </footer>
    </article>
  );
}

function formatGate(gate: string | null, terminal: string | null): string {
  const parts: string[] = [];
  if (gate) parts.push(`Gate ${gate}`);
  if (terminal) parts.push(`Terminal ${terminal}`);
  return parts.join(", ");
}
