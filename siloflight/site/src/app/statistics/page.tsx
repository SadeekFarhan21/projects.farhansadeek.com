import { getSessionAndFlights } from "@/lib/server-flights";
import {
  computeStats,
  aroundTheWorld,
  type StoredFlight,
} from "@/lib/stats";
import { airlineLogoUrl } from "@/lib/flight-display";
import SignInPrompt from "../_components/SignInPrompt";
import StatsGlobe from "../_components/StatsGlobe";
import AirportsDonut from "../_components/AirportsDonut";
import AnimateIn from "../_components/AnimateIn";
import CountUp from "../_components/CountUp";
import TiltCard from "../_components/TiltCard";

export default async function StatisticsPage() {
  const { session, flights, dbReady, error } = await getSessionAndFlights();

  if (!dbReady) {
    return (
      <Container>
        <div className="rounded-2xl border border-neutral-700 bg-neutral-900 p-4 text-sm text-neutral-200">
          Database not configured yet. Set <code className="font-mono">DATABASE_URL</code> in{" "}
          <code className="font-mono">.env.local</code> to start collecting stats.
        </div>
      </Container>
    );
  }
  if (error) {
    return (
      <Container>
        <div
          role="alert"
          className="rounded-2xl border border-rose-900/40 bg-rose-950/30 p-4 text-sm text-rose-200"
        >
          {error}
        </div>
      </Container>
    );
  }
  if (!session?.user) {
    return (
      <Container>
        <SignInPrompt />
      </Container>
    );
  }
  if (flights.length === 0) {
    return (
      <Container>
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
          <div aria-hidden className="mb-3 text-4xl">📊</div>
          <p className="text-base font-medium text-neutral-200">
            No stats to show yet
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Add a flight from the Flights tab and your dashboard will light up.
          </p>
        </div>
      </Container>
    );
  }

  const allTime = computeStats(flights);
  const year = getMostRecentYear(flights);
  const inYear = flights.filter(
    (f) => new Date(f.date).getUTCFullYear() === year,
  );
  const stats = computeStats(inYear);
  const longestSameAsShortest =
    stats.longest &&
    stats.shortest &&
    stats.longest.flight.id === stats.shortest.flight.id;

  return (
    <Container>
      <AnimateIn
        as="div"
        stagger={0.08}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <HeroCard
          label="Total Flights"
          numericValue={allTime.totalFlights}
          sub="logged"
          icon={<PlaneIcon />}
        />
        <HeroCard
          label="Total Miles"
          numericValue={allTime.totalMiles}
          sub={`${aroundTheWorld(allTime.totalMiles).toFixed(2)}× around the world`}
          icon={<GlobeIcon />}
        />
        <HeroCard
          label="Time in the Air"
          numericValue={allTime.totalAirMinutes}
          format="time-minutes"
          sub={`${(allTime.totalAirMinutes / 60 / 24).toFixed(1)} days airborne`}
          icon={<ClockIcon />}
        />
      </AnimateIn>

      <AnimateIn delay={0.15}>
        <Card
          title="Where you've flown"
          eyebrowRight={
            <span className="text-[11px] font-medium text-zinc-500 tabular-nums">
              {allTime.airportPoints.length} airports · {allTime.routeSegments.length} routes
            </span>
          }
        >
          <div className="h-[460px] overflow-hidden rounded-xl sm:h-[520px]">
            <StatsGlobe
              segments={allTime.routeSegments}
              points={allTime.airportPoints}
            />
          </div>
        </Card>
      </AnimateIn>

      <AnimateIn
        as="div"
        stagger={0.08}
        whenVisible
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        <Card title="Top airports">
          {stats.topAirports.length > 0 ? (
            <AirportsDonut data={stats.topAirports} />
          ) : (
            <Empty />
          )}
        </Card>

        <Card title="Top countries">
          {stats.topCountries.length > 0 ? (
            <CountryList items={stats.topCountries} />
          ) : (
            <Empty />
          )}
        </Card>
      </AnimateIn>

      <AnimateIn
        as="div"
        stagger={0.08}
        whenVisible
        className="grid grid-cols-1 gap-4 md:grid-cols-5"
      >
        <div className="md:col-span-3 h-full">
          <Card title="Top airlines">
            {stats.topAirlines.length > 0 ? (
              <div className="flex flex-1 flex-col justify-end">
                <AirlineGrid items={stats.topAirlines} />
              </div>
            ) : (
              <Empty />
            )}
          </Card>
        </div>

        <div className="md:col-span-2 h-full">
          <Card title="Top routes">
            {stats.topRoutes.length > 0 ? (
              <BarList
                items={stats.topRoutes.map((r) => ({
                  key: r.route,
                  primary: r.route.replace("-", " — "),
                  count: r.count,
                }))}
                total={Math.max(...stats.topRoutes.map((r) => r.count))}
              />
            ) : (
              <Empty />
            )}
          </Card>
        </div>
      </AnimateIn>

      <AnimateIn
        as="div"
        stagger={0.08}
        whenVisible
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        {stats.longest ? (
          <RecordCard kind="Longest flight" entry={stats.longest} />
        ) : (
          <Card title="Longest flight">
            <Empty />
          </Card>
        )}

        {stats.shortest && !longestSameAsShortest ? (
          <RecordCard kind="Shortest flight" entry={stats.shortest} />
        ) : (
          <Card title="Shortest flight">
            <Empty />
          </Card>
        )}
      </AnimateIn>
    </Container>
  );
}

function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-accent flex flex-1 flex-col px-4 pt-6 pb-20 text-neutral-50 sm:px-6 sm:pt-8 lg:px-20 lg:pt-10 lg:pb-12 xl:px-28">
      <div className="mx-auto w-full max-w-6xl space-y-4 sm:space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl md:text-4xl">
            Statistics
          </h1>
          <p className="text-xs text-zinc-400 sm:text-sm">
            A live look at where you&apos;ve flown and how your year is shaping up.
          </p>
        </header>
        {children}
      </div>
    </div>
  );
}

function Card({
  title,
  eyebrowRight,
  children,
}: {
  title: string;
  eyebrowRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/5 bg-white/[0.025] p-5 shadow-[inset_0_1px_0_rgb(255_255_255_/0.04)] backdrop-blur-sm transition-colors duration-300 ease-out hover:border-white/10 hover:bg-white/[0.04]">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {title}
        </h2>
        {eyebrowRight}
      </div>
      {children}
    </section>
  );
}

function HeroCard({
  label,
  numericValue,
  format = "number",
  sub,
  icon,
}: {
  label: string;
  numericValue: number;
  format?: "number" | "time-minutes";
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <TiltCard max={5} lift={5} className="h-full">
      <section className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.025] p-6 shadow-[inset_0_1px_0_rgb(255_255_255_/0.04)] backdrop-blur-sm">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
        />
        <div className="flex items-start justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {label}
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-[var(--accent)] ring-1 ring-inset ring-white/[0.06]">
            {icon}
          </div>
        </div>
        <div className="mt-5 text-4xl font-semibold tracking-tight tabular-nums text-zinc-100 sm:text-5xl">
          <CountUp
            value={numericValue}
            format={format}
            duration={format === "time-minutes" ? 1.8 : 1.4}
          />
        </div>
        {sub && <div className="mt-2 text-xs text-zinc-500">{sub}</div>}
      </section>
    </TiltCard>
  );
}

function PlaneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1L15 22v-1.5L13 19v-5.5z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function CountryList({
  items,
}: {
  items: Array<{ country: string; count: number }>;
}) {
  const max = Math.max(...items.map((i) => i.count), 1);
  // Inline horizontal bars per row — keeps every country's count visually
  // anchored to its own bar, instead of a disconnected sparkline column.
  return (
    <ul className="flex flex-col gap-3">
      {items.map((c, i) => {
        const flag = countryFlag(c.country);
        const pct = Math.max(2, (c.count / max) * 100);
        return (
          <li key={c.country} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                {flag && (
                  <span aria-hidden className="text-base leading-none">
                    {flag}
                  </span>
                )}
                <span className="truncate font-medium text-zinc-200">
                  {c.country}
                </span>
              </div>
              <span className="shrink-0 tabular-nums text-zinc-500">
                {c.count}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/[0.04]">
              <div
                className="animate-grow-x h-full rounded-full bg-gradient-to-r from-zinc-300 to-[var(--accent)]"
                style={{
                  width: `${pct}%`,
                  animationDelay: `${i * 70}ms`,
                  ["--grow-to" as string]: "1",
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function BarList({
  items,
  total,
}: {
  items: Array<{ key: string; primary: string; badge?: string; count: number }>;
  total: number;
}) {
  const max = Math.max(total, 1);
  return (
    <ul className="flex flex-col gap-3">
      {items.map((it, i) => {
        const pct = (it.count / max) * 100;
        return (
          <li key={it.key} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                {it.badge && (
                  <span className="inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-md bg-white/[0.06] px-1.5 font-mono text-[10px] font-semibold tabular-nums text-zinc-300 ring-1 ring-inset ring-white/[0.08]">
                    {it.badge}
                  </span>
                )}
                <span className="truncate font-medium text-zinc-200">
                  {it.primary}
                </span>
              </div>
              <span className="shrink-0 tabular-nums text-zinc-500">
                {it.count}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/[0.04]">
              <div
                className="animate-grow-x h-full rounded-full bg-gradient-to-r from-zinc-300 to-[var(--accent)]"
                style={{
                  width: `${pct}%`,
                  animationDelay: `${i * 70}ms`,
                  ["--grow-to" as string]: "1",
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

type Airline = { code: string; name: string | null; count: number };
type PodiumGroup = { count: number; airlines: Airline[] };

function AirlineGrid({ items }: { items: Airline[] }) {
  const groups: PodiumGroup[] = [];
  for (const a of items) {
    const last = groups[groups.length - 1];
    if (last && last.count === a.count) {
      last.airlines.push(a);
    } else {
      groups.push({ count: a.count, airlines: [a] });
    }
  }
  const top: PodiumGroup[] = groups.slice(0, 3).map((g) => ({
    count: g.count,
    airlines: g.airlines.length <= 3 ? g.airlines : pickRandom(g.airlines, 3),
  }));
  while (top.length < 3) top.push({ count: 0, airlines: [] });

  const order: Array<{ group: PodiumGroup; height: number }> = [
    { group: top[1], height: 56 },
    { group: top[0], height: 88 },
    { group: top[2], height: 36 },
  ];

  return (
    <div className="grid grid-cols-3 items-end gap-3 pt-1">
      {order.map(({ group, height }, i) => (
        <PodiumStep key={i} group={group} height={height} />
      ))}
    </div>
  );
}

function PodiumStep({
  group,
  height,
}: {
  group: PodiumGroup;
  height: number;
}) {
  if (group.airlines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="h-[64px]" aria-hidden />
        <div
          style={{ height }}
          className="w-full rounded-t-lg bg-white/[0.02] ring-1 ring-inset ring-white/[0.04]"
        />
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-2xl font-semibold tabular-nums text-zinc-100">
          {group.count}
        </span>
        <div className="flex items-center gap-1.5">
          {group.airlines.map((airline) => {
            const { url, scale } = airlineLogoUrl(airline.code);
            return url ? (
              <img
                key={airline.code}
                src={url}
                alt={`${airline.name ?? airline.code} logo`}
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 object-contain"
                style={
                  scale !== 1
                    ? { transform: `scale(${scale})` }
                    : undefined
                }
              />
            ) : (
              <span
                key={airline.code}
                className="inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-md bg-white/[0.06] px-1.5 font-mono text-xs font-semibold tabular-nums text-zinc-300 ring-1 ring-inset ring-white/[0.08]"
              >
                {airline.code}
              </span>
            );
          })}
        </div>
      </div>
      <div
        style={{ height }}
        className="w-full rounded-t-lg bg-gradient-to-b from-white/[0.08] to-white/[0.025] ring-1 ring-inset ring-white/10"
      />
    </div>
  );
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function RecordCard({
  kind,
  entry,
}: {
  kind: string;
  entry: { flight: StoredFlight; miles: number };
}) {
  const f = entry.flight.result;
  return (
    <section className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5 shadow-[inset_0_1px_0_rgb(255_255_255_/0.04)] backdrop-blur-sm transition-colors duration-300 ease-out hover:border-white/[0.12] hover:bg-white/[0.04]">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {kind}
        </div>
        <div className="text-xs tabular-nums text-[var(--accent)]">
          {entry.miles.toLocaleString(undefined, { maximumFractionDigits: 0 })} mi
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="text-3xl font-semibold tracking-tight text-zinc-100 tabular-nums">
          {f.departure.iata ?? "—"}
        </div>
        <div className="relative flex flex-1 items-center justify-center">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <span aria-hidden className="absolute text-zinc-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1L15 22v-1.5L13 19v-5.5z" />
            </svg>
          </span>
        </div>
        <div className="text-3xl font-semibold tracking-tight text-zinc-100 tabular-nums">
          {f.arrival.iata ?? "—"}
        </div>
      </div>
      <div className="mt-3 font-mono text-xs text-zinc-500 tabular-nums">
        {f.flightNumber} · {f.date}
      </div>
    </section>
  );
}

function Empty() {
  return <div className="text-sm text-neutral-500">No data yet.</div>;
}

function getMostRecentYear(flights: StoredFlight[]): number {
  const years = flights
    .map((f) => new Date(f.date).getUTCFullYear())
    .filter((y) => !Number.isNaN(y));
  return years.length > 0
    ? Math.max(...years)
    : new Date().getUTCFullYear();
}

const COUNTRY_TO_ISO: Record<string, string> = {
  "United States": "US",
  "United Kingdom": "GB",
  Canada: "CA",
  Mexico: "MX",
  Germany: "DE",
  France: "FR",
  Spain: "ES",
  Italy: "IT",
  Portugal: "PT",
  Netherlands: "NL",
  Belgium: "BE",
  Switzerland: "CH",
  Austria: "AT",
  Sweden: "SE",
  Norway: "NO",
  Denmark: "DK",
  Finland: "FI",
  Iceland: "IS",
  Ireland: "IE",
  Greece: "GR",
  Poland: "PL",
  "Czech Republic": "CZ",
  Hungary: "HU",
  Russia: "RU",
  Turkey: "TR",
  "United Arab Emirates": "AE",
  Qatar: "QA",
  "Saudi Arabia": "SA",
  Israel: "IL",
  Egypt: "EG",
  Morocco: "MA",
  "South Africa": "ZA",
  Kenya: "KE",
  India: "IN",
  Pakistan: "PK",
  China: "CN",
  Japan: "JP",
  "South Korea": "KR",
  "Hong Kong": "HK",
  Taiwan: "TW",
  Singapore: "SG",
  Thailand: "TH",
  Vietnam: "VN",
  Malaysia: "MY",
  Indonesia: "ID",
  Philippines: "PH",
  Australia: "AU",
  "New Zealand": "NZ",
  Brazil: "BR",
  Argentina: "AR",
  Chile: "CL",
  Peru: "PE",
  Colombia: "CO",
};

function countryFlag(name: string): string | null {
  const iso = COUNTRY_TO_ISO[name];
  if (!iso) return null;
  const base = 0x1f1e6 - "A".charCodeAt(0);
  return iso
    .split("")
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + base))
    .join("");
}
