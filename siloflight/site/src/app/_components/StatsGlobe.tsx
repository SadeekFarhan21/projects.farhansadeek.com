"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import type { GlobeMethods } from "react-globe.gl";
import type { RouteSegment, AirportPoint } from "@/lib/stats";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full w-full items-center justify-center text-sm text-zinc-500"
      role="status"
      aria-live="polite"
    >
      Loading globe…
    </div>
  ),
});

const ATMOSPHERE = "#9fc7ff";

// Arc colors range from a faded accent (older flights) to a saturated accent
// (recent flights). Stays within the single-accent palette — no stray hues.
const COOL_ARC = ["rgba(159,199,255,0.35)", "rgba(190,217,255,0.35)"];
const WARM_ARC = ["rgba(159,199,255,0.95)", "rgba(126,177,255,0.95)"];

function mixArcColor(recency: number): [string, string] {
  // Linear blend between COOL and WARM based on 0..1 recency.
  const blend = (a: string, b: string, t: number) => {
    const am = a.match(/[\d.]+/g)!.map(Number);
    const bm = b.match(/[\d.]+/g)!.map(Number);
    const out = am.map((v, i) => v + (bm[i] - v) * t);
    return `rgba(${out[0].toFixed(0)},${out[1].toFixed(0)},${out[2].toFixed(0)},${out[3].toFixed(2)})`;
  };
  return [
    blend(COOL_ARC[0], WARM_ARC[0], recency),
    blend(COOL_ARC[1], WARM_ARC[1], recency),
  ];
}

// Country GeoJSON shape — only the bits we need.
type CountryGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };
type CountryFeature = { type: "Feature"; geometry: CountryGeometry };
type CountryGeoJson = { features: CountryFeature[] };

// Plain dark sphere material — no satellite texture. We layer country
// landmasses on top via polygonsData.
function makeGlobeMaterial(): THREE.Material {
  return new THREE.MeshPhongMaterial({
    color: new THREE.Color("#0d0d10"),
    emissive: new THREE.Color("#0a0a0d"),
    emissiveIntensity: 0.6,
    shininess: 2,
  });
}

export default function StatsGlobe({
  segments,
  points,
}: {
  segments: RouteSegment[];
  points: AirportPoint[];
}) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 520 });
  const [ready, setReady] = useState(false);
  const [countries, setCountries] = useState<CountryFeature[] | null>(null);

  // Memoize the material so we don't re-allocate every render.
  const globeMaterial = useMemo(() => makeGlobeMaterial(), []);

  // Load country outlines once.
  useEffect(() => {
    let cancelled = false;
    fetch("/countries.geojson")
      .then((r) => r.json() as Promise<CountryGeoJson>)
      .then((g) => {
        if (!cancelled) setCountries(g.features);
      })
      .catch(() => {
        if (!cancelled) setCountries([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Scale+fade the globe stage in when it becomes ready.
  useEffect(() => {
    if (!ready) return;
    const stage = stageRef.current;
    if (!stage) return;
    if (prefersReducedMotion()) {
      gsap.set(stage, { opacity: 1, scale: 1 });
      return;
    }
    gsap.fromTo(
      stage,
      { opacity: 0, scale: 0.94 },
      {
        opacity: 1,
        scale: 1,
        duration: 1.1,
        ease: "power3.out",
        clearProps: "transform",
      },
    );
  }, [ready]);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        const h = Math.floor(entry.contentRect.height);
        setSize({ w, h: Math.max(360, h) });
      }
    });
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  // Auto-rotate + frame on the airport centroid.
  useEffect(() => {
    const g = globeRef.current;
    if (!g || !ready) return;
    const controls = g.controls() as unknown as {
      autoRotate: boolean;
      autoRotateSpeed: number;
      enableZoom: boolean;
    };
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.autoRotate = !reducedMotion;
    controls.autoRotateSpeed = 0.3;
    controls.enableZoom = true;

    if (points.length > 0) {
      let x = 0,
        y = 0,
        z = 0;
      for (const p of points) {
        const phi = (p.lat * Math.PI) / 180;
        const lam = (p.lon * Math.PI) / 180;
        x += Math.cos(phi) * Math.cos(lam);
        y += Math.cos(phi) * Math.sin(lam);
        z += Math.sin(phi);
      }
      const rawLat = (Math.atan2(z, Math.sqrt(x * x + y * y)) * 180) / Math.PI;
      const lng = (Math.atan2(y, x) * 180) / Math.PI;
      const lat = Math.max(-55, Math.min(55, rawLat));
      g.pointOfView({ lat, lng, altitude: 2.6 }, reducedMotion ? 0 : 1400);
    } else {
      g.pointOfView({ lat: 30, lng: -20, altitude: 2.6 }, 0);
    }
  }, [ready, points]);

  const arcs = useMemo(() => {
    if (segments.length === 0) return [];
    const times = segments.map((s) => Date.parse(s.lastFlownAt) || 0);
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    const span = Math.max(maxT - minT, 1);
    const maxCount = Math.max(...segments.map((s) => s.count));
    return segments.map((s, i) => {
      const recency = (times[i] - minT) / span; // 0 = oldest, 1 = newest
      const weight = Math.min(1, s.count / Math.max(maxCount, 1));
      return {
        startLat: s.fromLat,
        startLng: s.fromLon,
        endLat: s.toLat,
        endLng: s.toLon,
        color: mixArcColor(recency),
        stroke: 0.3 + weight * 0.7,
        label: `${s.from} → ${s.to} · ${s.miles.toLocaleString()} mi${
          s.count > 1 ? ` · flown ${s.count}×` : ""
        }`,
      };
    });
  }, [segments]);

  const labels = useMemo(
    () =>
      points.map((p) => ({
        lat: p.lat,
        lng: p.lon,
        text: p.code,
        tip: `${p.code}${p.city ? ` · ${p.city}` : ""} · ${p.count} flight${p.count === 1 ? "" : "s"}`,
      })),
    [points],
  );

  return (
    <div
      ref={wrapperRef}
      className="relative h-full w-full overflow-hidden rounded-2xl border border-white/5 bg-[#0d0d10]"
      style={{ minHeight: 360 }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(50rem 30rem at 50% 50%, rgba(159,199,255,0.06), transparent 70%)",
        }}
      />
      {!ready && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center text-sm text-zinc-500"
          role="status"
          aria-live="polite"
        >
          Loading globe…
        </div>
      )}
      <div
        ref={stageRef}
        className="relative z-10"
        style={{
          display: ready ? "block" : "none",
          opacity: ready ? undefined : 0,
          transformOrigin: "center center",
        }}
      >
        <Globe
          ref={globeRef}
          width={size.w}
          height={size.h}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={globeMaterial}
          showAtmosphere
          atmosphereColor={ATMOSPHERE}
          atmosphereAltitude={0.16}
          onGlobeReady={() => setReady(true)}
          /* Country landmasses traced from /countries.geojson */
          polygonsData={countries ?? []}
          polygonAltitude={0.006}
          polygonCapColor={() => "rgba(255,255,255,0.07)"}
          polygonSideColor={() => "rgba(0,0,0,0)"}
          polygonStrokeColor={() => "rgba(255,255,255,0.22)"}
          /* Routes */
          arcsData={arcs}
          arcColor="color"
          arcStroke="stroke"
          arcAltitudeAutoScale={0.32}
          arcDashLength={1}
          arcDashGap={0}
          arcLabel="label"
          /* Airport labels */
          labelsData={labels}
          labelLat="lat"
          labelLng="lng"
          labelText="text"
          labelSize={0.5}
          labelDotRadius={0.32}
          labelColor={() => "#e4e4e7"}
          labelResolution={2}
          labelAltitude={0.012}
          labelLabel="tip"
        />
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-md border border-white/10 bg-black/60 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400 backdrop-blur">
        Drag · scroll to zoom
      </div>
    </div>
  );
}
