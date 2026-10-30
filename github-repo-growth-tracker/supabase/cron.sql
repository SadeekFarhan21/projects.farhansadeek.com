-- Run this in Supabase SQL Editor after deploying the collect-metrics function.
-- This schedules the collector once per day at 12:00 AM UTC.
-- Replace the placeholders before running.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('collect_repo_metrics_daily')
where exists (
  select 1
  from cron.job
  where jobname = 'collect_repo_metrics_daily'
);

select cron.schedule(
  'collect_repo_metrics_daily',
  '0 0 * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.functions.supabase.co/collect-metrics',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_CRON_SECRET'
    ),
    body := '{}'::jsonb
  );
  $$
);
