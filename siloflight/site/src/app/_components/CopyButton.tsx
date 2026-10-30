"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";

export default function CopyButton({
  value,
  label = "Copy",
  className = "",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLButtonElement | null>(null);

  // Animate the icon swap whenever `copied` flips.
  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const clip = root.querySelector("[data-icon-clip]");
      const check = root.querySelector("[data-icon-check]");
      if (!clip || !check) return;

      if (prefersReducedMotion()) {
        gsap.set(clip, { autoAlpha: copied ? 0 : 1 });
        gsap.set(check, { autoAlpha: copied ? 1 : 0 });
        return;
      }

      if (copied) {
        const tl = gsap.timeline();
        tl.to(clip, {
          autoAlpha: 0,
          scale: 0.7,
          rotate: -45,
          duration: 0.18,
          ease: "power2.in",
        });
        tl.fromTo(
          check,
          { autoAlpha: 0, scale: 0.4, rotate: 45 },
          {
            autoAlpha: 1,
            scale: 1,
            rotate: 0,
            duration: 0.5,
            ease: "back.out(2.4)",
          },
          "<0.05",
        );
        tl.to(
          root,
          { scale: 1.18, duration: 0.18, ease: "power2.out" },
          0,
        );
        tl.to(root, { scale: 1, duration: 0.4, ease: "elastic.out(1.1, 0.5)" });
      } else {
        const tl = gsap.timeline();
        tl.to(check, {
          autoAlpha: 0,
          scale: 0.7,
          rotate: -45,
          duration: 0.18,
          ease: "power2.in",
        });
        tl.fromTo(
          clip,
          { autoAlpha: 0, scale: 0.7, rotate: 45 },
          {
            autoAlpha: 1,
            scale: 1,
            rotate: 0,
            duration: 0.35,
            ease: "siloOut",
          },
          "<0.05",
        );
      }
    },
    { scope: ref, dependencies: [copied] },
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard unavailable (no HTTPS, no permission); silently fail.
    }
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={copy}
      aria-label={copied ? `Copied ${value}` : `Copy ${value}`}
      className={`relative inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition-colors hover:text-neutral-100 focus-visible:outline-none ${className}`}
    >
      <span
        data-icon-clip
        className="absolute inset-0 flex items-center justify-center"
      >
        <ClipIcon />
      </span>
      <span
        data-icon-check
        className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: 0 }}
      >
        <CheckIcon />
      </span>
      {label && !copied && <span className="sr-only">{label}</span>}
    </button>
  );
}

function ClipIcon() {
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
      aria-hidden
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="text-[var(--accent)]"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
