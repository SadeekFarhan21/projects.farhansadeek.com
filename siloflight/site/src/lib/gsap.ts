"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { SplitText } from "gsap/SplitText";
import { Observer } from "gsap/Observer";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";

// Register once. Safe to import multiple times — gsap dedupes plugin registration.
if (typeof window !== "undefined") {
  gsap.registerPlugin(
    ScrollTrigger,
    ScrollToPlugin,
    DrawSVGPlugin,
    MotionPathPlugin,
    SplitText,
    Observer,
    CustomEase,
    useGSAP,
  );

  // A few project-wide custom eases used across the site.
  if (!CustomEase.get("siloOut")) {
    CustomEase.create("siloOut", "M0,0 C0.16,0.6 0.22,1 1,1");
  }
  if (!CustomEase.get("siloInOut")) {
    CustomEase.create("siloInOut", "M0,0 C0.7,0 0.3,1 1,1");
  }
}

export {
  gsap,
  ScrollTrigger,
  ScrollToPlugin,
  DrawSVGPlugin,
  MotionPathPlugin,
  SplitText,
  Observer,
  CustomEase,
  useGSAP,
};

/** True when the user has requested reduced motion. Safe on the server (returns false). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** True when the device supports a fine-pointer hover (mouse, trackpad). */
export function hasFineHover(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}
