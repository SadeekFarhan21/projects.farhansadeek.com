import { fetchStates, type Bbox } from "@/lib/opensky";

export const dynamic = "force-dynamic";

let lastResult: Awaited<ReturnType<typeof fetchStates>> | null = null;
let lastFetchAt = 0;
let lastKey = "";
const MIN_INTERVAL_MS = 8_000;

function parseBbox(url: URL): Bbox | undefined {
  const lamin = url.searchParams.get("lamin");
  const lomin = url.searchParams.get("lomin");
  const lamax = url.searchParams.get("lamax");
  const lomax = url.searchParams.get("lomax");
  if (!lamin || !lomin || !lamax || !lomax) return undefined;
  const b = {
    lamin: Number(lamin),
    lomin: Number(lomin),
    lamax: Number(lamax),
    lomax: Number(lomax),
  };
  if (Object.values(b).some((n) => !Number.isFinite(n))) return undefined;
  if (
    Math.abs(b.lamin) > 90 ||
    Math.abs(b.lamax) > 90 ||
    Math.abs(b.lomin) > 180 ||
    Math.abs(b.lomax) > 180 ||
    b.lamin >= b.lamax ||
    b.lomin >= b.lomax
  ) {
    return undefined;
  }
  return b;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bbox = parseBbox(url);
  const key = bbox
    ? `${bbox.lamin}|${bbox.lomin}|${bbox.lamax}|${bbox.lomax}`
    : "world";

  const now = Date.now();
  if (lastResult && key === lastKey && now - lastFetchAt < MIN_INTERVAL_MS) {
    return Response.json({ ok: true, ...lastResult, cached: true });
  }

  try {
    const result = await fetchStates(bbox);
    lastResult = result;
    lastFetchAt = now;
    lastKey = key;
    return Response.json({ ok: true, ...result, cached: false });
  } catch (err) {
    console.error("[api/live/states] upstream failed", err);
    if (lastResult && key === lastKey) {
      return Response.json({ ok: true, ...lastResult, cached: true, stale: true });
    }
    return Response.json(
      { ok: false, error: "Live aircraft service is temporarily unavailable." },
      { status: 502 },
    );
  }
}
