insert into public.tracked_repos (repo_owner, repo_name)
values
  ('withastro', 'astro'),
  ('supabase', 'supabase')
on conflict (repo_owner, repo_name) do nothing;
