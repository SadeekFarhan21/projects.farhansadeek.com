#!/usr/bin/env node

/**
 * Backfill historical star counts using the GitHub Stargazers API.
 *
 * Targets repos that already have today's snapshot but lack historical data.
 * Processes repos ordered by star count DESC so the most popular repos get
 * backfilled first — these are the ones users actually want to see deltas for.
 *
 * For repos with many stars (>10k), uses page-count estimation instead of
 * fetching every stargazer, which is much faster.
 *
 * Usage:
 *   node scripts/backfill-star-history.js
 *
 * Reads all credentials from .env automatically.
 *
 * Options (env vars):
 *   BACKFILL_LIMIT       - max repos to process (default: 500)
 *   BACKFILL_OFFSET      - skip first N repos (default: 0, for resuming)
 *   MAX_STARS_FULL_FETCH - repos with more stars than this use estimation (default: 5000)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Load .env manually (no dotenv dependency) ──
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx);
      const val = trimmed.slice(eqIdx + 1);
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch { /* no .env, that's fine */ }
}

loadEnv();

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN?.trim() || null;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

if (!GITHUB_TOKEN) {
  console.error('Missing GITHUB_TOKEN — needed for stargazer timestamps.');
  process.exit(1);
}

const LIMIT = parseInt(process.env.BACKFILL_LIMIT || '500', 10);
const OFFSET = parseInt(process.env.BACKFILL_OFFSET || '0', 10);
const MAX_STARS_FULL = parseInt(process.env.MAX_STARS_FULL_FETCH || '5000', 10);
const STAR_MIN = parseInt(process.env.STAR_MIN || '0', 10);
const STAR_MAX = parseInt(process.env.STAR_MAX || '999999999', 10);
const SORT_ORDER = process.env.SORT_ORDER || 'desc'; // 'asc' to do small repos first

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const ghHeaders = {
  Accept: 'application/vnd.github.v3.star+json',
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  'User-Agent': 'backfill-star-history',
};

const ghHeadersBasic = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  'User-Agent': 'backfill-star-history',
};

const now = new Date();
function daysAgo(n) {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Match the SQL: interval '1 day', '7 days', '1 month', '3 months'
function monthsAgo(n) {
  const d = new Date(now);
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

const today = daysAgo(0);
const BACKFILL_DATES = [
  { label: '1d',  date: daysAgo(1) },
  { label: '7d',  date: daysAgo(7) },
  { label: '1m',  date: monthsAgo(1) },
  { label: '3m',  date: monthsAgo(3) },
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let rateLimitRemaining = 5000;
let rateLimitReset = 0;

function updateRateLimit(res) {
  const rem = res.headers.get('x-ratelimit-remaining');
  const reset = res.headers.get('x-ratelimit-reset');
  if (rem) rateLimitRemaining = parseInt(rem, 10);
  if (reset) rateLimitReset = parseInt(reset, 10);
}

async function waitForRateLimit() {
  if (rateLimitRemaining < 50) {
    const waitMs = Math.max(0, rateLimitReset * 1000 - Date.now()) + 2000;
    console.log(`  ⏳ Rate limit low (${rateLimitRemaining} remaining). Waiting ${Math.ceil(waitMs / 1000)}s...`);
    await sleep(waitMs);
  }
}

/**
 * For repos with <= MAX_STARS_FULL stars: fetch all stargazer timestamps.
 * Returns sorted array of ISO date strings (YYYY-MM-DD).
 */
async function fetchAllStargazerDates(owner, name) {
  const dates = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    await waitForRateLimit();
    const url = `https://api.github.com/repos/${owner}/${name}/stargazers?per_page=${perPage}&page=${page}`;
    const res = await fetch(url, { headers: ghHeaders });
    updateRateLimit(res);

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

    for (const entry of body) {
      if (entry.starred_at) dates.push(entry.starred_at.slice(0, 10));
    }

    const link = res.headers.get('link');
    if (!link || !link.includes('rel="next"')) break;
    page++;
  }

  dates.sort();
  return dates;
}

/**
 * For repos with > MAX_STARS_FULL stars, we can't fetch all stargazers.
 * GitHub's stargazer API is limited to 400 pages (40,000 results).
 *
 * Strategy: Binary search using per_page=100, which gives us access to
 * up to 40,000 stars. For repos with >40k stars, we sample the accessible
 * range and extrapolate.
 *
 * Each binary search step costs 1 API call. With 4 dates and ~17 steps
 * per binary search (log2(40000)), that's ~68 calls per large repo.
 * To save API calls, we do a smarter approach: fetch a few sample pages,
 * build a date→position mapping, and interpolate.
 */

const PER_PAGE = 100;
const MAX_PAGE = 400; // GitHub's hard limit
const MAX_ACCESSIBLE_STARS = MAX_PAGE * PER_PAGE; // 40,000

/**
 * Get the date of the first stargazer on a specific page.
 * Returns null if the request fails.
 */
async function getPageDate(owner, name, page) {
  await waitForRateLimit();
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${name}/stargazers?per_page=${PER_PAGE}&page=${page}`,
    { headers: ghHeaders }
  );
  updateRateLimit(res);
  if (!res.ok) return null;
  const body = await res.json();
  if (!Array.isArray(body) || body.length === 0) return null;
  return body[0]?.starred_at?.slice(0, 10) || null;
}

/**
 * Binary search across pages to find the page where stars transition
 * from before/on targetDate to after targetDate.
 * Returns the approximate star count as of targetDate.
 *
 * For repos > 40k stars, we can only access the first 40k via API.
 * Strategy:
 * - If the boundary falls within the accessible range, scale proportionally.
 * - If all accessible stars are before the target date, we interpolate
 *   the remaining (40k..totalStars) using the time range between the last
 *   accessible star date and today.
 */
async function starsAsOfDatePageSearch(owner, name, totalStars, targetDate) {
  if (totalStars === 0) return 0;

  const maxPage = Math.min(Math.ceil(totalStars / PER_PAGE), MAX_PAGE);
  const accessibleStars = Math.min(totalStars, maxPage * PER_PAGE);

  // Check first page to get the earliest star date
  const firstDate = await getPageDate(owner, name, 1);
  if (firstDate === null) return null;
  if (firstDate > targetDate) return 0;

  // Check last accessible page
  const lastDate = await getPageDate(owner, name, maxPage);
  if (lastDate === null) return null;

  if (lastDate <= targetDate) {
    // All accessible stars are on or before target date.
    if (totalStars <= MAX_ACCESSIBLE_STARS) {
      return totalStars;
    }

    // More stars than we can see (> 40k).
    // Unseen stars (accessibleStars..totalStars) were earned between lastDate and today.
    const unseenStars = totalStars - accessibleStars;
    const lastMs = new Date(lastDate).getTime();
    const todayMs = new Date(today).getTime();
    const targetMs = new Date(targetDate).getTime();

    if (targetMs >= todayMs) return totalStars;
    if (targetMs <= lastMs) return accessibleStars;
    if (todayMs <= lastMs) return totalStars;

    // Linear interpolation of unseen stars between lastDate and today
    const fraction = (targetMs - lastMs) / (todayMs - lastMs);
    return accessibleStars + Math.round(unseenStars * fraction);
  }

  // Binary search across pages to find the transition point
  let lo = 1;
  let hi = maxPage;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const midDate = await getPageDate(owner, name, mid);
    if (midDate === null) return null;

    if (midDate <= targetDate) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  // Stars up to page (lo-1) are all on or before targetDate
  const starCount = (lo - 1) * PER_PAGE;

  // If total stars > accessible range, scale proportionally
  if (totalStars > MAX_ACCESSIBLE_STARS) {
    return Math.round(starCount * (totalStars / accessibleStars));
  }

  return starCount;
}

/**
 * Count how many stars existed on or before a given date (for small repos with full data).
 */
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
  // Fetch repos that have the most recent snapshot but need backfill.
  // Order by stars DESC so popular repos get done first.
  console.log('Finding repos that need backfill...');

  // Find the most recent collection dates (there may be multiple if collection
  // is in progress — e.g., 275 repos on Feb 20 and 12874 on Feb 17)
  const { data: recentDates } = await supabase
    .from('repo_daily_metrics')
    .select('collected_on')
    .order('collected_on', { ascending: false })
    .limit(1);

  const latestDate = recentDates?.[0]?.collected_on || today;
  console.log(`Latest collection date: ${latestDate}`);

  // Get ALL repos with a recent snapshot (last 7 days), keeping only the
  // most recent row per repo. This ensures we don't miss repos whose latest
  // data is a few days old.
  const cutoffDate = daysAgo(7);
  let rawRows = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('repo_daily_metrics')
      .select('tracked_repo_id, stars, forks, collected_on')
      .gte('collected_on', cutoffDate)
      .order('stars', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Failed to fetch metrics:', error.message);
      process.exit(1);
    }

    rawRows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  // Deduplicate: keep only the most recent row per tracked_repo_id
  const repoMap = new Map();
  for (const row of rawRows) {
    const existing = repoMap.get(row.tracked_repo_id);
    if (!existing || row.collected_on > existing.collected_on) {
      repoMap.set(row.tracked_repo_id, row);
    }
  }
  let allRepos = [...repoMap.values()];

  // Filter by star range if specified
  if (STAR_MIN > 0 || STAR_MAX < 999999999) {
    allRepos = allRepos.filter(r => r.stars >= STAR_MIN && r.stars <= STAR_MAX);
    console.log(`Filtered to ${allRepos.length} repos in star range ${STAR_MIN}-${STAR_MAX}.`);
  }

  // Sort order
  if (SORT_ORDER === 'asc') {
    allRepos.sort((a, b) => a.stars - b.stars);
  } else {
    allRepos.sort((a, b) => b.stars - a.stars);
  }

  console.log(`Found ${allRepos.length} repos with recent data (since ${cutoffDate}).`);

  // Filter to only repos that DON'T already have all 4 backfill dates
  // Use small batches because UUIDs in .in() create very long URLs
  const reposNeedingBackfill = [];
  const batchSize = 40;

  for (let i = 0; i < allRepos.length; i += batchSize) {
    const batch = allRepos.slice(i, i + batchSize);
    const ids = batch.map(r => r.tracked_repo_id);

    const { data: existingRows, error: existErr } = await supabase
      .from('repo_daily_metrics')
      .select('tracked_repo_id, collected_on')
      .in('tracked_repo_id', ids)
      .in('collected_on', BACKFILL_DATES.map(d => d.date));

    if (existErr) {
      // If check fails, assume they need backfill
      reposNeedingBackfill.push(...batch);
      continue;
    }

    const existing = new Set(
      (existingRows || []).map(r => `${r.tracked_repo_id}:${r.collected_on}`)
    );

    for (const repo of batch) {
      const hasAll = BACKFILL_DATES.every(
        d => existing.has(`${repo.tracked_repo_id}:${d.date}`)
      );
      if (!hasAll) {
        reposNeedingBackfill.push(repo);
      }
    }
  }

  console.log(`${reposNeedingBackfill.length} repos need backfill.`);

  // Apply offset/limit
  let repos = reposNeedingBackfill.slice(OFFSET, OFFSET + LIMIT);
  console.log(`Processing ${repos.length} repos (offset=${OFFSET}, limit=${LIMIT}).`);
  console.log(`Repos with > ${MAX_STARS_FULL} stars will use binary search (faster).`);
  console.log(`Backfill dates: ${BACKFILL_DATES.map(d => `${d.label}=${d.date}`).join(', ')}`);
  console.log(`Rate limit remaining: ${rateLimitRemaining}`);
  console.log('');

  // Get tracked_repo info for the repos we need
  // Use small batches because UUIDs in .in() create very long URLs
  const repoIds = repos.map(r => r.tracked_repo_id);
  const repoInfoMap = {};

  for (let i = 0; i < repoIds.length; i += 50) {
    const batchIds = repoIds.slice(i, i + 50);
    const { data: repoInfo, error: riErr } = await supabase
      .from('tracked_repos')
      .select('id, repo_owner, repo_name')
      .in('id', batchIds);

    if (riErr) {
      console.error(`  Error fetching tracked_repos batch ${i}: ${riErr.message}`);
      continue;
    }

    for (const r of (repoInfo || [])) {
      repoInfoMap[r.id] = r;
    }
  }

  console.log(`Loaded info for ${Object.keys(repoInfoMap).length} repos.`);

  let processed = 0;
  let backfilled = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    const info = repoInfoMap[repo.tracked_repo_id];
    if (!info) { skipped++; continue; }

    const ref = `${info.repo_owner}/${info.repo_name}`;
    const currentStars = repo.stars;
    const currentForks = repo.forks;

    if (i % 25 === 0 || i === 0) {
      console.log(`[${i + 1}/${repos.length}] ${ref} (${currentStars} ★, rate limit: ${rateLimitRemaining})`);
    }

    let rows = [];

    if (currentStars === 0) {
      // Zero stars — historical is also 0, trivial backfill
      for (const { date } of BACKFILL_DATES) {
        rows.push({
          tracked_repo_id: repo.tracked_repo_id,
          collected_on: date,
          stars: 0,
          forks: currentForks, // best estimate
        });
      }
    } else if (currentStars <= MAX_STARS_FULL) {
      // Small enough to fetch all stargazer timestamps
      const starDates = await fetchAllStargazerDates(info.repo_owner, info.repo_name);
      if (starDates === null) { skipped++; continue; }

      for (const { date } of BACKFILL_DATES) {
        rows.push({
          tracked_repo_id: repo.tracked_repo_id,
          collected_on: date,
          stars: starsAsOf(starDates, date),
          forks: currentForks,
        });
      }
    } else {
      // Large repo — use page-based binary search on stargazers API
      for (const { date, label } of BACKFILL_DATES) {
        const starsAtDate = await starsAsOfDatePageSearch(
          info.repo_owner, info.repo_name, currentStars, date
        );
        if (starsAtDate === null) {
          console.log(`  ⚠ Binary search failed for ${ref} at ${label}, skipping date`);
          continue;
        }
        rows.push({
          tracked_repo_id: repo.tracked_repo_id,
          collected_on: date,
          stars: starsAtDate,
          forks: currentForks,
        });
      }
    }

    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from('repo_daily_metrics')
        .upsert(rows, { onConflict: 'tracked_repo_id,collected_on' });

      if (upsertError) {
        console.error(`  Error upserting ${ref}: ${upsertError.message}`);
        errors++;
      } else {
        backfilled++;
      }
    }

    processed++;
    await sleep(20); // Small delay between repos
  }

  console.log('');
  console.log('── Backfill complete ──');
  console.log(`Processed: ${processed}`);
  console.log(`Backfilled: ${backfilled}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Rate limit remaining: ${rateLimitRemaining}`);

  // Refresh the materialized table
  console.log('');
  console.log('Refreshing repo_growth_metrics...');
  const { data: refreshed, error: refreshErr } = await supabase.rpc('refresh_repo_growth_metrics');
  if (refreshErr) {
    console.error('Refresh failed:', refreshErr.message);
  } else {
    console.log(`Refreshed ${refreshed} rows.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
