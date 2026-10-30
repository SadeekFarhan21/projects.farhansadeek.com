import { auth } from "@/auth";
import { getDb, isDbConfigured } from "@/db";
import { flightSearches } from "@/db/schema";
import { lookupFlight } from "@/lib/flight";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { flightNumber, date, save } = (body ?? {}) as {
    flightNumber?: unknown;
    date?: unknown;
    save?: unknown;
  };

  if (typeof flightNumber !== "string" || typeof date !== "string") {
    return Response.json(
      { ok: false, error: "Both flightNumber and date are required." },
      { status: 400 },
    );
  }

  // Cap input lengths so a malformed/oversized payload can't tie up upstream
  // API calls or our DB. A real flight number is at most ~7 chars; a date is
  // exactly 10 (YYYY-MM-DD). Anything larger is malicious or buggy input.
  if (flightNumber.length > 16 || date.length > 16) {
    return Response.json(
      { ok: false, error: "Both flightNumber and date are required." },
      { status: 400 },
    );
  }

  const result = await lookupFlight(flightNumber, date);

  if (result.ok && save === true && isDbConfigured()) {
    const session = await auth();
    if (session?.user?.id) {
      try {
        await getDb().insert(flightSearches).values({
          userId: session.user.id,
          flightNumber: result.flight.flightNumber,
          date: result.flight.date,
          provider: result.provider,
          result: result.flight,
        });
      } catch (err) {
        // Best-effort: never block the user-facing result on logging.
        // Surface in server logs so silent DB failures don't go unnoticed.
        console.error("[api/flight] failed to log search", err);
      }
    }
  }

  return Response.json(result, { status: result.ok ? 200 : 400 });
}
