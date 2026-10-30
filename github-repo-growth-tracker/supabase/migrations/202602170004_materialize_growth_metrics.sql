-- Replace the slow view with a materialized table + refresh function.
-- The view computed 4 lateral joins per repo on every query.
-- This table is refreshed once after each collection run.

-- 1. Drop the existing view
drop view if exists public.repo_growth_metrics;

-- 2. Create a real table with the same shape + current totals
create table if not exists public.repo_growth_metrics (
  repo_id bigint,
  repo_owner text not null,
  repo_name text not null,
  repo_url text not null,
  collected_on date,
  current_stars integer not null default 0,
  current_forks integer not null default 0,
  one_day_stars integer not null default 0,
  one_day_forks integer not null default 0,
  seven_day_stars integer not null default 0,
  seven_day_forks integer not null default 0,
  one_month_stars integer not null default 0,
  one_month_forks integer not null default 0,
  three_month_stars integer not null default 0,
  three_month_forks integer not null default 0,
  refreshed_at timestamptz not null default now(),
  constraint repo_growth_metrics_pk primary key (repo_owner, repo_name)
);

-- 3. Indexes for every sortable column the frontend uses
create index if not exists rgm_current_stars_idx     on public.repo_growth_metrics (current_stars desc);
create index if not exists rgm_current_forks_idx     on public.repo_growth_metrics (current_forks desc);
create index if not exists rgm_one_day_stars_idx     on public.repo_growth_metrics (one_day_stars desc);
create index if not exists rgm_one_day_forks_idx     on public.repo_growth_metrics (one_day_forks desc);
create index if not exists rgm_seven_day_stars_idx   on public.repo_growth_metrics (seven_day_stars desc);
create index if not exists rgm_seven_day_forks_idx   on public.repo_growth_metrics (seven_day_forks desc);
create index if not exists rgm_one_month_stars_idx   on public.repo_growth_metrics (one_month_stars desc);
create index if not exists rgm_one_month_forks_idx   on public.repo_growth_metrics (one_month_forks desc);
create index if not exists rgm_three_month_stars_idx on public.repo_growth_metrics (three_month_stars desc);
create index if not exists rgm_three_month_forks_idx on public.repo_growth_metrics (three_month_forks desc);
create index if not exists rgm_repo_owner_name_idx   on public.repo_growth_metrics (repo_owner, repo_name);
create index if not exists rgm_collected_on_idx      on public.repo_growth_metrics (collected_on desc);

-- 4. Function to fully refresh the table
create or replace function public.refresh_repo_growth_metrics()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  row_count bigint;
begin
  truncate public.repo_growth_metrics;

  insert into public.repo_growth_metrics (
    repo_id, repo_owner, repo_name, repo_url, collected_on,
    current_stars, current_forks,
    one_day_stars, one_day_forks,
    seven_day_stars, seven_day_forks,
    one_month_stars, one_month_forks,
    three_month_stars, three_month_forks,
    refreshed_at
  )
  with latest as (
    select distinct on (m.tracked_repo_id)
      m.tracked_repo_id,
      m.collected_on,
      m.stars,
      m.forks
    from public.repo_daily_metrics m
    order by m.tracked_repo_id, m.collected_on desc
  )
  select
    r.github_repo_id,
    r.repo_owner,
    r.repo_name,
    r.repo_url,
    l.collected_on,
    l.stars,
    l.forks,
    (l.stars - coalesce(m1.stars,  l.stars))::integer,
    (l.forks - coalesce(m1.forks,  l.forks))::integer,
    (l.stars - coalesce(m7.stars,  l.stars))::integer,
    (l.forks - coalesce(m7.forks,  l.forks))::integer,
    (l.stars - coalesce(m30.stars, l.stars))::integer,
    (l.forks - coalesce(m30.forks, l.forks))::integer,
    (l.stars - coalesce(m90.stars, l.stars))::integer,
    (l.forks - coalesce(m90.forks, l.forks))::integer,
    now()
  from latest l
  join public.tracked_repos r on r.id = l.tracked_repo_id
  left join lateral (
    select m.stars, m.forks from public.repo_daily_metrics m
    where m.tracked_repo_id = r.id
      and m.collected_on <= (l.collected_on - interval '1 day')::date
    order by m.collected_on desc limit 1
  ) m1 on true
  left join lateral (
    select m.stars, m.forks from public.repo_daily_metrics m
    where m.tracked_repo_id = r.id
      and m.collected_on <= (l.collected_on - interval '7 days')::date
    order by m.collected_on desc limit 1
  ) m7 on true
  left join lateral (
    select m.stars, m.forks from public.repo_daily_metrics m
    where m.tracked_repo_id = r.id
      and m.collected_on <= (l.collected_on - interval '1 month')::date
    order by m.collected_on desc limit 1
  ) m30 on true
  left join lateral (
    select m.stars, m.forks from public.repo_daily_metrics m
    where m.tracked_repo_id = r.id
      and m.collected_on <= (l.collected_on - interval '3 months')::date
    order by m.collected_on desc limit 1
  ) m90 on true
  where r.is_active = true;

  get diagnostics row_count = row_count;
  return row_count;
end;
$$;

-- 5. RLS + permissions (same as the old view)
alter table public.repo_growth_metrics enable row level security;

drop policy if exists "Public read repo growth metrics" on public.repo_growth_metrics;
create policy "Public read repo growth metrics"
  on public.repo_growth_metrics
  for select
  using (true);

grant select on public.repo_growth_metrics to anon, authenticated;
grant execute on function public.refresh_repo_growth_metrics() to service_role;

-- 6. Do an initial populate
select public.refresh_repo_growth_metrics();
