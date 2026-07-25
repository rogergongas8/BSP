create table if not exists public.phrase_mistakes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  phrase_id    uuid not null references public.phrases(id) on delete cascade,
  tense        text not null,
  phrase_type  text not null,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists phrase_mistakes_user_idx on public.phrase_mistakes (user_id);
create index if not exists phrase_mistakes_user_open_idx on public.phrase_mistakes (user_id, tense) where resolved_at is null;

alter table public.phrase_mistakes enable row level security;

create policy "Users can read own mistakes"
  on public.phrase_mistakes for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own mistakes"
  on public.phrase_mistakes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own mistakes"
  on public.phrase_mistakes for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
