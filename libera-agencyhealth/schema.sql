-- =========================================
-- AGENCYHEALTH SCHEMA + RLS
-- Run in Supabase SQL editor.
-- =========================================

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  current_mood text default 'neutral',
  filter_settings jsonb not null default
    '{"blackAndWhite": false, "halfSpeedScroll": false, "restrictNotifications": false}'::jsonb,
  created_at timestamptz default now()
);

create table public.streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  current_streak int not null default 0,
  last_activity_date date,
  unique(user_id)
);

create table public.biometrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text check (provider in ('strava','apple','google')),
  sync_status text default 'disconnected',
  general_mood_approximation text,
  updated_at timestamptz default now()
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('eft','meditation','breathwork','reflection')),
  title text not null,
  is_eft_core boolean not null default false,
  content text,
  created_at timestamptz default now()
);

-- Auto-provision user + streak row on signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email) values (new.id, new.email);
  insert into public.streaks (user_id) values (new.id);
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.users      enable row level security;
alter table public.streaks    enable row level security;
alter table public.biometrics enable row level security;
alter table public.exercises  enable row level security;

create policy "users self read"     on public.users      for select using (auth.uid() = id);
create policy "users self update"   on public.users      for update using (auth.uid() = id);
create policy "streaks self all"    on public.streaks    for all    using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "biometrics self all" on public.biometrics for all    using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "exercises read all"  on public.exercises  for select using (auth.role() = 'authenticated');
