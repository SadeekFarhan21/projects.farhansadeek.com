"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import type { GlobeMethods } from "react-globe.gl";

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

type Coords = { lat: number; lon: number };

type CountryGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };
type CountryFeature = { type: "Feature"; geometry: CountryGeometry };
type CountryGeoJson = { features: CountryFeature[] };

function makeGlobeMaterial(): THREE.Material {
  return new THREE.MeshPhongMaterial({
    color: new THREE.Color("#0d0d10"),
    emissive: new THREE.Color("#0a0a0d"),
    emissiveIntensity: 0.6,
    shininess: 2,
  });
}

const ARC_COLOR = "#9fc7ff";
const ATMOSPHERE_COLOR = "#9fc7ff";

export default function FlightGlobe({
  departure,
  arrival,
  departureLabel,
  arrivalLabel,
}: {
  departure: Coords;
  arrival: Coords;
  departureLabel: string;
  arrivalLabel: string;
}) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 480 });
  const [ready, setReady] = useState(false);
  const [countries, setCountries] = useState<CountryFeature[] | null>(null);

  const globeMaterial = useMemo(() => makeGlobeMaterial(), []);

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

  useEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        setSize({ w, h: Math.max(360, Math.round(w * 0.7)) });
      }
    });
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const g = globeRef.current;
    if (!g || !ready) return;
    const controls = g.controls() as unknown as {
      autoRotate: boolean;
      enableZoom: boolean;
    };
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.autoRotate = false;
    controls.enableZoom = true;

    const toRad = (d: number) => (d * Math.PI) / 180;
    const toDeg = (r: number) => (r * 180) / Math.PI;
    const phi1 = toRad(departure.lat);
    const phi2 = toRad(arrival.lat);
    const lam1 = toRad(departure.lon);
    const lam2 = toRad(arrival.lon);
    const x = Math.cos(phi1) * Math.cos(lam1) + Math.cos(phi2) * Math.cos(lam2);
    const y = Math.cos(phi1) * Math.sin(lam1) + Math.cos(phi2) * Math.sin(lam2);
    const z = Math.sin(phi1) + Math.sin(phi2);
    const midLat = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)));
    const midLng = toDeg(Math.atan2(y, x));
    const dPhi = phi2 - phi1;
    const dLam = lam2 - lam1;
    const h =
      Math.sin(dPhi / 2) ** 2 +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
    const angDist = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    const altitude = Math.min(4, 1.6 + 2.6 * Math.sin(angDist / 2));
    g.pointOfView(
      { lat: midLat, lng: midLng, altitude },
      reducedMotion ? 0 : 1200,
    );
  }, [departure.lat, departure.lon, arrival.lat, arrival.lon, ready]);

  const arcs = useMemo(
    () => [
      {
        startLat: departure.lat,
        startLng: departure.lon,
        endLat: arrival.lat,
        endLng: arrival.lon,
      },
    ],
    [departure.lat, departure.lon, arrival.lat, arrival.lon],
  );
  const labels = useMemo(
    () => [
      {
        lat: departure.lat,
        lng: departure.lon,
        text: departureLabel,
      },
      {
        lat: arrival.lat,
        lng: arrival.lon,
        text: arrivalLabel,
      },
    ],
    [
      departure.lat,
      departure.lon,
      arrival.lat,
      arrival.lon,
      departureLabel,
      arrivalLabel,
    ],
  );

  return (
    <div
      ref={wrapperRef}
      className="relative overflow-hidden rounded-3xl border border-white/5 bg-[#0d0d10] shadow-[0_0_60px_rgba(159,199,255,0.06)_inset]"
      style={{ aspectRatio: "10 / 7" }}
    >
      {!ready && (
        <div
          className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500"
          role="status"
          aria-live="polite"
        >
          Loading globe…
        </div>
      )}
      <div style={{ display: ready ? "block" : "none" }}>
        <Globe
          ref={globeRef}
          width={size.w}
          height={size.h}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={globeMaterial}
          showAtmosphere
          onGlobeReady={() => setReady(true)}
          atmosphereColor={ATMOSPHERE_COLOR}
          atmosphereAltitude={0.16}
          polygonsData={countries ?? []}
          polygonAltitude={0.006}
          polygonCapColor={() => "rgba(255,255,255,0.07)"}
          polygonSideColor={() => "rgba(0,0,0,0)"}
          polygonStrokeColor={() => "rgba(255,255,255,0.22)"}
          arcsData={arcs}
          arcColor={() => ARC_COLOR}
          arcStroke={0.45}
          arcAltitudeAutoScale={0.25}
          arcDashLength={1}
          arcDashGap={0}
          labelsData={labels}
          labelLat="lat"
          labelLng="lng"
          labelText="text"
          labelSize={0.5}
          labelDotRadius={0.32}
          labelColor={() => "#e4e4e7"}
          labelResolution={2}
          labelAltitude={0.012}
        />
      </div>
    </div>
  );
}
