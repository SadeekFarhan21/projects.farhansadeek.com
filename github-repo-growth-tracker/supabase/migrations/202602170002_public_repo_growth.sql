alter table public.tracked_repos
  add column if not exists github_repo_id bigint,
  add column if not exists source text not null default 'manual',
  add column if not exists discovered_at timestamptz not null default now();

create unique index if not exists tracked_repos_github_repo_id_unique
  on public.tracked_repos (github_repo_id);

create table if not exists public.collector_state (
  id integer primary key check (id = 1),
  discovery_since_id bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.collector_state (id, discovery_since_id)
values (1, 0)
on conflict (id) do nothing;

create or replace view public.repos_collection_queue as
select
  r.id as tracked_repo_id,
  r.github_repo_id,
  r.repo_owner,
  r.repo_name,
  max(m.collected_on) as last_collected_on
from public.tracked_repos r
left join public.repo_daily_metrics m
  on m.tracked_repo_id = r.id
where r.is_active = true
group by r.id, r.github_repo_id, r.repo_owner, r.repo_name;

create or replace view public.repo_growth_metrics as
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
  r.github_repo_id as repo_id,
  r.repo_owner,
  r.repo_name,
  r.repo_url,
  l.collected_on as collected_on,
  (l.stars - coalesce(m90.stars, l.stars))::integer as three_month_stars,
  (l.forks - coalesce(m90.forks, l.forks))::integer as three_month_forks,
  (l.stars - coalesce(m30.stars, l.stars))::integer as one_month_stars,
  (l.forks - coalesce(m30.forks, l.forks))::integer as one_month_forks,
  (l.stars - coalesce(m7.stars, l.stars))::integer as seven_day_stars,
  (l.forks - coalesce(m7.forks, l.forks))::integer as seven_day_forks,
  (l.stars - coalesce(m1.stars, l.stars))::integer as one_day_stars,
  (l.forks - coalesce(m1.forks, l.forks))::integer as one_day_forks
from latest l
join public.tracked_repos r
  on r.id = l.tracked_repo_id
left join lateral (
  select m.stars, m.forks
  from public.repo_daily_metrics m
  where m.tracked_repo_id = r.id
    and m.collected_on <= (l.collected_on - interval '3 months')::date
  order by m.collected_on desc
  limit 1
) m90 on true
left join lateral (
  select m.stars, m.forks
  from public.repo_daily_metrics m
  where m.tracked_repo_id = r.id
    and m.collected_on <= (l.collected_on - interval '1 month')::date
  order by m.collected_on desc
  limit 1
) m30 on true
left join lateral (
  select m.stars, m.forks
  from public.repo_daily_metrics m
  where m.tracked_repo_id = r.id
    and m.collected_on <= (l.collected_on - interval '7 days')::date
  order by m.collected_on desc
  limit 1
) m7 on true
left join lateral (
  select m.stars, m.forks
  from public.repo_daily_metrics m
  where m.tracked_repo_id = r.id
    and m.collected_on <= (l.collected_on - interval '1 day')::date
  order by m.collected_on desc
  limit 1
) m1 on true
where r.is_active = true;

grant select on public.repos_collection_queue to anon, authenticated;
grant select on public.repo_growth_metrics to anon, authenticated;
