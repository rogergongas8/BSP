alter table public.practice_sessions
  add column if not exists duration_seconds integer not null default 0;
