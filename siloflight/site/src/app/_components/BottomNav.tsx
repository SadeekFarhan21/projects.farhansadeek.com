"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";

const TABS: ReadonlyArray<{
  href: string;
  label: string;
  icon: () => React.JSX.Element;
}> = [
  { href: "/flights", label: "Flights", icon: GlobeIcon },
  { href: "/live", label: "Live", icon: PulseIcon },
  { href: "/statistics", label: "Statistics", icon: BarsIcon },
  { href: "/more", label: "More", icon: UserIcon },
];

export default function BottomNav() {
  const pathname = usePathname();
  const containerRef = useRef<HTMLUListElement | null>(null);
  const pillRef = useRef<HTMLSpanElement | null>(null);
  const initialPlacement = useRef(true);

  const activeIndex = TABS.findIndex(
    (t) => pathname === t.href || pathname.startsWith(`${t.href}/`),
  );

  // Position the pill before the first paint to avoid a flash from (0,0).
  useLayoutEffect(() => {
    const pill = pillRef.current;
    const container = containerRef.current;
    if (!pill || !container) return;
    if (activeIndex < 0) {
      gsap.set(pill, { autoAlpha: 0 });
      return;
    }
    const targets = container.querySelectorAll("[data-pill-target]");
    const target = targets[activeIndex] as HTMLElement | undefined;
    if (!target) return;
    const cRect = container.getBoundingClientRect();
    const tRect = target.getBoundingClientRect();
    gsap.set(pill, {
      x: tRect.left - cRect.left,
      y: tRect.top - cRect.top,
      width: tRect.width,
      height: tRect.height,
      autoAlpha: 1,
    });
  }, [activeIndex]);

  useGSAP(
    () => {
      const pill = pillRef.current;
      const container = containerRef.current;
      if (!pill || !container) return;
      if (activeIndex < 0) {
        gsap.to(pill, { autoAlpha: 0, duration: 0.2 });
        return;
      }
      const targets = container.querySelectorAll("[data-pill-target]");
      const target = targets[activeIndex] as HTMLElement | undefined;
      if (!target) return;

      const cRect = container.getBoundingClientRect();
      const tRect = target.getBoundingClientRect();
      const next = {
        x: tRect.left - cRect.left,
        y: tRect.top - cRect.top,
        width: tRect.width,
        height: tRect.height,
      };

      if (initialPlacement.current || prefersReducedMotion()) {
        initialPlacement.current = false;
        gsap.set(pill, next);
        return;
      }

      gsap.to(pill, {
        ...next,
        duration: 0.55,
        ease: "siloOut",
        overwrite: "auto",
      });
    },
    { scope: containerRef, dependencies: [activeIndex] },
  );

  return (
    <nav
      role="navigation"
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.06] bg-[var(--bg)]/90 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul
        ref={containerRef}
        className="relative mx-auto flex max-w-2xl items-stretch justify-around"
      >
        {/* Single pill that slides between active tabs. */}
        <span
          ref={pillRef}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 rounded-full bg-zinc-100"
          style={{
            opacity: 0,
            willChange: "transform, width, height",
          }}
        />
        {TABS.map((t, i) => {
          const active = i === activeIndex;
          return (
            <li key={t.href} className="relative z-[1] flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 px-2 py-3 text-xs transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--accent)] ${
                  active ? "text-zinc-100" : "text-zinc-500"
                }`}
              >
                <span
                  data-pill-target
                  className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 ${
                    active
                      ? "text-zinc-900"
                      : "bg-white/[0.04] text-zinc-400 ring-1 ring-inset ring-white/5"
                  }`}
                >
                  <t.icon />
                </span>
                <span className="font-medium">{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}
function BarsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 20V10M12 20V4M19 20v-7" />
    </svg>
  );
}
function PulseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l2-7 4 14 2-7h6" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}
