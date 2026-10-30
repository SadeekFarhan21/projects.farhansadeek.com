import { lookupAirport } from "./airports";
import type { FlightInfo } from "./flight";

export type StoredFlight = {
  id: string;
  flightNumber: string;
  date: string;
  lookedUpAt: Date | string;
  provider: string;
  result: FlightInfo;
};

export type RouteSegment = {
  from: string;
  to: string;
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  miles: number;
  count: number;
  lastFlownAt: string;
};

export type AirportPoint = {
  code: string;
  city: string | null;
  lat: number;
  lon: number;
  count: number;
};

export type Stats = {
  totalFlights: number;
  totalMiles: number;
  totalAirMinutes: number;
  longest: { flight: StoredFlight; miles: number } | null;
  shortest: { flight: StoredFlight; miles: number } | null;
  byYear: Array<{ year: number; count: number }>;
  topAirports: Array<{ code: string; count: number }>;
  topAirlines: Array<{ code: string; name: string | null; count: number }>;
  topCountries: Array<{ country: string; count: number }>;
  topRoutes: Array<{ route: string; count: number }>;
  routeSegments: RouteSegment[];
  airportPoints: AirportPoint[];
};

const EARTH_MILES = 24901;
const MOON_MILES = 238900;

export function aroundTheWorld(miles: number) {
  return miles / EARTH_MILES;
}
export function toMoon(miles: number) {
  return miles / MOON_MILES;
}

function haversineMiles(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function airMinutes(f: FlightInfo): number {
  const dep = f.departure.scheduled ?? f.departure.estimated;
  const arr = f.arrival.scheduled ?? f.arrival.estimated;
  if (!dep || !arr) return 0;
  const t = new Date(arr).getTime() - new Date(dep).getTime();
  return t > 0 ? Math.round(t / 60000) : 0;
}

function topN<T extends { count: number }>(items: T[], n: number): T[] {
  return [...items].sort((a, b) => b.count - a.count).slice(0, n);
}

export function computeStats(flights: StoredFlight[]): Stats {
  const airportCounts = new Map<string, number>();
  const airlineCounts = new Map<string, { name: string | null; count: number }>();
  const countryCounts = new Map<string, number>();
  const routeCounts = new Map<string, number>();
  const yearCounts = new Map<number, number>();
  const segmentMap = new Map<string, RouteSegment>();
  let totalMiles = 0;
  let totalAirMinutes = 0;
  let longest: Stats["longest"] = null;
  let shortest: Stats["shortest"] = null;

  for (const f of flights) {
    const fi = f.result;
    const dep = fi.departure.coordinates;
    const arr = fi.arrival.coordinates;
    const miles = dep && arr ? haversineMiles(dep, arr) : 0;
    totalMiles += miles;
    totalAirMinutes += airMinutes(fi);

    if (dep && arr && fi.departure.iata && fi.arrival.iata) {
      const a = fi.departure.iata.toUpperCase();
      const b = fi.arrival.iata.toUpperCase();
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      const existing = segmentMap.get(key);
      if (existing) {
        existing.count += 1;
        if (f.date > existing.lastFlownAt) existing.lastFlownAt = f.date;
      } else {
        segmentMap.set(key, {
          from: fi.departure.iata,
          to: fi.arrival.iata,
          fromLat: dep.lat,
          fromLon: dep.lon,
          toLat: arr.lat,
          toLon: arr.lon,
          miles: Math.round(miles),
          count: 1,
          lastFlownAt: f.date,
        });
      }
    }

    if (miles > 0) {
      if (!longest || miles > longest.miles) longest = { flight: f, miles };
      if (!shortest || miles < shortest.miles) shortest = { flight: f, miles };
    }

    if (fi.departure.iata) {
      airportCounts.set(fi.departure.iata, (airportCounts.get(fi.departure.iata) ?? 0) + 1);
    }
    if (fi.arrival.iata) {
      airportCounts.set(fi.arrival.iata, (airportCounts.get(fi.arrival.iata) ?? 0) + 1);
    }
    if (fi.airline.iata) {
      const k = fi.airline.iata;
      const cur = airlineCounts.get(k);
      airlineCounts.set(k, { name: fi.airline.name ?? cur?.name ?? null, count: (cur?.count ?? 0) + 1 });
    }
    for (const code of [fi.departure.iata, fi.arrival.iata]) {
      const a = lookupAirport(code);
      if (a?.country) countryCounts.set(a.country, (countryCounts.get(a.country) ?? 0) + 1);
    }
    if (fi.departure.iata && fi.arrival.iata) {
      const [a, b] = [fi.departure.iata, fi.arrival.iata].sort();
      const route = `${a}-${b}`;
      routeCounts.set(route, (routeCounts.get(route) ?? 0) + 1);
    }
    const yr = new Date(f.date).getUTCFullYear();
    if (!Number.isNaN(yr)) yearCounts.set(yr, (yearCounts.get(yr) ?? 0) + 1);
  }

  return {
    totalFlights: flights.length,
    totalMiles: Math.round(totalMiles),
    totalAirMinutes,
    longest,
    shortest,
    byYear: [...yearCounts.entries()]
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year),
    topAirports: topN(
      [...airportCounts.entries()].map(([code, count]) => ({ code, count })),
      5,
    ),
    topAirlines: topN(
      [...airlineCounts.entries()].map(([code, v]) => ({ code, name: v.name, count: v.count })),
      5,
    ),
    topCountries: topN(
      [...countryCounts.entries()].map(([country, count]) => ({ country, count })),
      5,
    ),
    topRoutes: topN(
      [...routeCounts.entries()].map(([route, count]) => ({ route, count })),
      5,
    ),
    routeSegments: [...segmentMap.values()],
    airportPoints: buildAirportPoints(airportCounts),
  };
}

function buildAirportPoints(counts: Map<string, number>): AirportPoint[] {
  const out: AirportPoint[] = [];
  for (const [code, count] of counts) {
    const a = lookupAirport(code);
    if (!a) continue;
    out.push({ code, city: a.city ?? null, lat: a.lat, lon: a.lon, count });
  }
  return out.sort((a, b) => b.count - a.count);
}

export function formatHoursMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}
