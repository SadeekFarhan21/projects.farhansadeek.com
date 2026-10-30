# GitHub Public Repo Growth Tracker (Astro + Supabase)

Serverless app that incrementally discovers public GitHub repositories and stores daily stars/forks snapshots. The dashboard shows **change** over 1 day, 7 days, 1 month, and 3 months.

## Important Scale Note

Scraping every public GitHub repository in one run is not realistic. This project handles it incrementally:

- each run discovers the next page(s) of public repos (`/repositories?since=...`)
- each run snapshots a batch of repos into `repo_daily_metrics`
- over time, coverage grows continuously

## Stack

- Astro frontend (static)
- Supabase Postgres
- Supabase Edge Function (`collect-metrics`)
- Supabase `pg_cron` + `pg_net`

## Database Objects

- `tracked_repos`: discovered/manual repos
- `repo_daily_metrics`: daily stars/forks snapshots
- `collector_state`: persistent cursor for public discovery
- `repos_collection_queue` (view): least-recently-collected repos
- `repo_growth_metrics` (view): requested delta fields

`repo_growth_metrics` columns:

- `repo_id`
- `repo_owner`
- `repo_name`
- `repo_url`
- `three_month_stars`
- `three_month_forks`
- `one_month_stars`
- `one_month_forks`
- `seven_day_stars`
- `seven_day_forks`
- `one_day_stars`
- `one_day_forks`

These are **changes**, not total counts.

## Local Frontend Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Required in `.env`:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`

## Supabase Setup

1. Apply migrations:

- `supabase/migrations/202602170001_init.sql`
- `supabase/migrations/202602170002_public_repo_growth.sql`
- `supabase/migrations/202602170003_fix_github_repo_id_conflict.sql`

2. Deploy function:

```bash
supabase functions deploy collect-metrics
```

3. Set secrets:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY='YOUR_SERVICE_ROLE_KEY'
supabase secrets set GITHUB_TOKEN='YOUR_GITHUB_TOKEN'
supabase secrets set CRON_SECRET='YOUR_CRON_SECRET'
```

Optional tuning secrets:

```bash
supabase secrets set DISCOVER_PUBLIC_REPOS='true'
supabase secrets set DISCOVERY_PAGES_PER_RUN='2'
supabase secrets set DISCOVERY_PAGE_SIZE='100'
supabase secrets set METRICS_BATCH_SIZE='250'
```

4. Schedule daily run (midnight UTC):

- Edit placeholders in `supabase/cron.sql`
- Run it in Supabase SQL editor

## Manual Trigger

```bash
curl -X POST "https://YOUR_PROJECT_REF.functions.supabase.co/collect-metrics" \
  -H "x-cron-secret: YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Bulk Bootstrap (Populate Faster)

Run many collector executions back-to-back:

```bash
cd github-repo-growth-tracker
SUPABASE_PROJECT_REF=YOUR_PROJECT_REF \
CRON_SECRET=YOUR_CRON_SECRET \
RUNS=200 \
SLEEP_SECONDS=1 \
./scripts/bootstrap-public-repos.sh
```

## Run Every Minute

Use the Node poller (`scripts/poll-collect-metrics-minute.js`) to call `collect-metrics` continuously every 600 seconds.

```bash
cd github-repo-growth-tracker
npm run ingest:minute
```

Optional controls:

- `INTERVAL_SECONDS`: default `600`
- `MAX_RUNS`: default `0` (infinite)
- `FUNCTION_NAME`: default `collect-metrics`

Example (run for 30 minutes and stop):

```bash
cd github-repo-growth-tracker
INTERVAL_SECONDS=600 MAX_RUNS=30 npm run ingest:minute
```

## Query the Requested Fields

```sql
select
  repo_id,
  repo_owner,
  repo_name,
  repo_url,
  three_month_stars,
  three_month_forks,
  one_month_stars,
  one_month_forks,
  seven_day_stars,
  seven_day_forks,
  one_day_stars,
  one_day_forks
from public.repo_growth_metrics
order by three_month_stars desc
limit 200;
```
