"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type TopNavUser = {
  name: string | null;
  email: string | null;
  image: string | null;
} | null;

const NAV = [
  { href: "/flights", label: "Flights" },
  { href: "/live", label: "Live" },
  { href: "/statistics", label: "Statistics" },
  { href: "/more", label: "More" },
] as const;

export default function TopNav({ user }: { user: TopNavUser }) {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[var(--bg)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full items-center gap-6 px-6 lg:px-20 xl:px-28">
        <Link
          href="/flights"
          aria-label="SiloFlight home"
          className="flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900">
            <BrandIcon />
          </span>
          <span className="text-base font-semibold tracking-tight text-zinc-200">
            siloflight
          </span>
        </Link>
        <nav
          role="navigation"
          aria-label="Primary"
          className="hidden flex-1 items-center gap-1 md:flex"
        >
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                  active
                    ? "text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/more"
            aria-label="Profile"
            className="shrink-0 rounded-full transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            {user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name ? `${user.name}'s profile` : "Your profile"}
                className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10"
              />
            ) : user ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-neutral-200 ring-1 ring-white/10">
                {(user.name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
              </div>
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-neutral-300 ring-1 ring-white/10">
                <UserGlyph />
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

function BrandIcon() {
  // Top-down airliner silhouette with twin engine nacelles.
  return (
    <svg
      viewBox="0 0 32 32"
      width="22"
      height="22"
      fill="currentColor"
      aria-hidden
    >
      <path d="M16 2.5c-.72 0-1.3.55-1.36 1.27L14.18 11 3.55 16.27c-.36.18-.59.55-.59.95v1.13c0 .6.55 1.06 1.14.94l10.32-2.04.3 5.05-2.78 1.95c-.22.16-.35.41-.35.68v.55c0 .42.4.74.81.66l3.18-.6a1.65 1.65 0 0 1 .57 0l3.18.6c.41.08.81-.24.81-.66v-.55c0-.27-.13-.52-.35-.68l-2.78-1.95.3-5.05 10.32 2.04c.6.12 1.14-.34 1.14-.94v-1.13c0-.4-.23-.77-.59-.95L17.82 11l-.46-7.23c-.06-.72-.64-1.27-1.36-1.27z" />
      <ellipse cx="9.2" cy="16" rx="1.25" ry="1.85" />
      <ellipse cx="22.8" cy="16" rx="1.25" ry="1.85" />
    </svg>
  );
}

function UserGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="9" r="3.5" />
      <path d="M5 20c1.4-3.5 4.2-5 7-5s5.6 1.5 7 5" />
    </svg>
  );
}
