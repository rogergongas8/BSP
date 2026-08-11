alter table public.practice_sessions
  add column if not exists client_session_id uuid;

create unique index if not exists practice_sessions_client_session_idx
  on public.practice_sessions (user_id, client_session_id)
  where client_session_id is not null;
