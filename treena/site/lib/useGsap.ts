"use client";
import { useEffect, useLayoutEffect, useRef, type DependencyList } from "react";
import { gsap } from "./gsap";

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function useGsap<T extends HTMLElement = HTMLElement>(
  factory: (ctx: gsap.Context, scope: T) => void,
  deps: DependencyList = [],
) {
  const ref = useRef<T | null>(null);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context((self) => factory(self, el), el);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
