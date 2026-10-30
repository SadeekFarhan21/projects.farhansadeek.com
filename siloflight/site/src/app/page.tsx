import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isDbConfigured } from "@/db";
import AuthForm from "./_components/AuthForm";
import AnimateIn from "./_components/AnimateIn";
import Magnetic from "./_components/Magnetic";
import CursorGlow from "./_components/CursorGlow";
import TiltCard from "./_components/TiltCard";
import HeroGlobe from "./_components/HeroGlobeLazy";
import HeadlineReveal from "./_components/HeadlineReveal";
import IataMarquee from "./_components/IataMarquee";
import ScrollRouteShowcase from "./_components/ScrollRouteShowcase";
import LiveActivityTicker from "./_components/LiveActivityTicker";
import HowItWorks from "./_components/HowItWorks";
import SmoothScrollLink from "./_components/SmoothScrollLink";
import Parallax from "./_components/Parallax";
import { signInWithGitHub } from "./actions";

export default async function LandingPage() {
  const session = isDbConfigured() ? await auth() : null;
  if (session?.user) redirect("/flights");
  const githubConfigured =
    !!process.env.AUTH_GITHUB_ID && !!process.env.AUTH_GITHUB_SECRET;

  return (
    <div id="top" className="relative">
      <CursorGlow size={520} color="rgba(159, 199, 255, 0.14)" />

      {/* HERO */}
      <section className="relative w-full overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <HeroGlobe className="absolute inset-0 h-full w-full opacity-90" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(60rem 38rem at 50% 60%, rgba(13,13,16,0) 0%, rgba(13,13,16,0.55) 55%, rgba(13,13,16,0.92) 100%)",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-40"
            style={{
              background:
                "linear-gradient(to bottom, rgba(13,13,16,0), rgba(13,13,16,1))",
            }}
          />
        </div>

        <header className="relative z-10 flex items-center justify-between px-6 pt-6 lg:px-12 lg:pt-8">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <span className="text-lg font-semibold tracking-tight text-neutral-50">
              SiloFlight
            </span>
          </div>
          <form action={signInWithGitHub}>
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-neutral-100 transition-colors hover:bg-white/10"
            >
              Sign in
            </button>
          </form>
        </header>

        <main className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-6 pb-20 pt-10 text-center lg:grid-cols-[1.2fr_0.8fr] lg:gap-16 lg:px-12 lg:pt-16 lg:text-left">
          <div className="flex flex-col items-center lg:items-start">
            <AnimateIn delay={0.05} y={12}>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-medium text-neutral-200 backdrop-blur-sm">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-[rgba(159,199,255,0.55)]" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-[#9fc7ff]" />
                </span>
                Live ADS-B · 8,200 aircraft airborne now
              </div>
            </AnimateIn>

            <HeadlineReveal
              highlight="in one place."
              highlightClassName="text-[#bcd6ff] [text-shadow:0_0_30px_rgba(159,199,255,0.45)]"
              className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-neutral-50 sm:text-5xl lg:text-6xl"
              delay={0.15}
            >
              Your flight history,
            </HeadlineReveal>

            <AnimateIn delay={0.6} duration={0.7}>
              <p className="mt-5 max-w-xl text-base text-neutral-400 sm:text-lg">
                Log flights by number and date. SiloFlight pulls live data from
                FlightAware and AeroDataBox, then maps your routes, miles, and
                time in the air automatically.
              </p>
            </AnimateIn>

            <AnimateIn delay={0.75} duration={0.6} className="w-full">
              <div className="mt-8 flex w-full flex-col items-center gap-4 lg:items-start">
                <AuthForm />
                {githubConfigured && (
                  <>
                    <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-neutral-500">
                      <span className="h-px w-10 bg-white/10" />
                      or
                      <span className="h-px w-10 bg-white/10" />
                    </div>
                    <Magnetic strength={12}>
                      <form action={signInWithGitHub}>
                        <button
                          type="submit"
                          className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-neutral-100 transition-colors hover:bg-white/10"
                        >
                          <GithubIcon />
                          Continue with GitHub
                        </button>
                      </form>
                    </Magnetic>
                  </>
                )}
                <Link
                  href="/flights"
                  className="group inline-flex h-11 items-center gap-2 text-sm font-medium text-neutral-400 transition-colors hover:text-neutral-200"
                >
                  Browse without account
                  <ArrowIcon className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </AnimateIn>
          </div>

          <AnimateIn delay={0.9} duration={0.7} y={20} className="hidden lg:block">
            <LiveActivityTicker rows={4} intervalMs={2400} />
          </AnimateIn>
        </main>
      </section>

      {/* IATA MARQUEE */}
      <div className="relative z-10 border-y border-white/[0.05] bg-[var(--bg)]/60 py-5 backdrop-blur-sm">
        <IataMarquee speed={45} />
      </div>

      {/* MOBILE LIVE TICKER (lg+ ticker is in hero side-column) */}
      <section className="relative z-10 mx-auto w-full max-w-3xl px-6 pt-12 lg:hidden">
        <LiveActivityTicker rows={3} intervalMs={2400} />
      </section>

      {/* PINNED HORIZONTAL "HOW IT WORKS" */}
      <HowItWorks />

      {/* SCROLL-DRIVEN ROUTE SHOWCASE */}
      <ScrollRouteShowcase />

      {/* FEATURE GRID */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-24 lg:px-12 lg:py-32">
        <AnimateIn whenVisible y={18} duration={0.7}>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.5em] text-neutral-500">
            What it does
          </p>
        </AnimateIn>
        <AnimateIn whenVisible y={20} duration={0.8}>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-neutral-50 sm:text-4xl lg:text-5xl">
            One number. One date. The rest fills itself in.
          </h2>
        </AnimateIn>

        <AnimateIn
          as="div"
          stagger={0.1}
          whenVisible
          y={24}
          className="mt-12 grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-3"
        >
          <Feature
            icon={<PlaneIcon />}
            title="Auto-populated"
            body="Type a flight number and a date. Departure, arrival, gates, aircraft, and registration fill themselves in from FlightAware and AeroDataBox."
          />
          <Feature
            icon={<GlobeIcon />}
            title="Live globe"
            body="Watch every aircraft transmitting ADS-B in real time, anywhere on the planet — rendered on a photographic earth."
          />
          <Feature
            icon={<ChartIcon />}
            title="Personal stats"
            body="Total miles, hours airborne, top airports, top airlines, and a year-over-year breakdown — charted from your own log."
          />
        </AnimateIn>
      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-32 lg:px-12">
        <AnimateIn whenVisible y={20} duration={0.7}>
          <TiltCard max={4} lift={3}>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-10 text-center backdrop-blur-sm sm:p-14">
              <Parallax distance={-32} scrub={1} className="pointer-events-none absolute inset-0">
                <div
                  className="absolute inset-0 opacity-70"
                  style={{
                    background:
                      "radial-gradient(40rem 24rem at 50% 0%, rgba(159,199,255,0.12), transparent 60%)",
                  }}
                />
              </Parallax>
              <AnimateIn whenVisible y={14} duration={0.7}>
                <h3 className="relative text-2xl font-semibold tracking-tight text-neutral-50 sm:text-3xl">
                  Start logging in under a minute.
                </h3>
              </AnimateIn>
              <AnimateIn whenVisible y={10} duration={0.6} delay={0.08}>
                <p className="relative mt-3 text-sm text-neutral-400 sm:text-base">
                  Free, no card required. Your flight history stays yours.
                </p>
              </AnimateIn>
              <AnimateIn whenVisible y={12} duration={0.6} delay={0.16}>
                <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Magnetic strength={12}>
                    <SmoothScrollLink
                      to="#top"
                      className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-black shadow-lg shadow-black/40 transition-colors hover:bg-neutral-200"
                    >
                      Create account
                      <ArrowIcon />
                    </SmoothScrollLink>
                  </Magnetic>
                  <Link
                    href="/flights"
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-neutral-100 transition-colors hover:bg-white/10"
                  >
                    See the live globe
                  </Link>
                </div>
              </AnimateIn>
            </div>
          </TiltCard>
        </AnimateIn>
      </section>

      <Parallax distance={-24} scrub={1} as="section">
        <AnimateIn whenVisible y={12} duration={0.7}>
          <footer className="relative z-10 px-6 pb-8 text-center text-xs text-neutral-600 lg:px-12">
            Powered by FlightAware AeroAPI · OpenSky Network · AeroDataBox
          </footer>
        </AnimateIn>
      </Parallax>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <TiltCard max={5} lift={4} className="h-full">
      <div className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-6 backdrop-blur-sm transition-colors hover:bg-white/[0.05]">
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(20rem 12rem at 30% -10%, rgba(159,199,255,0.12), transparent 60%)",
          }}
        />
        <div className="relative mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-inset ring-white/20">
          {icon}
        </div>
        <h3 className="relative text-base font-semibold text-neutral-100">
          {title}
        </h3>
        <p className="relative mt-2 text-sm text-neutral-400">{body}</p>
      </div>
    </TiltCard>
  );
}

function BrandMark() {
  return (
    <span className="relative flex h-8 w-8 items-center justify-center">
      <span
        className="absolute inset-0 rounded-lg opacity-70 blur-md"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.2))",
        }}
      />
      <svg
        viewBox="0 0 32 32"
        width="28"
        height="28"
        className="relative drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]"
      >
        <defs>
          <linearGradient id="brand-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#d4d4d4" />
          </linearGradient>
        </defs>
        <path
          d="M23 9c-2-2-5-3-8-3-4 0-7 2-7 5 0 3 3 4 7 5 4 1 7 2 7 5 0 3-3 5-7 5-3 0-6-1-8-3"
          fill="none"
          stroke="url(#brand-grad)"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.05c-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.73-1.53-2.55-.29-5.24-1.27-5.24-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.15 1.17a10.96 10.96 0 0 1 5.72 0c2.19-1.48 3.15-1.17 3.15-1.17.62 1.57.23 2.73.11 3.02.74.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.36-5.25 5.65.41.35.78 1.05.78 2.12v3.14c0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
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

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M5 20V11M12 20V5M19 20v-6" />
    </svg>
  );
}
