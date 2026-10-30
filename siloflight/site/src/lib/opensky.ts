// OpenSky Network — live aircraft states.
// Docs: https://openskynetwork.github.io/opensky-api/rest.html
// Free anonymous tier: 400 credits/day. Authenticated (OAuth2 client creds): 4000/day.
// Cost per /states/all call: 4 credits (no bbox), 1–3 credits (with bbox).
// Min request interval: 10s anonymous, 5s authenticated.

const STATES_URL = "https://opensky-network.org/api/states/all";
const TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";

export type Aircraft = {
  id: string; // icao24
  callsign: string | null;
  country: string;
  lat: number;
  lng: number;
  altMeters: number | null; // baro altitude
  velocityMs: number | null; // m/s
  headingDeg: number | null; // true track, 0 = north
  verticalRateMs: number | null;
  onGround: boolean;
};

export type StatesResult = {
  time: number; // unix seconds
  aircraft: Aircraft[];
};

export type Bbox = {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
};

type CredPair = { id: string; secret: string };

function getCredentials(): CredPair[] {
  const out: CredPair[] = [];
  const id1 = process.env.OPENSKY_CLIENT_ID;
  const s1 = process.env.OPENSKY_CLIENT_SECRET;
  if (id1 && s1) out.push({ id: id1, secret: s1 });
  const id2 = process.env.OPENSKY_CLIENT_ID_2;
  const s2 = process.env.OPENSKY_CLIENT_SECRET_2;
  if (id2 && s2) out.push({ id: id2, secret: s2 });
  return out;
}

const tokenCache = new Map<string, { token: string; expiresAt: number }>();
let credPointer = 0;

async function getAccessToken(cred: CredPair): Promise<string | null> {
  const now = Date.now();
  const cached = tokenCache.get(cred.id);
  if (cached && cached.expiresAt > now + 30_000) return cached.token;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: cred.id,
    client_secret: cred.secret,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    tokenCache.delete(cred.id);
    return null;
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache.set(cred.id, {
    token: json.access_token,
    expiresAt: now + json.expires_in * 1000,
  });
  return json.access_token;
}

function parseStates(json: {
  time: number;
  states: Array<Array<string | number | boolean | null>> | null;
}): StatesResult {
  const rows = json.states ?? [];
  const aircraft: Aircraft[] = [];
  for (const r of rows) {
    const lat = r[6];
    const lng = r[5];
    if (typeof lat !== "number" || typeof lng !== "number") continue;
    aircraft.push({
      id: String(r[0]),
      callsign: typeof r[1] === "string" ? r[1].trim() || null : null,
      country: typeof r[2] === "string" ? r[2] : "",
      lat,
      lng,
      altMeters: typeof r[7] === "number" ? r[7] : null,
      velocityMs: typeof r[9] === "number" ? r[9] : null,
      headingDeg: typeof r[10] === "number" ? r[10] : null,
      verticalRateMs: typeof r[11] === "number" ? r[11] : null,
      onGround: r[8] === true,
    });
  }
  return { time: json.time, aircraft };
}

export async function fetchStates(bbox?: Bbox): Promise<StatesResult> {
  const url = new URL(STATES_URL);
  if (bbox) {
    url.searchParams.set("lamin", String(bbox.lamin));
    url.searchParams.set("lomin", String(bbox.lomin));
    url.searchParams.set("lamax", String(bbox.lamax));
    url.searchParams.set("lomax", String(bbox.lomax));
  }

  const creds = getCredentials();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < creds.length; attempt++) {
    const cred = creds[(credPointer + attempt) % creds.length];
    const token = await getAccessToken(cred);
    if (!token) continue;
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        lastError = new Error(`OpenSky ${res.status}`);
        // 401/403 = bad token; 429 = rate limited. Bust this cred's cache and try the next.
        if (res.status === 401 || res.status === 403 || res.status === 429) {
          tokenCache.delete(cred.id);
        }
        continue;
      }
      // Success — advance the pointer so the next call starts with a different cred.
      credPointer = (credPointer + attempt + 1) % creds.length;
      const json = (await res.json()) as Parameters<typeof parseStates>[0];
      return parseStates(json);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  // Anonymous fallback (or only path if no creds configured).
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw lastError ?? new Error(`OpenSky ${res.status}`);
  }
  const json = (await res.json()) as Parameters<typeof parseStates>[0];
  return parseStates(json);
}
