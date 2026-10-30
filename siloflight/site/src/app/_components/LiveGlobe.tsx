"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import type { GlobeMethods } from "react-globe.gl";

const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
      Loading globe…
    </div>
  ),
});

// Country GeoJSON shape — only the bits we need.
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

type Aircraft = {
  id: string;
  callsign: string | null;
  country: string;
  lat: number;
  lng: number;
  altMeters: number | null;
  velocityMs: number | null;
  headingDeg: number | null;
  verticalRateMs: number | null;
  onGround: boolean;
};

type ApiResponse =
  | { ok: true; time: number; aircraft: Aircraft[]; cached?: boolean; stale?: boolean }
  | { ok: false; error: string };

const POLL_MS = 12_000;
const ATMOSPHERE = "#9fc7ff";

export default function LiveGlobe() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 600 });
  const [ready, setReady] = useState(false);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Aircraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState<CountryFeature[] | null>(null);

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

  useEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        const h = Math.floor(entry.contentRect.height);
        setSize({ w, h: Math.max(420, h) });
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
      autoRotateSpeed: number;
      enableZoom: boolean;
    };
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.25;
    controls.enableZoom = true;
    // Zoom out a bit so the globe doesn't dominate the viewport on mobile.
    g.pointOfView({ lat: 30, lng: -20, altitude: 2.9 }, 0);
  }, [ready]);

  useEffect(() => {
    const ctrl = new AbortController();
    let alive = true;
    async function tick() {
      try {
        const res = await fetch("/api/live/states", {
          signal: ctrl.signal,
          cache: "no-store",
        });
        const data = (await res.json()) as ApiResponse;
        if (!alive) return;
        if (!data.ok) {
          setError(data.error);
          return;
        }
        setAircraft(data.aircraft);
        setUpdatedAt(data.time);
        setError(null);
      } catch (e) {
        if (!alive || (e as { name?: string }).name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    }
    tick();
    const id = window.setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      ctrl.abort();
      window.clearInterval(id);
    };
  }, []);

  const points = useMemo(() => aircraft, [aircraft]);

  const lastUpdatedLabel = useMemo(() => {
    if (!updatedAt) return null;
    const d = new Date(updatedAt * 1000);
    return d.toLocaleTimeString();
  }, [updatedAt]);

  function spinToMyLocation() {
    if (!navigator.geolocation || !globeRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const g = globeRef.current;
        if (!g) return;
        const reducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        g.pointOfView(
          {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            altitude: 1.6,
          },
          reducedMotion ? 0 : 1500,
        );
      },
      () => {
        setError("Could not access your location.");
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-[var(--accent)] shadow-[0_0_8px_rgba(159,199,255,0.8)]" />
          <span className="font-medium text-zinc-200 tabular-nums">
            {loading && aircraft.length === 0
              ? "Loading live aircraft…"
              : `${aircraft.length.toLocaleString()} aircraft airborne`}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          {lastUpdatedLabel && (
            <span className="tabular-nums">Updated {lastUpdatedLabel}</span>
          )}
          <button
            type="button"
            onClick={spinToMyLocation}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            aria-label="Spin globe to your location"
          >
            <PinIcon /> Spin to me
          </button>
          <span className="hidden sm:inline">via OpenSky Network</span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <div
        ref={wrapperRef}
        className="relative h-[380px] overflow-hidden rounded-2xl border border-white/5 bg-[#0d0d10] shadow-[0_0_60px_rgba(159,199,255,0.06)_inset] sm:h-[480px] md:h-[600px] lg:h-[720px]"
      >
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">
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
            atmosphereColor={ATMOSPHERE}
            atmosphereAltitude={0.16}
            /* Country landmasses traced from /countries.geojson */
            polygonsData={countries ?? []}
            polygonAltitude={0.006}
            polygonCapColor={() => "rgba(255,255,255,0.07)"}
            polygonSideColor={() => "rgba(0,0,0,0)"}
            polygonStrokeColor={() => "rgba(255,255,255,0.22)"}
            pointsData={points}
            pointLat="lat"
            pointLng="lng"
            pointAltitude={0.005}
            pointRadius={0.18}
            pointColor={(d) =>
              colorForAltitude((d as { altMeters: number | null }).altMeters)
            }
            pointLabel={(d) => labelFor(d as Aircraft)}
            onPointClick={(d) => setSelected(d as Aircraft)}
          />
        </div>

        {selected && (
          <SelectedPanel
            aircraft={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 22s7-7.5 7-13a7 7 0 0 0-14 0c0 5.5 7 13 7 13z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

// Aircraft point colors stay within the single accent ramp — brighter dots =
// higher altitude, dimmer = lower. Keeps the live map visually consistent
// with the rest of the editorial palette instead of using categorical hues.
function colorForAltitude(alt: number | null): string {
  if (alt == null) return "#94a3b8"; // unknown — neutral
  if (alt < 1500) return "#5e93e6"; // taxi / approach (deepest accent)
  if (alt < 6000) return "#7eb1ff"; // climb / descent
  if (alt < 10500) return "#9fc7ff"; // cruising lower (base accent)
  return "#bcd6ff"; // high cruise (lightest accent)
}

function labelFor(a: Aircraft): string {
  const cs = a.callsign || a.id;
  const alt = a.altMeters != null ? `${Math.round(a.altMeters * 3.281)} ft` : "—";
  const spd =
    a.velocityMs != null ? `${Math.round(a.velocityMs * 1.94384)} kt` : "—";
  return `<div style="font-family:ui-sans-serif,system-ui;font-size:12px;line-height:1.35;background:rgba(6,8,13,0.92);color:#e4e4e7;padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);box-shadow:0 4px 24px rgba(0,0,0,0.4);">
    <div style="font-weight:600;color:#f4f4f5">${escapeHtml(cs)}</div>
    <div style="opacity:0.75;margin-top:2px">${escapeHtml(a.country || "—")}</div>
    <div style="opacity:0.75">${alt} · ${spd}</div>
  </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function SelectedPanel({
  aircraft,
  onClose,
}: {
  aircraft: Aircraft;
  onClose: () => void;
}) {
  const cs = aircraft.callsign || aircraft.id;
  const alt =
    aircraft.altMeters != null
      ? `${Math.round(aircraft.altMeters * 3.281).toLocaleString()} ft`
      : "—";
  const spd =
    aircraft.velocityMs != null
      ? `${Math.round(aircraft.velocityMs * 1.94384)} kt`
      : "—";
  const hdg =
    aircraft.headingDeg != null ? `${Math.round(aircraft.headingDeg)}°` : "—";
  const vs =
    aircraft.verticalRateMs != null
      ? `${(aircraft.verticalRateMs * 196.85).toFixed(0)} ft/min`
      : "—";

  return (
    <div className="absolute right-4 top-4 w-72 rounded-2xl border border-white/10 bg-[#06080d]/90 p-4 backdrop-blur shadow-2xl">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-base font-semibold text-zinc-50">{cs}</div>
          <div className="text-xs text-zinc-400">
            {aircraft.country || "Unknown registry"}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded-md p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <Row k="Altitude" v={alt} />
        <Row k="Ground spd" v={spd} />
        <Row k="Heading" v={hdg} />
        <Row k="V/S" v={vs} />
        <Row k="ICAO24" v={aircraft.id} mono />
        <Row k="Phase" v={aircraft.onGround ? "On ground" : "Airborne"} />
      </dl>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-zinc-500">{k}</dt>
      <dd
        className={
          mono
            ? "font-mono text-zinc-200 tabular-nums"
            : "text-zinc-200 tabular-nums"
        }
      >
        {v}
      </dd>
    </>
  );
}
