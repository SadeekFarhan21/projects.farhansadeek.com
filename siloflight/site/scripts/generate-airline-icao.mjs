import { readFileSync, writeFileSync } from "node:fs";

const SOURCE_URL =
  "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat";
const SOURCE_PATH = process.argv[2] ?? "/tmp/airlines.dat";
const OUT_PATH = "src/data/airline-icao.ts";

function splitCsv(line) {
  const fields = [];
  let buf = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
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

const raw = readFileSync(SOURCE_PATH, "utf8");
const map = new Map();

for (const line of raw.split("\n")) {
  if (!line.trim()) continue;
  const cols = splitCsv(line);
  const iata = (cols[3] ?? "").trim();
  const icao = (cols[4] ?? "").trim();
  const active = (cols[7] ?? "").trim();

  if (!/^[A-Z0-9]{2}$/.test(iata)) continue;
  if (!/^[A-Z]{3}$/.test(icao)) continue;
  if (icao === "N/A") continue;

  const existing = map.get(iata);
  if (!existing) {
    map.set(iata, { icao, active: active === "Y" });
    continue;
  }
  if (!existing.active && active === "Y") {
    map.set(iata, { icao, active: true });
  }
}

const sorted = [...map.entries()].sort(([a], [b]) => a.localeCompare(b));

const body = sorted
  .map(([iata, { icao }]) => `  "${iata}": "${icao}",`)
  .join("\n");

const out = `// Generated from OpenFlights airlines.dat (Open Database License).
// Source: ${SOURCE_URL}
// Run scripts/generate-airline-icao.mjs to regenerate.

export const IATA_TO_ICAO: Record<string, string> = {
${body}
};
`;

writeFileSync(OUT_PATH, out);
console.log(`wrote ${sorted.length} mappings to ${OUT_PATH}`);
