import Link from "next/link";
import { getSessionAndFlights } from "@/lib/server-flights";
import FlightCardRow from "../_components/FlightCardRow";
import AddFlightFab from "../_components/AddFlightFab";
import SignInPrompt from "../_components/SignInPrompt";
import AnimateIn from "../_components/AnimateIn";
import TiltCard from "../_components/TiltCard";
import CountUp from "../_components/CountUp";

export default async function FlightsPage() {
  const { session, flights, dbReady, error } = await getSessionAndFlights();

  return (
    <div className="page-accent flex flex-1 flex-col px-4 pt-6 pb-24 sm:px-6 sm:pt-8 lg:px-20 lg:pt-10 lg:pb-16 xl:px-28">
      <header className="mb-5 flex items-baseline justify-between sm:mb-6 lg:mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl lg:text-4xl">
          Flights
        </h1>
        <span className="font-mono text-[11px] text-zinc-500 tabular-nums sm:text-xs">
          <CountUp value={flights.length} duration={1.1} scrollReplay={false} />
          {" "}
          {flights.length === 1 ? "flight" : "flights"}
        </span>
      </header>

      {!dbReady && (
        <div className="mb-6 rounded-2xl border border-neutral-700 bg-neutral-900 p-4 text-sm text-neutral-200">
          Database not configured yet. Set <code className="font-mono">DATABASE_URL</code> in{" "}
          <code className="font-mono">.env.local</code> to start saving flights to your account.
          Until then lookups still work but aren&apos;t persisted.
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-rose-900/40 bg-rose-950/30 p-4 text-sm text-rose-200"
        >
          {error}
        </div>
      )}
      {dbReady && !session?.user && <SignInPrompt />}

      {flights.length === 0 && session?.user && !error && <EmptyState />}

      <AnimateIn
        as="ul"
        stagger={0.07}
        whenVisible
        y={28}
        duration={0.7}
        className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-2"
      >
        {flights.map((f) => (
          <li key={f.id}>
            <TiltCard max={4} lift={6} className="h-full">
              <Link
                href={`/flights/${f.id}`}
                aria-label={`View flight ${f.flightNumber}`}
                className="block rounded-2xl active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                <FlightCardRow flight={f} />
              </Link>
            </TiltCard>
          </li>
        ))}
      </AnimateIn>

      <AddFlightFab />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center text-sm text-neutral-400">
      <div aria-hidden className="mb-3 text-3xl">✈</div>
      <p className="text-neutral-300">No flights logged yet.</p>
      <p className="mt-1">
        Tap the <span className="font-semibold text-neutral-200">+</span> button
        and search a flight number like{" "}
        <code className="font-mono text-neutral-300">AA100</code> — we&apos;ll
        fill in the details automatically.
      </p>
    </div>
  );
}
