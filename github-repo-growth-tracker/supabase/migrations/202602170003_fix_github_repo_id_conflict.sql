-- Ensure ON CONFLICT (github_repo_id) can be used by the collector.
-- Postgres unique indexes allow multiple NULL values, so a full unique index is safe here.

drop index if exists public.tracked_repos_github_repo_id_unique;

create unique index if not exists tracked_repos_github_repo_id_unique
  on public.tracked_repos (github_repo_id);
