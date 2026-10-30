import { writeFileSync } from "node:fs";

const SOURCE_URL =
  "https://raw.githubusercontent.com/ip2location/ip2location-iata-icao/master/iata-icao.csv";
const OUT_PATH = "src/data/airports.ts";

function splitCsv(line) {
  const fields = [];
  let buf = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        buf += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      fields.push(buf);
      buf = "";
    } else {
      buf += c;
    }
  }
  fields.push(buf);
  return fields;
}

const res = await fetch(SOURCE_URL);
if (!res.ok) {
  console.error(`fetch ${SOURCE_URL} failed: ${res.status}`);
  process.exit(1);
}
const raw = await res.text();
const lines = raw.split("\n").filter((l) => l.trim());
lines.shift();

const map = new Map();
for (const line of lines) {
  const cols = splitCsv(line);
  const country = cols[0]?.trim() ?? "";
  const region = cols[1]?.trim() ?? "";
  const iata = cols[2]?.trim() ?? "";
  const icao = cols[3]?.trim() ?? "";
  const name = cols[4]?.trim() ?? "";
  const lat = Number(cols[5]);
  const lon = Number(cols[6]);

  if (!/^[A-Z]{3}$/.test(iata)) continue;
  if (!/^[A-Z0-9]{4}$/.test(icao)) continue;

  const entry = {
    icao,
    name,
    country,
    region,
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
  };
  if (!map.has(iata)) map.set(iata, entry);
}

const sorted = [...map.entries()].sort(([a], [b]) => a.localeCompare(b));

const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const body = sorted
  .map(
    ([iata, e]) =>
      `  "${iata}": { icao: "${e.icao}", name: "${esc(e.name)}", country: "${e.country}", region: "${esc(e.region)}", lat: ${e.lat ?? "null"}, lon: ${e.lon ?? "null"} },`,
  )
  .join("\n");

const out = `// Generated from ip2location/ip2location-iata-icao (CC-BY-SA 4.0).
// Source: ${SOURCE_URL}
// Run scripts/generate-airport-data.mjs to regenerate.

export type AirportEntry = {
  icao: string;
  name: string;
  country: string;
  region: string;
  lat: number | null;
  lon: number | null;
};

export const AIRPORTS: Record<string, AirportEntry> = {
${body}
};
`;

writeFileSync(OUT_PATH, out);
console.log(`wrote ${sorted.length} airports to ${OUT_PATH}`);
