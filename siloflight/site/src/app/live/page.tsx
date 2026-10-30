import LiveGlobe from "../_components/LiveGlobe";
import AnimateIn from "../_components/AnimateIn";

export const metadata = {
  title: "Live · SiloFlight",
  description: "Real-time view of aircraft currently airborne worldwide.",
};

export default function LivePage() {
  return (
    <div className="page-accent flex flex-1 flex-col px-4 pt-6 pb-20 sm:px-6 sm:pt-8 lg:px-20 lg:pt-10 lg:pb-12 xl:px-28">
      <div className="mx-auto w-full max-w-5xl">
        <AnimateIn>
          <header className="mb-5 flex items-baseline justify-between sm:mb-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl lg:text-4xl">
                Live
              </h1>
              <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                Every aircraft transmitting ADS-B right now. Click any to inspect.
              </p>
            </div>
          </header>
        </AnimateIn>
        <AnimateIn delay={0.15}>
          <LiveGlobe />
        </AnimateIn>
      </div>
    </div>
  );
}
