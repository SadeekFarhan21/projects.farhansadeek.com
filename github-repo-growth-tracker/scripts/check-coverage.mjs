import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
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

const sb = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Count repos with non-zero deltas
const { data: nonZero } = await sb
  .from('repo_growth_metrics')
  .select('repo_owner', { count: 'exact', head: true })
  .gt('three_month_stars', 0);

const { data: total } = await sb
  .from('repo_growth_metrics')
  .select('repo_owner', { count: 'exact', head: true });

// Count how many have historical data
const { count: totalMetrics } = await sb
  .from('repo_daily_metrics')
  .select('*', { count: 'exact', head: true });

const { count: todayOnly } = await sb
  .from('repo_daily_metrics')
  .select('*', { count: 'exact', head: true })
  .eq('collected_on', '2026-02-17');

console.log(`Total repos in growth_metrics: ${total}`);
console.log(`Total metric rows: ${totalMetrics}`);
console.log(`Rows for 2026-02-17: ${todayOnly}`);
console.log(`Historical rows (backfilled): ${totalMetrics - todayOnly}`);

// Top 10 by 3m growth
const { data: top3m } = await sb
  .from('repo_growth_metrics')
  .select('repo_owner, repo_name, current_stars, one_day_stars, seven_day_stars, one_month_stars, three_month_stars')
  .order('three_month_stars', { ascending: false })
  .limit(10);

console.log('\nTop 10 repos by 3-month star growth:');
console.table(top3m.map(r => ({
  repo: `${r.repo_owner}/${r.repo_name}`,
  stars: r.current_stars,
  '1d': r.one_day_stars,
  '7d': r.seven_day_stars,
  '1m': r.one_month_stars,
  '3m': r.three_month_stars,
})));
