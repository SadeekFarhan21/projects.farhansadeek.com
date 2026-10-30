import { auth } from "@/auth";
import { getDb, isDbConfigured } from "@/db";
import { flightSearches } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  if (!isDbConfigured()) {
    return Response.json({ ok: true, searches: [] });
  }
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
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
    .orderBy(desc(flightSearches.lookedUpAt))
    .limit(25);
  return Response.json({ ok: true, searches: rows });
}
