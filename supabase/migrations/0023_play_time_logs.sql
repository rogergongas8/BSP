-- Multiplayer games contributed nothing to "Total practice time" / the weekly chart on the profile page —
-- only singleplayer practice_sessions.duration_seconds was ever summed. This logs actual wall-clock time
-- spent in a multiplayer match so it can be folded into the same stats.
-- All writes go through the service role (admin client) — no INSERT policy, same convention as round_answers.
create table if not exists public.play_time_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  seconds    integer not null check (seconds >= 0),
  source     text not null check (source in ('multiplayer')),
  logged_at  timestamptz not null default now()
);

create index if not exists play_time_logs_user_idx on public.play_time_logs (user_id);

alter table public.play_time_logs enable row level security;

create policy "Users can read own play time logs"
  on public.play_time_logs for select
  to authenticated
  using (auth.uid() = user_id);
