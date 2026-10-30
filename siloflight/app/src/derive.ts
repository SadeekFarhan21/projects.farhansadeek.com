import type { Coordinates, FlightInfo } from "./types";

const EARTH_R_MI = 3958.7613;

export function distanceMiles(a: Coordinates, b: Coordinates): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * EARTH_R_MI * Math.asin(Math.sqrt(h)));
}

export function durationHM(
  departISO: string | null,
  arriveISO: string | null,
): string | null {
  if (!departISO || !arriveISO) return null;
  const a = new Date(departISO).getTime();
  const b = new Date(arriveISO).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return null;
  const total = Math.round((b - a) / 60000);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeOfDay(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(11, 16);
}

export function flightDistance(f: FlightInfo): number | null {
  if (!f.departure.coordinates || !f.arrival.coordinates) return null;
  return distanceMiles(f.departure.coordinates, f.arrival.coordinates);
}

export function flightDuration(f: FlightInfo): string | null {
  return durationHM(
    f.departure.scheduled ?? f.departure.estimated,
    f.arrival.scheduled ?? f.arrival.estimated,
  );
}

export function flightDepartureTime(f: FlightInfo): string | null {
  return timeOfDay(f.departure.scheduled ?? f.departure.estimated);
}
