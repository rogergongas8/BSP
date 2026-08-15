create table if not exists public.practice_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  tense       text not null,
  total       integer not null,
  correct     integer not null,
  first_try   integer not null default 0,
  with_hints  integer not null default 0,
  skipped     integer not null default 0,
  completed_at timestamptz not null default now()
);

create index if not exists practice_sessions_user_idx on public.practice_sessions (user_id);
create index if not exists practice_sessions_tense_idx on public.practice_sessions (user_id, tense);

alter table public.practice_sessions enable row level security;

-- Users can read only their own sessions
drop policy if exists "Users can read own sessions" on public.practice_sessions;
create policy "Users can read own sessions"
  on public.practice_sessions for select
  to authenticated
  using (auth.uid() = user_id);

-- Users can insert their own sessions
drop policy if exists "Users can insert own sessions" on public.practice_sessions;
create policy "Users can insert own sessions"
  on public.practice_sessions for insert
  to authenticated
  with check (auth.uid() = user_id);
