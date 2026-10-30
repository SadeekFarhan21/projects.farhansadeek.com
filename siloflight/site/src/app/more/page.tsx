import { auth } from "@/auth";
import { isDbConfigured } from "@/db";
import { signInWithGitHub, signOutAction } from "../actions";

export default async function MorePage() {
  const session = isDbConfigured() ? await auth() : null;
  return (
    <div className="page-accent flex flex-1 flex-col px-6 pt-8 pb-32 lg:px-20 lg:pt-10 lg:pb-16 xl:px-28">
      <div className="mx-auto w-full max-w-2xl space-y-4 lg:max-w-3xl lg:space-y-5">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100 lg:text-4xl">
          More
        </h1>

        <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 backdrop-blur-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Account
          </h2>
          {!isDbConfigured() ? (
            <p className="mt-3 text-sm text-neutral-500">
              Set <code>DATABASE_URL</code> in <code>.env.local</code> to enable
              accounts and per-user history.
            </p>
          ) : session?.user ? (
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {session.user.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt=""
                    className="h-10 w-10 rounded-full"
                  />
                )}
                <div>
                  <div className="font-medium text-neutral-50">
                    {session.user.name ?? "Signed in"}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {session.user.email}
                  </div>
                </div>
              </div>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-neutral-200 transition-colors hover:bg-white/10"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <form action={signInWithGitHub} className="mt-3">
              <button
                type="submit"
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
              >
                Continue with GitHub
              </button>
            </form>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 backdrop-blur-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            About
          </h2>
          <p className="mt-3 text-sm text-neutral-400">
            siloflight — personal flight log. Powered by FlightAware AeroAPI and
            AeroDataBox.
          </p>
        </section>
      </div>
    </div>
  );
}
