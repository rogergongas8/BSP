-- Tracking needed to make every achievement in src/lib/achievements.ts actually earnable:
-- games_won backs "campeones"; the daily-challenge columns + table back "reto_aceptado" and "vaya_semana".
-- ("cambio_de_look", "cata_juegos", "exterminador" need no new storage — they were just never checked.)

alter table public.profiles add column if not exists games_won integer not null default 0;
alter table public.profiles add column if not exists daily_challenges_completed integer not null default 0;
alter table public.profiles add column if not exists daily_challenge_streak integer not null default 0;
alter table public.profiles add column if not exists last_daily_challenge_date date;

create table if not exists public.daily_challenge_completions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  completion_date  date not null default current_date,
  created_at       timestamptz not null default now(),
  unique (user_id, completion_date)
);

create index if not exists daily_challenge_completions_user_idx on public.daily_challenge_completions (user_id);

alter table public.daily_challenge_completions enable row level security;

create policy "Users can read own daily challenge completions"
  on public.daily_challenge_completions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own daily challenge completions"
  on public.daily_challenge_completions for insert
  to authenticated
  with check (auth.uid() = user_id);
