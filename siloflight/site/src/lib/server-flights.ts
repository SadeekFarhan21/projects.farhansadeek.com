import "server-only";
import { auth } from "@/auth";
import { getDb, isDbConfigured } from "@/db";
import { flightSearches } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import type { Session } from "next-auth";
import type { StoredFlight } from "./stats";
import type { FlightInfo } from "./flight";

export async function getSessionAndFlights(): Promise<{
  session: Session | null;
  flights: StoredFlight[];
  dbReady: boolean;
  error?: string;
}> {
  if (!isDbConfigured()) {
    return { session: null, flights: [], dbReady: false };
  }
  const session = (await auth()) as Session | null;
  if (!session?.user?.id) {
    return { session, flights: [], dbReady: true };
  }
  try {
    const rows = await getDb()
      .select({
        id: flightSearches.id,
        flightNumber: flightSearches.flightNumber,
        date: flightSearches.date,
        lookedUpAt: flightSearches.lookedUpAt,
        provider: flightSearches.provider,
        result: flightSearches.result,
      })
      .from(flightSearches)
      .where(eq(flightSearches.userId, session.user.id))
      .orderBy(desc(flightSearches.date));
    const flights = rows.map((r) => ({
      ...r,
      result: r.result as FlightInfo,
    }));
    return { session, flights, dbReady: true };
  } catch (err) {
    console.error("[server-flights] failed to load flights", err);
    return {
      session,
      flights: [],
      dbReady: true,
      error: "Couldn't load your flights. Please try again in a moment.",
    };
  }
}

export async function getFlightById(id: string): Promise<StoredFlight | null> {
  if (!isDbConfigured()) return null;
  const session = (await auth()) as Session | null;
  if (!session?.user?.id) return null;
  const rows = await getDb()
    .select({
      id: flightSearches.id,
      flightNumber: flightSearches.flightNumber,
      date: flightSearches.date,
      lookedUpAt: flightSearches.lookedUpAt,
      provider: flightSearches.provider,
      result: flightSearches.result,
    })
    .from(flightSearches)
    .where(
      and(
        eq(flightSearches.id, id),
        eq(flightSearches.userId, session.user.id),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { ...row, result: row.result as FlightInfo };
}

export async function deleteFlightById(id: string): Promise<boolean> {
  if (!isDbConfigured()) return false;
  const session = (await auth()) as Session | null;
  if (!session?.user?.id) return false;
  const rows = await getDb()
    .delete(flightSearches)
    .where(
      and(
        eq(flightSearches.id, id),
        eq(flightSearches.userId, session.user.id),
      ),
    )
    .returning({ id: flightSearches.id });
  return rows.length > 0;
}
