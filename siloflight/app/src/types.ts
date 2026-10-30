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

export type LookupResult =
  | { ok: true; provider: "flightaware" | "aerodatabox" | "mock"; flight: FlightInfo }
  | { ok: false; error: string };
