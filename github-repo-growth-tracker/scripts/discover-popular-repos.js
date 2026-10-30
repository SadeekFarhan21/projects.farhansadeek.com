#!/usr/bin/env node

/**
 * Discover popular public GitHub repos using the Search API.
 *
 * Uses GitHub's search/repositories endpoint to find repos sorted by stars.
 * Adds them to tracked_repos if not already tracked, then collects their
 * current metrics and backfills historical star data.
 *
 * Usage:
 *   node scripts/discover-popular-repos.js
 *
 * Options (env vars):
 *   MIN_STARS       - minimum star count to search for (default: 1000)
 *   MAX_PAGES       - max search result pages to fetch (default: 10, max 10 per query)
 *   SKIP_BACKFILL   - set to "true" to skip star history backfill
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  try {
    const lines = readFileSync(resolve(process.cwd(), '.env'), 'utf-8').split('\n');
    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      const k = t.slice(0, eq), v = t.slice(eq + 1);
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {}
}
loadEnv();

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN?.trim();

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !GITHUB_TOKEN) {
  console.error('Missing PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or GITHUB_TOKEN.');
  process.exit(1);
}

const MIN_STARS = parseInt(process.env.MIN_STARS || '1000', 10);
const MAX_PAGES = parseInt(process.env.MAX_PAGES || '10', 10);
const SKIP_BACKFILL = process.env.SKIP_BACKFILL === 'true';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const ghHeaders = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  'User-Agent': 'discover-popular-repos',
};

const ghStarHeaders = {
  Accept: 'application/vnd.github.v3.star+json',
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  'User-Agent': 'discover-popular-repos',
};

// Separate rate limit tracking for core API vs search API
let coreRateRemaining = 5000;
let coreRateReset = 0;
let searchRateRemaining = 30;
let searchRateReset = 0;

function updateCoreRateLimit(res) {
  const rem = res.headers.get('x-ratelimit-remaining');
  const reset = res.headers.get('x-ratelimit-reset');
  if (rem) coreRateRemaining = parseInt(rem, 10);
  if (reset) coreRateReset = parseInt(reset, 10);
}

function updateSearchRateLimit(res) {
  const rem = res.headers.get('x-ratelimit-remaining');
  const reset = res.headers.get('x-ratelimit-reset');
  if (rem) searchRateRemaining = parseInt(rem, 10);
  if (reset) searchRateReset = parseInt(reset, 10);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForCoreRateLimit() {
  if (coreRateRemaining < 50) {
    const waitMs = Math.max(0, coreRateReset * 1000 - Date.now()) + 2000;
    console.log(`  ⏳ Core rate limit low (${coreRateRemaining}). Waiting ${Math.ceil(waitMs / 1000)}s...`);
    await sleep(waitMs);
  }
}

async function waitForSearchRateLimit() {
  if (searchRateRemaining < 3) {
    const waitMs = Math.max(0, searchRateReset * 1000 - Date.now()) + 2000;
    console.log(`  ⏳ Search rate limit low (${searchRateRemaining}). Waiting ${Math.ceil(waitMs / 1000)}s...`);
    await sleep(waitMs);
  }
}

const now = new Date();
const today = now.toISOString().slice(0, 10);

function daysAgo(n) {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function monthsAgo(n) {
  const d = new Date(now);
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

const BACKFILL_DATES = [
  { label: '1d', date: daysAgo(1) },
  { label: '7d', date: daysAgo(7) },
  { label: '1m', date: monthsAgo(1) },
  { label: '3m', date: monthsAgo(3) },
];

/**
 * Search GitHub for repos with stars >= minStars, sorted by stars desc.
 * GitHub search API returns max 1000 results per query (10 pages × 100).
 * To get more, we use star ranges.
 */
async function searchRepos(query, page = 1) {
  await waitForSearchRateLimit();
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=100&page=${page}`;
  const res = await fetch(url, { headers: ghHeaders });
  updateSearchRateLimit(res);

  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get('x-ratelimit-reset');
    if (reset) {
      const waitMs = Math.max(0, parseInt(reset, 10) * 1000 - Date.now()) + 2000;
      console.log(`  Search rate limited. Waiting ${Math.ceil(waitMs / 1000)}s...`);
      await sleep(waitMs);
      return searchRepos(query, page);
    }
    return null;
  }

  if (!res.ok) {
    console.error(`  Search failed: ${res.status} ${res.statusText}`);
    return null;
  }

  return res.json();
}

/**
 * Get the star count as of a specific date using page-based binary search.
 */
const PER_PAGE = 100;
const MAX_PAGE = 400;

async function getPageDate(owner, name, page) {
  await waitForCoreRateLimit();
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${name}/stargazers?per_page=${PER_PAGE}&page=${page}`,
    { headers: ghStarHeaders }
  );
  updateCoreRateLimit(res);
  if (!res.ok) return null;
  const body = await res.json();
  if (!Array.isArray(body) || body.length === 0) return null;
  return body[0]?.starred_at?.slice(0, 10) || null;
}

async function starsAsOfDate(owner, name, totalStars, targetDate) {
  if (totalStars === 0) return 0;

  const maxPage = Math.min(Math.ceil(totalStars / PER_PAGE), MAX_PAGE);
  const accessibleStars = Math.min(totalStars, maxPage * PER_PAGE);

  const firstDate = await getPageDate(owner, name, 1);
  if (firstDate === null) return null;
  if (firstDate > targetDate) return 0;

  const lastDate = await getPageDate(owner, name, maxPage);
  if (lastDate === null) return null;

  if (lastDate <= targetDate) {
    if (totalStars <= maxPage * PER_PAGE) return totalStars;
    const unseenStars = totalStars - accessibleStars;
    const lastMs = new Date(lastDate).getTime();
    const todayMs = new Date(today).getTime();
    const targetMs = new Date(targetDate).getTime();
    if (targetMs >= todayMs) return totalStars;
    if (targetMs <= lastMs) return accessibleStars;
    if (todayMs <= lastMs) return totalStars;
    const fraction = (targetMs - lastMs) / (todayMs - lastMs);
    return accessibleStars + Math.round(unseenStars * fraction);
  }

  let lo = 1, hi = maxPage;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const midDate = await getPageDate(owner, name, mid);
    if (midDate === null) return null;
    if (midDate <= targetDate) lo = mid + 1;
    else hi = mid;
  }

  const starCount = (lo - 1) * PER_PAGE;
  if (totalStars > maxPage * PER_PAGE) {
    return Math.round(starCount * (totalStars / accessibleStars));
  }
  return starCount;
}

async function fetchAllStargazerDates(owner, name) {
  const dates = [];
  let page = 1;
  while (true) {
    await waitForCoreRateLimit();
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${name}/stargazers?per_page=100&page=${page}`,
      { headers: ghStarHeaders }
    );
    updateCoreRateLimit(res);
    if (res.status === 404 || res.status === 410) return null;
    if (res.status === 403 || res.status === 429) {
      const reset = res.headers.get('x-ratelimit-reset');
      if (reset) {
        const waitMs = Math.max(0, parseInt(reset, 10) * 1000 - Date.now()) + 2000;
        console.log(`  Rate limited. Waiting ${Math.ceil(waitMs / 1000)}s...`);
        await sleep(waitMs);
        continue;
      }
      return null;
    }
    if (!res.ok) return null;
    const body = await res.json();
    if (!Array.isArray(body) || body.length === 0) break;
    for (const e of body) {
      if (e.starred_at) dates.push(e.starred_at.slice(0, 10));
    }
    const link = res.headers.get('link');
    if (!link || !link.includes('rel="next"')) break;
    page++;
  }
  dates.sort();
  return dates;
}

function starsAsOf(sortedDates, asOfDate) {
  let lo = 0, hi = sortedDates.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sortedDates[mid] <= asOfDate) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

async function main() {
  console.log(`Discovering popular repos with >= ${MIN_STARS} stars...`);
  console.log(`Will fetch up to ${MAX_PAGES} pages per star range.`);
  console.log(`Backfill: ${SKIP_BACKFILL ? 'DISABLED' : 'ENABLED'}`);
  console.log('');

  // Get all already-tracked repo names for dedup
  let existingRepos = new Set();
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from('tracked_repos')
      .select('repo_owner, repo_name')
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    for (const r of data) {
      existingRepos.add(`${r.repo_owner}/${r.repo_name}`.toLowerCase());
    }
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`Already tracking ${existingRepos.size} repos.`);

  // GitHub search returns max 1000 results per query.
  // To get more repos, we break up by star ranges.
  const starRanges = [
    { min: 100000, max: null },   // 100k+
    { min: 50000, max: 99999 },   // 50k-100k
    { min: 30000, max: 49999 },   // 30k-50k
    { min: 20000, max: 29999 },   // 20k-30k
    { min: 15000, max: 19999 },   // 15k-20k
    { min: 10000, max: 14999 },   // 10k-15k
    { min: 8000, max: 9999 },     // 8k-10k
    { min: 6000, max: 7999 },     // 6k-8k
    { min: 5000, max: 5999 },     // 5k-6k
    { min: 4000, max: 4999 },     // 4k-5k
    { min: 3000, max: 3999 },     // 3k-4k
    { min: 2500, max: 2999 },     // 2.5k-3k
    { min: 2000, max: 2499 },     // 2k-2.5k
    { min: 1500, max: 1999 },     // 1.5k-2k
    { min: 1200, max: 1499 },     // 1.2k-1.5k
    { min: 1000, max: 1199 },     // 1k-1.2k
    { min: 800, max: 999 },       // 800-1k
    { min: 600, max: 799 },       // 600-800
    { min: 500, max: 599 },       // 500-600
  ].filter(r => (r.max || Infinity) >= MIN_STARS);

  let discovered = [];
  let totalSearchResults = 0;

  for (const range of starRanges) {
    const starQuery = range.max
      ? `stars:${range.min}..${range.max}`
      : `stars:>=${range.min}`;
    const query = `${starQuery} is:public`;

    console.log(`\nSearching: ${starQuery}`);

    for (let page = 1; page <= MAX_PAGES; page++) {
      const result = await searchRepos(query, page);
      if (!result || !result.items || result.items.length === 0) break;

      totalSearchResults += result.items.length;

      for (const repo of result.items) {
        const key = `${repo.owner.login}/${repo.name}`.toLowerCase();
        if (existingRepos.has(key)) continue;

        existingRepos.add(key); // prevent duplicates within this run
        discovered.push({
          owner: repo.owner.login,
          name: repo.name,
          url: repo.html_url,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          github_id: repo.id,
          description: repo.description,
          language: repo.language,
        });
      }

      console.log(`  Page ${page}: ${result.items.length} results, ${result.total_count} total matches, ${discovered.length} new repos found so far`);

      if (result.items.length < 100) break;
      await sleep(1500); // Be nice to search API (30 req/min limit)
    }
  }

  console.log(`\n── Discovery complete ──`);
  console.log(`Search results scanned: ${totalSearchResults}`);
  console.log(`New repos found: ${discovered.length}`);

  if (discovered.length === 0) {
    console.log('No new repos to add.');
    return;
  }

  // Sort by stars desc for display
  discovered.sort((a, b) => b.stars - a.stars);

  console.log(`\nTop 20 newly discovered repos:`);
  for (const r of discovered.slice(0, 20)) {
    console.log(`  ${r.owner}/${r.name} — ${r.stars.toLocaleString()} ★ | ${r.forks.toLocaleString()} forks | ${r.language || 'N/A'}`);
  }

  // Insert into tracked_repos
  console.log(`\nAdding ${discovered.length} repos to tracked_repos...`);
  let added = 0;
  const batchSize = 50;

  for (let i = 0; i < discovered.length; i += batchSize) {
    const batch = discovered.slice(i, i + batchSize).map(r => ({
      repo_owner: r.owner,
      repo_name: r.name,
      github_repo_id: r.github_id,
      is_active: true,
      source: 'github_search_popular',
    }));

    const { error } = await supabase
      .from('tracked_repos')
      .upsert(batch, { onConflict: 'repo_owner,repo_name', ignoreDuplicates: true });

    if (error) {
      console.error(`  Error adding batch ${i}: ${error.message}`);
    } else {
      added += batch.length;
    }
  }
  console.log(`Added ${added} repos to tracked_repos.`);

  // Now collect current metrics for the new repos
  console.log(`\nCollecting current metrics for ${discovered.length} new repos...`);

  // First, get the tracked_repo_ids for our new repos
  const repoIdMap = new Map();
  for (let i = 0; i < discovered.length; i += 50) {
    const batch = discovered.slice(i, i + 50);
    for (const r of batch) {
      const { data } = await supabase
        .from('tracked_repos')
        .select('id')
        .eq('repo_owner', r.owner)
        .eq('repo_name', r.name)
        .limit(1);
      if (data?.[0]) {
        repoIdMap.set(`${r.owner}/${r.name}`, data[0].id);
      }
    }
  }

  // Insert today's metrics
  let metricsAdded = 0;
  for (let i = 0; i < discovered.length; i += 50) {
    const batch = discovered.slice(i, i + 50);
    const rows = batch
      .filter(r => repoIdMap.has(`${r.owner}/${r.name}`))
      .map(r => ({
        tracked_repo_id: repoIdMap.get(`${r.owner}/${r.name}`),
        collected_on: today,
        stars: r.stars,
        forks: r.forks,
      }));

    if (rows.length > 0) {
      const { error } = await supabase
        .from('repo_daily_metrics')
        .upsert(rows, { onConflict: 'tracked_repo_id,collected_on' });
      if (error) {
        console.error(`  Error adding metrics batch: ${error.message}`);
      } else {
        metricsAdded += rows.length;
      }
    }
  }
  console.log(`Added metrics for ${metricsAdded} repos.`);

  // Backfill star history
  if (!SKIP_BACKFILL) {
    console.log(`\nBackfilling star history for ${discovered.length} repos...`);
    console.log(`Dates: ${BACKFILL_DATES.map(d => `${d.label}=${d.date}`).join(', ')}`);

    let backfilled = 0;
    for (let i = 0; i < discovered.length; i++) {
      const r = discovered[i];
      const trackedId = repoIdMap.get(`${r.owner}/${r.name}`);
      if (!trackedId) continue;

      if (i % 25 === 0) {
        console.log(`[${i + 1}/${discovered.length}] ${r.owner}/${r.name} (${r.stars} ★, rate limit: ${coreRateRemaining})`);
      }

      let rows = [];

      if (r.stars === 0) {
        for (const { date } of BACKFILL_DATES) {
          rows.push({ tracked_repo_id: trackedId, collected_on: date, stars: 0, forks: r.forks });
        }
      } else if (r.stars <= 5000) {
        const starDates = await fetchAllStargazerDates(r.owner, r.name);
        if (starDates === null) continue;
        for (const { date } of BACKFILL_DATES) {
          rows.push({
            tracked_repo_id: trackedId,
            collected_on: date,
            stars: starsAsOf(starDates, date),
            forks: r.forks,
          });
        }
      } else {
        for (const { date } of BACKFILL_DATES) {
          const starsAtDate = await starsAsOfDate(r.owner, r.name, r.stars, date);
          if (starsAtDate === null) continue;
          rows.push({
            tracked_repo_id: trackedId,
            collected_on: date,
            stars: starsAtDate,
            forks: r.forks,
          });
        }
      }

      if (rows.length > 0) {
        const { error } = await supabase
          .from('repo_daily_metrics')
          .upsert(rows, { onConflict: 'tracked_repo_id,collected_on' });
        if (error) {
          console.error(`  Error backfilling ${r.owner}/${r.name}: ${error.message}`);
        } else {
          backfilled++;
        }
      }
      await sleep(20);
    }
    console.log(`Backfilled ${backfilled} repos.`);
  }

  // Refresh the materialized table
  console.log('\nRefreshing repo_growth_metrics...');
  const { data: refreshed, error: refreshErr } = await supabase.rpc('refresh_repo_growth_metrics');
  if (refreshErr) {
    console.error('Refresh failed:', refreshErr.message);
  } else {
    console.log(`Refreshed ${refreshed} rows.`);
  }

  console.log('\n✓ Done!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
