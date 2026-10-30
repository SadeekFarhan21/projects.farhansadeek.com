import { airlineName } from "./airlines";
import { airportCoords } from "./airports";

export type Coordinates = { lat: number; lon: number };

export type FlightInfo = {
  flightNumber: string;
  date: string;
  status: string | null;
  airline: { name: string | null; iata: string | null };
  departure: {
    airport: string | null;
    iata: string | null;
    scheduled: string | null;
    estimated: string | null;
    terminal: string | null;
    gate: string | null;
    coordinates: Coordinates | null;
  };
  arrival: {
    airport: string | null;
    iata: string | null;
    scheduled: string | null;
    estimated: string | null;
    terminal: string | null;
    gate: string | null;
    baggageClaim?: string | null;
    coordinates: Coordinates | null;
  };
  aircraft: { registration: string | null; model: string | null } | null;
};

export type Provider = "flightaware" | "aerodatabox" | "mock";

export type LookupResult =
  | { ok: true; provider: Provider; flight: FlightInfo }
  | { ok: false; error: string };

const FLIGHT_RE = /^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/;

export function normalizeFlightNumber(input: string): string | null {
  const cleaned = input.replace(/\s+/g, "").toUpperCase();
  return FLIGHT_RE.test(cleaned) ? cleaned : null;
}

export function isValidDate(input: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(input) && !Number.isNaN(Date.parse(input));
}

// ---------- AeroDataBox (RapidAPI) ----------

type AdbTime = { utc?: string; local?: string };
type AdbAirport = {
  icao?: string;
  iata?: string;
  name?: string;
  shortName?: string;
  location?: { lat?: number; lon?: number };
};
type AdbEndpoint = {
  airport?: AdbAirport;
  scheduledTime?: AdbTime;
  revisedTime?: AdbTime;
  predictedTime?: AdbTime;
  runwayTime?: AdbTime;
  actualTime?: AdbTime;
  terminal?: string;
  gate?: string;
  baggageBelt?: string;
};
type AdbFlight = {
  number?: string;
  status?: string;
  departure?: AdbEndpoint;
  arrival?: AdbEndpoint;
  airline?: { name?: string; iata?: string; icao?: string };
  aircraft?: { reg?: string; model?: string; modeS?: string };
};

function parseAdbTime(t: AdbTime | undefined): string | null {
  const raw = t?.utc ?? t?.local;
  return raw ? raw.replace(" ", "T") : null;
}

function mapAdbEndpoint(e: AdbEndpoint | undefined): FlightInfo["arrival"] {
  const code = e?.airport?.iata ?? e?.airport?.icao ?? null;
  const apiLoc = e?.airport?.location;
  const coordinates: Coordinates | null =
    apiLoc && typeof apiLoc.lat === "number" && typeof apiLoc.lon === "number"
      ? { lat: apiLoc.lat, lon: apiLoc.lon }
      : airportCoords(code);
  return {
    airport: e?.airport?.name ?? e?.airport?.shortName ?? null,
    iata: code,
    scheduled: parseAdbTime(e?.scheduledTime),
    estimated:
      parseAdbTime(e?.actualTime) ??
      parseAdbTime(e?.revisedTime) ??
      parseAdbTime(e?.runwayTime) ??
      parseAdbTime(e?.predictedTime),
    terminal: e?.terminal ?? null,
    gate: e?.gate ?? null,
    coordinates,
  };
}

async function fetchFromAeroDataBox(
  flightNumber: string,
  date: string,
  apiKey: string,
): Promise<LookupResult> {
  const host = "aerodatabox.p.rapidapi.com";
  const url = `https://${host}/flights/number/${encodeURIComponent(flightNumber)}/${date}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": host },
      cache: "no-store",
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
  if (res.status === 204 || res.status === 404) {
    return { ok: false, error: "No flight found for that number and date." };
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return {
      ok: false,
      error: `AeroDataBox responded ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
    };
  }
  const data = (await res.json()) as AdbFlight[] | AdbFlight;
  const flights = Array.isArray(data) ? data : [data];
  if (flights.length === 0) {
    return { ok: false, error: "No flight found for that number and date." };
  }
  const f = flights[0];
  const arrival = mapAdbEndpoint(f.arrival);
  arrival.baggageClaim = f.arrival?.baggageBelt ?? null;
  return {
    ok: true,
    provider: "aerodatabox",
    flight: {
      flightNumber: (f.number ?? flightNumber).replace(/\s+/g, ""),
      date,
      status: f.status ?? null,
      airline: { name: f.airline?.name ?? null, iata: f.airline?.iata ?? null },
      departure: mapAdbEndpoint(f.departure),
      arrival,
      aircraft: f.aircraft
        ? {
            registration: f.aircraft.reg ?? null,
            model: f.aircraft.model ?? null,
          }
        : null,
    },
  };
}

// ---------- FlightAware AeroAPI ----------

type FaAirport = {
  code?: string;
  code_iata?: string;
  code_icao?: string;
  name?: string;
  city?: string;
};
type FaFlight = {
  ident?: string;
  ident_iata?: string;
  operator?: string;
  operator_iata?: string;
  registration?: string | null;
  origin?: FaAirport;
  destination?: FaAirport;
  scheduled_out?: string | null;
  estimated_out?: string | null;
  actual_out?: string | null;
  scheduled_off?: string | null;
  actual_off?: string | null;
  scheduled_in?: string | null;
  estimated_in?: string | null;
  actual_in?: string | null;
  scheduled_on?: string | null;
  actual_on?: string | null;
  status?: string;
  cancelled?: boolean;
  diverted?: boolean;
  aircraft_type?: string | null;
  gate_origin?: string | null;
  gate_destination?: string | null;
  terminal_origin?: string | null;
  terminal_destination?: string | null;
  baggage_claim?: string | null;
};

async function fetchFromFlightAware(
  flightNumber: string,
  date: string,
  apiKey: string,
): Promise<LookupResult> {
  const url = new URL(
    `https://aeroapi.flightaware.com/aeroapi/flights/${encodeURIComponent(flightNumber)}`,
  );
  url.searchParams.set("start", `${date}T00:00:00Z`);
  url.searchParams.set("end", `${date}T23:59:59Z`);
  url.searchParams.set("max_pages", "1");

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "x-apikey": apiKey, Accept: "application/json" },
      cache: "no-store",
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return {
      ok: false,
      error: `FlightAware responded ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
    };
  }
  const json = (await res.json()) as { flights?: FaFlight[] };
  const flights = json.flights ?? [];
  if (flights.length === 0) {
    return { ok: false, error: "No flight found for that number and date." };
  }
  const f = flights[0];
  const status = f.cancelled ? "Cancelled" : f.diverted ? "Diverted" : (f.status ?? null);
  return {
    ok: true,
    provider: "flightaware",
    flight: {
      flightNumber: (f.ident_iata ?? f.ident ?? flightNumber).replace(/\s+/g, ""),
      date,
      status,
      airline: {
        name: airlineName(f.operator ?? null, f.operator ?? null, f.operator_iata ?? null),
        iata: f.operator_iata ?? null,
      },
      departure: {
        airport: f.origin?.name ?? null,
        iata: f.origin?.code_iata ?? f.origin?.code ?? null,
        scheduled: f.scheduled_out ?? f.scheduled_off ?? null,
        estimated: f.actual_out ?? f.estimated_out ?? f.actual_off ?? null,
        terminal: f.terminal_origin ?? null,
        gate: f.gate_origin ?? null,
        coordinates: airportCoords(
          f.origin?.code_icao ?? f.origin?.code_iata ?? f.origin?.code,
        ),
      },
      arrival: {
        airport: f.destination?.name ?? null,
        iata: f.destination?.code_iata ?? f.destination?.code ?? null,
        scheduled: f.scheduled_in ?? f.scheduled_on ?? null,
        estimated: f.actual_in ?? f.estimated_in ?? f.actual_on ?? null,
        terminal: f.terminal_destination ?? null,
        gate: f.gate_destination ?? null,
        baggageClaim: f.baggage_claim ?? null,
        coordinates: airportCoords(
          f.destination?.code_icao ?? f.destination?.code_iata ?? f.destination?.code,
        ),
      },
      aircraft: f.aircraft_type || f.registration
        ? { registration: f.registration ?? null, model: f.aircraft_type ?? null }
        : null,
    },
  };
}

// ---------- Mock fallback ----------

function mockLookup(flightNumber: string, date: string): LookupResult {
  return {
    ok: true,
    provider: "mock",
    flight: {
      flightNumber,
      date,
      status: "Scheduled",
      airline: { name: "Mock Airways", iata: flightNumber.slice(0, 2) },
      departure: {
        airport: "John F. Kennedy International",
        iata: "JFK",
        scheduled: `${date}T08:30:00Z`,
        estimated: `${date}T08:35:00Z`,
        terminal: "4",
        gate: "B22",
        coordinates: airportCoords("JFK"),
      },
      arrival: {
        airport: "Los Angeles International",
        iata: "LAX",
        scheduled: `${date}T11:55:00Z`,
        estimated: `${date}T12:01:00Z`,
        terminal: "5",
        gate: "54A",
        baggageClaim: "7",
        coordinates: airportCoords("LAX"),
      },
      aircraft: { registration: "N123MK", model: "Boeing 737-800" },
    },
  };
}

// ---------- Provider selection ----------

export async function lookupFlight(
  flightNumberRaw: string,
  date: string,
): Promise<LookupResult> {
  const flightNumber = normalizeFlightNumber(flightNumberRaw);
  if (!flightNumber) {
    return {
      ok: false,
      error: "Invalid flight number. Use IATA format like AA100 or DL2415.",
    };
  }
  if (!isValidDate(date)) {
    return { ok: false, error: "Invalid date. Use YYYY-MM-DD." };
  }

  const faKey = process.env.FLIGHTAWARE_API_KEY;
  if (faKey) return fetchFromFlightAware(flightNumber, date, faKey);

  const adbKey = process.env.AERODATABOX_RAPIDAPI_KEY;
  if (adbKey) return fetchFromAeroDataBox(flightNumber, date, adbKey);

  return mockLookup(flightNumber, date);
}
