import type { LookupResult } from "./types";

const API_BASE = "https://siloflight.farhansadeek.com";

export async function lookupFlight(
  flightNumber: string,
  date: string,
): Promise<LookupResult> {
  const res = await fetch(`${API_BASE}/api/flight`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ flightNumber, date }),
  });
  return (await res.json()) as LookupResult;
}
