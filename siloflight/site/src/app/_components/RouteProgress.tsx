"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import AirplaneIcon from "./AirplaneIcon";

/**
 * Animated flight progress line + plane glyph.
 * On scroll-into-view, the white gradient line + plane sweep from the origin
 * (left) toward the final `progress` percent (right) and stop.
 */
export default function RouteProgress({
  progress,
  duration = 1.6,
  delay = 0.1,
}: {
  progress: number;
  duration?: number;
  delay?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const fill = wrap.querySelector<HTMLElement>("[data-fill]");
      const plane = wrap.querySelector<HTMLElement>("[data-plane]");
      if (!fill || !plane) return;

      // The plane must never overshoot the path. At p=0 its tail (left edge)
      // sits on the path start; at p=100 its nose (right edge) sits on the path
      // end. So we offset `left` by `p * planeWidth / 100` so the plane is
      // pinned inside the [0, parentWidth - planeWidth] range.
      const positionPlane = (p: number) => {
        const planeWidth = plane.offsetWidth || 16;
        plane.style.left = `calc(${p}% - ${(p * planeWidth) / 100}px)`;
      };

      if (prefersReducedMotion()) {
        fill.style.width = `${progress}%`;
        positionPlane(progress);
        return;
      }

      // Start at the origin (tail on the path's left edge), faded out.
      gsap.set(fill, { width: "0%" });
      gsap.set(plane, { autoAlpha: 0 });
      positionPlane(0);

      const obj = { p: 0 };
      const animate = () => {
        // Fade the plane in as it leaves the origin, then sweep both to `progress`.
        gsap.to(plane, {
          autoAlpha: 1,
          duration: 0.3,
          delay,
          ease: "power2.out",
        });
        gsap.to(obj, {
          p: progress,
          duration,
          delay,
          ease: "power2.inOut",
          overwrite: "auto",
          onUpdate: () => {
            fill.style.width = `${obj.p}%`;
            positionPlane(obj.p);
          },
        });
      };

      const trigger = ScrollTrigger.create({
        trigger: wrap,
        start: "top 92%",
        once: true,
        onEnter: animate,
      });

      // Keep the plane pinned correctly across breakpoint resizes (its width
      // changes from 16px to 24px at sm).
      const onResize = () => positionPlane(obj.p);
      window.addEventListener("resize", onResize);

      return () => {
        trigger.kill();
        window.removeEventListener("resize", onResize);
      };
    },
    { scope: wrapRef, dependencies: [progress, duration, delay] },
  );

  return (
    <div
      ref={wrapRef}
      className="relative mx-0 h-px w-full rounded-full bg-neutral-800 sm:h-[5px]"
    >
      <div
        data-fill
        className="absolute left-0 top-0 h-full rounded-full"
        style={{
          width: "0%",
          background:
            "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%)",
        }}
      />
      <span
        data-plane
        className="absolute top-1/2 block h-4 w-4 text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.55)] sm:h-6 sm:w-6 sm:drop-shadow-[0_0_5px_rgba(255,255,255,0.55)]"
        style={{
          left: 0,
          // Just vertical-center + the 45° heading rotation. Horizontal
          // positioning is handled in JS via `calc(p% - p*W/100)` so the plane
          // stays inside the path bounds: tail at the left edge when p=0,
          // nose at the right edge when p=100.
          transform: "translateY(-50%) rotate(45deg)",
          opacity: 0,
          willChange: "left, opacity",
        }}
      >
        <AirplaneIcon className="h-full w-full" />
      </span>
    </div>
  );
}
