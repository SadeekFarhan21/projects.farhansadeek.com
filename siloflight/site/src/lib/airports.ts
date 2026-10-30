import airports from "@/data/airports.json";

export type AirportRecord = {
  name: string;
  city: string;
  country: string;
  tz: string | null;
  lat: number;
  lon: number;
};

const DB = airports as Record<string, AirportRecord>;

export function lookupAirport(code: string | null | undefined): AirportRecord | null {
  if (!code) return null;
  return DB[code.toUpperCase()] ?? null;
}

export function airportCoords(
  code: string | null | undefined,
): { lat: number; lon: number } | null {
  const a = lookupAirport(code);
  return a ? { lat: a.lat, lon: a.lon } : null;
}
