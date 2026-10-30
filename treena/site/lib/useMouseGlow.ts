"use client";

import { useCallback, useRef } from "react";

/**
 * Cursor-following glow border helper. Pair with `.glow-border` from globals.css.
 * Spreads `--x` and `--y` (percent) onto the element so the radial gradient tracks the pointer.
 */
export function useMouseGlow<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T | null>(null);

  const onPointerMove = useCallback((e: React.PointerEvent<T>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--x", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--y", `${((e.clientY - r.top) / r.height) * 100}%`);
  }, []);

  return { ref, onPointerMove };
}
