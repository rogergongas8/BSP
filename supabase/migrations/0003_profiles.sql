-- profiles: one row per auth user
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  username            text not null unique,
  total_xp            integer not null default 0,
  streak              integer not null default 0,
  activities_completed integer not null default 0,
  top3_finishes       integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles (username);

alter table public.profiles enable row level security;

-- Anyone authenticated can read profiles (leaderboard, multiplayer)
drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
create policy "Profiles are readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can only update their own profile
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- user_achievements: one row per unlocked achievement per user
create table if not exists public.user_achievements (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null,
  unlocked_at    timestamptz not null default now(),
  unique (user_id, achievement_id)
);

create index if not exists user_achievements_user_idx on public.user_achievements (user_id);

alter table public.user_achievements enable row level security;

-- Anyone authenticated can read achievements (profile display)
drop policy if exists "Achievements are readable by authenticated users" on public.user_achievements;
create policy "Achievements are readable by authenticated users"
  on public.user_achievements for select
  to authenticated
  using (true);

-- Only service role can insert/update achievements (anti-cheat)
-- (no insert/update policy for authenticated — must go through server)

-- Auto-create profile when a new auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    split_part(new.email, '@', 1)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at current
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
