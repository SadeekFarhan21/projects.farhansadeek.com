import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  try {
    const lines = readFileSync(resolve(process.cwd(), '.env'), 'utf-8').split('\n');
    for (const line of lines) {
      const t = line.trim();
      if (t.length === 0 || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      const k = t.slice(0, eq), v = t.slice(eq + 1);
      if (process.env[k] === undefined) process.env[k] = v;
    }
  } catch {}
}
loadEnv();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

console.log('Exporting repo_growth_metrics...');

// Paginated fetch of ALL rows
const PAGE_SIZE = 1000;
let allRows = [];
let from = 0;

while (true) {
  const { data, error } = await sb
    .from('repo_growth_metrics')
    .select('repo_owner, repo_name, repo_url, current_stars, current_forks, one_day_stars, seven_day_stars, one_month_stars, three_month_stars, one_day_forks, seven_day_forks, one_month_forks, three_month_forks')
    .order('current_stars', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (error) {
    console.error('Supabase error:', error.message);
    process.exit(1);
  }

  allRows.push(...data);
  console.log(`  Fetched ${allRows.length} rows...`);

  if (data.length < PAGE_SIZE) break;
  from += PAGE_SIZE;
}

console.log(`Total rows: ${allRows.length}`);

// Ensure output directory exists
mkdirSync(resolve(process.cwd(), 'public/data'), { recursive: true });

// ── Write JSON with abbreviated keys ──
const repos = allRows.map(r => ({
  o: r.repo_owner,
  n: r.repo_name,
  u: r.repo_url,
  s: r.current_stars,
  f: r.current_forks,
  d1s: r.one_day_stars,
  d7s: r.seven_day_stars,
  d1ms: r.one_month_stars,
  d3ms: r.three_month_stars,
  d1f: r.one_day_forks,
  d7f: r.seven_day_forks,
  d1mf: r.one_month_forks,
  d3mf: r.three_month_forks,
}));

const json = JSON.stringify({
  exported_at: new Date().toISOString(),
  count: repos.length,
  repos,
});

const jsonPath = resolve(process.cwd(), 'public/data/repos.json');
writeFileSync(jsonPath, json);
console.log(`Wrote ${jsonPath} (${(Buffer.byteLength(json) / 1024 / 1024).toFixed(2)} MB)`);

// ── Write CSV ──
const csvHeaders = [
  'repo_owner', 'repo_name', 'repo_url', 'current_stars', 'current_forks',
  'one_day_stars', 'seven_day_stars', 'one_month_stars', 'three_month_stars',
  'one_day_forks', 'seven_day_forks', 'one_month_forks', 'three_month_forks',
];

const csvLines = [csvHeaders.join(',')];
for (const r of allRows) {
  const values = csvHeaders.map(h => {
    const val = r[h];
    // Quote strings that might contain commas
    if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
    return val ?? '';
  });
  csvLines.push(values.join(','));
}

const csv = csvLines.join('\n') + '\n';
const csvPath = resolve(process.cwd(), 'public/data/repos.csv');
writeFileSync(csvPath, csv);
console.log(`Wrote ${csvPath} (${(Buffer.byteLength(csv) / 1024 / 1024).toFixed(2)} MB)`);

console.log('Export complete!');
