import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionAndFlights } from "@/lib/server-flights";
import {
  computeStats,
  aroundTheWorld,
  formatHoursMinutes,
  type StoredFlight,
} from "@/lib/stats";
import SignInPrompt from "../../_components/SignInPrompt";
import StatsGlobe from "../../_components/StatsGlobe";
import AirportsDonut from "../../_components/AirportsDonut";
import FlightCalendar from "../../_components/FlightCalendar";
import AnimateIn from "../../_components/AnimateIn";
import CountUp from "../../_components/CountUp";

export default async function WrappedPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearStr } = await params;
  const year = Number(yearStr);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) notFound();

  const { session, flights, dbReady, error } = await getSessionAndFlights();

  if (!dbReady) {
    return (
      <Shell year={year}>
        <Notice>
          Database not configured yet. Set <code className="font-mono">DATABASE_URL</code>{" "}
          in <code className="font-mono">.env.local</code> to view your year.
        </Notice>
      </Shell>
    );
  }
  if (error) {
    return (
      <Shell year={year}>
        <Notice>{error}</Notice>
      </Shell>
    );
  }
  if (!session?.user) {
    return (
      <Shell year={year}>
        <SignInPrompt />
      </Shell>
    );
  }

  const inYear = flights.filter(
    (f) => new Date(f.date).getUTCFullYear() === year,
  );

  if (inYear.length === 0) {
    return (
      <Shell year={year}>
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
          <div aria-hidden className="mb-3 text-4xl">✈︎</div>
          <p className="text-base font-medium text-neutral-200">
            No flights in {year} yet
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Log a flight from the Flights tab and your year will fill in.
          </p>
        </div>
      </Shell>
    );
  }

  const stats = computeStats(inYear);
  const longestRoute = stats.topRoutes[0];
  const topAirline = stats.topAirlines[0];
  const earthLaps = aroundTheWorld(stats.totalMiles);

  return (
    <Shell year={year}>
      <Panel>
        <Eyebrow>Your year in flights</Eyebrow>
        <Headline>{year}</Headline>
        <p className="mt-3 text-sm text-zinc-400 sm:text-base">
          A look at every place you went and every mile you covered.
        </p>
      </Panel>

      <Panel accent="primary">
        <Eyebrow>You flew</Eyebrow>
        <Hero>
          <CountUp value={stats.totalFlights} duration={1.4} />
        </Hero>
        <Sub>
          flight{stats.totalFlights === 1 ? "" : "s"} this year
        </Sub>
      </Panel>

      <Panel accent="secondary">
        <Eyebrow>Distance covered</Eyebrow>
        <Hero>
          <CountUp value={stats.totalMiles} duration={1.6} /> mi
        </Hero>
        <Sub>
          {earthLaps >= 0.1
            ? `${earthLaps.toFixed(2)}× around the world`
            : "the start of something bigger"}
        </Sub>
      </Panel>

      <Panel accent="tertiary">
        <Eyebrow>Time in the air</Eyebrow>
        <Hero>{formatHoursMinutes(stats.totalAirMinutes)}</Hero>
        <Sub>
          {(stats.totalAirMinutes / 60 / 24).toFixed(1)} days airborne
        </Sub>
      </Panel>

      <AnimateIn whenVisible>
        <Card>
          <Eyebrow>Calendar</Eyebrow>
          <FlightCalendar flights={inYear} year={year} />
        </Card>
      </AnimateIn>

      <AnimateIn whenVisible className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {topAirline ? (
          <Card>
            <Eyebrow>Top airline</Eyebrow>
            <div className="mt-3 flex items-center gap-3">
              <span className="inline-flex h-9 min-w-[2.5rem] items-center justify-center rounded-md bg-white/10 px-2 text-sm font-semibold tabular-nums text-white ring-1 ring-inset ring-white/15">
                {topAirline.code}
              </span>
              <div className="min-w-0">
                <div className="truncate text-lg font-medium text-zinc-50">
                  {topAirline.name ?? topAirline.code}
                </div>
                <div className="text-xs text-zinc-500 tabular-nums">
                  {topAirline.count} flight
                  {topAirline.count === 1 ? "" : "s"}
                </div>
              </div>
            </div>
          </Card>
        ) : null}
        {longestRoute ? (
          <Card>
            <Eyebrow>Most flown route</Eyebrow>
            <div className="mt-3 text-2xl font-semibold tabular-nums text-zinc-50">
              {longestRoute.route.replace("-", " → ")}
            </div>
            <div className="mt-1 text-xs text-zinc-500 tabular-nums">
              {longestRoute.count} time{longestRoute.count === 1 ? "" : "s"}
            </div>
          </Card>
        ) : null}
      </AnimateIn>

      {stats.topAirports.length > 0 && (
        <AnimateIn whenVisible>
          <Card>
            <Eyebrow>Top airports</Eyebrow>
            <div className="mt-4">
              <AirportsDonut data={stats.topAirports} />
            </div>
          </Card>
        </AnimateIn>
      )}

      <AnimateIn whenVisible>
        <Card>
          <div className="flex items-baseline justify-between gap-2">
            <Eyebrow>Where you went</Eyebrow>
            <span className="text-[11px] tabular-nums text-zinc-500">
              {stats.airportPoints.length} airports · {stats.routeSegments.length} routes
            </span>
          </div>
          <div className="mt-4 h-[480px] overflow-hidden rounded-xl">
            <StatsGlobe
              segments={stats.routeSegments}
              points={stats.airportPoints}
            />
          </div>
        </Card>
      </AnimateIn>

      {stats.longest ? (
        <AnimateIn whenVisible>
          <Card>
            <Eyebrow>Longest flight</Eyebrow>
            <RecordRow flight={stats.longest.flight} miles={stats.longest.miles} />
          </Card>
        </AnimateIn>
      ) : null}

      <Footer year={year} />
    </Shell>
  );
}

function Shell({
  year,
  children,
}: {
  year: number;
  children: React.ReactNode;
}) {
  return (
    <div className="page-accent flex flex-1 flex-col px-4 pt-6 pb-20 text-neutral-50 sm:px-6 sm:pt-10 lg:px-20 lg:pt-12 xl:px-28">
      <div className="mx-auto w-full max-w-3xl space-y-6 sm:space-y-8">
        <header className="flex items-baseline justify-between">
          <Link
            href="/statistics"
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            ← Back to stats
          </Link>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
            Wrapped · {year}
          </span>
        </header>
        {children}
      </div>
    </div>
  );
}

function Panel({
  accent,
  children,
}: {
  accent?: "primary" | "secondary" | "tertiary";
  children: React.ReactNode;
}) {
  // Three tints of the single sky accent (#9fc7ff). The differentiation comes
  // from the panel's headline number, not from introducing stray hues.
  const accentBg: Record<string, string> = {
    primary: "from-[rgba(159,199,255,0.10)] via-transparent to-transparent",
    secondary: "from-[rgba(190,217,255,0.08)] via-transparent to-transparent",
    tertiary: "from-[rgba(126,177,255,0.08)] via-transparent to-transparent",
  };
  return (
    <AnimateIn whenVisible>
      <section
        className={`relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-8 shadow-[inset_0_1px_0_rgb(255_255_255_/0.04)] backdrop-blur-sm sm:p-12 ${
          accent ? `bg-gradient-to-br ${accentBg[accent]}` : ""
        }`}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
        />
        {children}
      </section>
    </AnimateIn>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.025] p-5 shadow-[inset_0_1px_0_rgb(255_255_255_/0.04)] backdrop-blur-sm">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />
      {children}
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
      {children}
    </span>
  );
}

function Headline({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 text-6xl font-semibold tracking-tight tabular-nums text-zinc-50 sm:text-7xl md:text-8xl">
      {children}
    </div>
  );
}

function Hero({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 text-5xl font-semibold tracking-tight tabular-nums text-zinc-50 sm:text-6xl md:text-7xl">
      {children}
    </div>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 text-sm text-zinc-500">{children}</div>;
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-700 bg-neutral-900 p-4 text-sm text-neutral-200">
      {children}
    </div>
  );
}

function RecordRow({
  flight,
  miles,
}: {
  flight: StoredFlight;
  miles: number;
}) {
  const f = flight.result;
  return (
    <Link
      href={`/flights/${flight.id}`}
      className="mt-3 block rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-3xl font-semibold tabular-nums text-zinc-50">
          {f.departure.iata ?? "—"}
        </div>
        <div className="relative flex flex-1 items-center justify-center">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        </div>
        <div className="text-3xl font-semibold tabular-nums text-zinc-50">
          {f.arrival.iata ?? "—"}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-zinc-500 tabular-nums">
        <span>{f.flightNumber} · {f.date}</span>
        <span>{miles.toLocaleString(undefined, { maximumFractionDigits: 0 })} mi</span>
      </div>
    </Link>
  );
}

function Footer({ year }: { year: number }) {
  return (
    <footer className="flex items-center justify-between gap-3 pt-8 text-xs text-zinc-500">
      <span>Wrapped {year}</span>
      <Link href="/statistics" className="hover:text-zinc-300">
        See full stats →
      </Link>
    </footer>
  );
}
