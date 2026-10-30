import { IATA_TO_ICAO } from "@/data/airline-icao";

export type LogoOverride = { url: string; scale?: number };

export const LOGO_OVERRIDES: Record<string, LogoOverride> = {
  AS: { url: "/logos/AS.png", scale: 1.6 },
};

export function airlineLogoUrl(iata: string | null | undefined): {
  url: string | null;
  scale: number;
} {
  const code = iata?.toUpperCase();
  if (!code) return { url: null, scale: 1 };
  const override = LOGO_OVERRIDES[code];
  if (override) return { url: override.url, scale: override.scale ?? 1 };
  const icao = IATA_TO_ICAO[code];
  if (icao) {
    return {
      url: `https://www.flightaware.com/images/airline_logos/180px/${icao}.png`,
      scale: 1,
    };
  }
  return { url: null, scale: 1 };
}

export type NormalizedStatus =
  | "landed"
  | "in-air"
  | "scheduled"
  | "cancelled"
  | "diverted"
  | "unknown";

export function normalizeStatus(s: string | null | undefined): NormalizedStatus {
  if (!s) return "unknown";
  const v = s.toLowerCase();
  if (v.includes("land") || v.includes("arrived")) return "landed";
  if (v.includes("air") || v.includes("en route") || v.includes("active"))
    return "in-air";
  if (v.includes("cancel")) return "cancelled";
  if (v.includes("divert")) return "diverted";
  if (v.includes("schedul") || v.includes("planned")) return "scheduled";
  return "unknown";
}

export function statusProgress(status: NormalizedStatus): number {
  switch (status) {
    case "landed":
      return 100;
    case "in-air":
      return 70;
    default:
      return 0;
  }
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const TZ_ABBR: Record<string, [string, string]> = {
  // [standard, daylight] — picked when Intl returns "GMT±N"
  "Europe/London": ["GMT", "BST"],
  "Europe/Paris": ["CET", "CEST"],
  "Europe/Berlin": ["CET", "CEST"],
  "Europe/Madrid": ["CET", "CEST"],
  "Europe/Rome": ["CET", "CEST"],
  "Europe/Amsterdam": ["CET", "CEST"],
  "Europe/Brussels": ["CET", "CEST"],
  "Europe/Zurich": ["CET", "CEST"],
  "Europe/Vienna": ["CET", "CEST"],
  "Europe/Dublin": ["GMT", "IST"],
  "Europe/Lisbon": ["WET", "WEST"],
  "Europe/Athens": ["EET", "EEST"],
  "Europe/Istanbul": ["TRT", "TRT"],
  "Europe/Moscow": ["MSK", "MSK"],
  "Asia/Dubai": ["GST", "GST"],
  "Asia/Qatar": ["AST", "AST"],
  "Asia/Riyadh": ["AST", "AST"],
  "Asia/Karachi": ["PKT", "PKT"],
  "Asia/Kolkata": ["IST", "IST"],
  "Asia/Calcutta": ["IST", "IST"],
  "Asia/Dhaka": ["BST", "BST"],
  "Asia/Bangkok": ["ICT", "ICT"],
  "Asia/Singapore": ["SGT", "SGT"],
  "Asia/Hong_Kong": ["HKT", "HKT"],
  "Asia/Shanghai": ["CST", "CST"],
  "Asia/Tokyo": ["JST", "JST"],
  "Asia/Seoul": ["KST", "KST"],
  "Australia/Sydney": ["AEST", "AEDT"],
  "Australia/Melbourne": ["AEST", "AEDT"],
  "Australia/Perth": ["AWST", "AWST"],
  "Pacific/Auckland": ["NZST", "NZDT"],
  "Africa/Johannesburg": ["SAST", "SAST"],
  "Africa/Cairo": ["EET", "EEST"],
  "Africa/Lagos": ["WAT", "WAT"],
  "America/Sao_Paulo": ["BRT", "BRT"],
  "America/Mexico_City": ["CST", "CDT"],
  "America/Toronto": ["EST", "EDT"],
  "America/Vancouver": ["PST", "PDT"],
};

function isDst(d: Date, tz: string): boolean {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "shortOffset",
  });
  const jan = fmt
    .formatToParts(new Date(Date.UTC(d.getUTCFullYear(), 0, 1)))
    .find((p) => p.type === "timeZoneName")?.value;
  const cur = fmt.formatToParts(d).find((p) => p.type === "timeZoneName")?.value;
  return Boolean(jan && cur && jan !== cur);
}

export function formatMilitaryTime(
  iso: string | null,
  tz: string | null | undefined,
): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz ?? undefined,
  }).format(d);
}

export function formatLocalTime(
  iso: string | null,
  tz: string | null | undefined,
): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: tz ?? undefined,
  }).format(d);
  const rawAbbr =
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz ?? undefined,
      timeZoneName: "short",
    })
      .formatToParts(d)
      .find((p) => p.type === "timeZoneName")?.value ?? "";
  const friendly =
    tz && rawAbbr.startsWith("GMT") && TZ_ABBR[tz]
      ? TZ_ABBR[tz][isDst(d, tz) ? 1 : 0]
      : rawAbbr;
  return `${time} ${friendly}`.trim();
}

function dayInTz(iso: string, tz: string | null | undefined): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: tz ?? undefined,
  }).format(new Date(iso));
}

export function dayDelta(
  depIso: string | null,
  depTz: string | null | undefined,
  arrIso: string | null,
  arrTz: string | null | undefined,
): number {
  if (!depIso || !arrIso) return 0;
  const dep = Date.parse(dayInTz(depIso, depTz));
  const arr = Date.parse(dayInTz(arrIso, arrTz));
  if (Number.isNaN(dep) || Number.isNaN(arr)) return 0;
  return Math.round((arr - dep) / 86400000);
}

export function formatFlightCode(num: string, iata: string | null): string {
  if (!iata) return num;
  if (num.toUpperCase().startsWith(iata.toUpperCase())) {
    return `${iata} ${num.slice(iata.length)}`;
  }
  return num;
}

export function greatCircleMiles(
  a: { lat: number; lon: number } | null,
  b: { lat: number; lon: number } | null,
): number | null {
  if (!a || !b) return null;
  const R = 3958.7613;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
}

export function computeDuration(
  depIso: string | null,
  arrIso: string | null,
): string | null {
  if (!depIso || !arrIso) return null;
  const dep = new Date(depIso).getTime();
  const arr = new Date(arrIso).getTime();
  if (!Number.isFinite(dep) || !Number.isFinite(arr) || arr <= dep) return null;
  const mins = Math.round((arr - dep) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export type AirlineBadge = {
  text: string;
  from: string;
  to: string;
  fg: string;
  ring: string;
};

const BADGE_PALETTE: ReadonlyArray<Omit<AirlineBadge, "text">> = [
  { from: "rgba(56,189,248,0.20)", to: "rgba(14,165,233,0.10)", fg: "#7dd3fc", ring: "rgba(125,211,252,0.30)" },
  { from: "rgba(110,231,183,0.20)", to: "rgba(16,185,129,0.10)", fg: "#6ee7b7", ring: "rgba(110,231,183,0.30)" },
  { from: "rgba(251,191,36,0.18)", to: "rgba(245,158,11,0.08)", fg: "#fcd34d", ring: "rgba(252,211,77,0.30)" },
  { from: "rgba(244,114,182,0.18)", to: "rgba(236,72,153,0.08)", fg: "#f9a8d4", ring: "rgba(249,168,212,0.30)" },
  { from: "rgba(167,139,250,0.20)", to: "rgba(139,92,246,0.10)", fg: "#c4b5fd", ring: "rgba(196,181,253,0.30)" },
  { from: "rgba(248,113,113,0.18)", to: "rgba(239,68,68,0.08)", fg: "#fca5a5", ring: "rgba(252,165,165,0.30)" },
  { from: "rgba(94,234,212,0.20)", to: "rgba(20,184,166,0.10)", fg: "#5eead4", ring: "rgba(94,234,212,0.30)" },
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pickBadgeText(
  airline: { name: string | null; iata: string | null },
  flightNumber: string,
): string {
  if (airline.iata && airline.iata.length >= 2) {
    return airline.iata.slice(0, 3).toUpperCase();
  }
  if (airline.name) {
    const parts = airline.name
      .replace(/\b(Airlines?|Airways|Air|Aviation)\b/gi, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase();
    }
    if (parts.length === 1) {
      return parts[0]!.slice(0, 2).toUpperCase();
    }
  }
  const prefix = flightNumber.match(/^[A-Za-z]+/)?.[0];
  if (prefix && prefix.length >= 2) return prefix.slice(0, 2).toUpperCase();
  return "";
}

export function deriveAirlineBadge(
  airline: { name: string | null; iata: string | null },
  flightNumber: string,
): AirlineBadge {
  const text = pickBadgeText(airline, flightNumber);
  const seed = (airline.iata ?? airline.name ?? flightNumber).trim().toUpperCase();
  const palette = BADGE_PALETTE[hashString(seed) % BADGE_PALETTE.length]!;
  return { text, ...palette };
}
