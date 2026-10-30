"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Nebula3DCanvas = dynamic(() => import("./Nebula3DCanvas"), {
  ssr: false,
  loading: () => null,
});

function supportsWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function Nebula3D({ className = "" }: { className?: string }) {
  const [enable, setEnable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    if (!supportsWebGL()) return;
    // crude perf gate: ignore on 4-or-fewer cores AND coarse pointer (low-end mobile)
    const cores = navigator.hardwareConcurrency || 8;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (cores <= 4 && coarse) return;
    setEnable(true);
  }, []);

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className}`}
    >
      {enable ? (
        <Nebula3DCanvas />
      ) : (
        <div className="absolute inset-0 mesh-aura" />
      )}
    </div>
  );
}
