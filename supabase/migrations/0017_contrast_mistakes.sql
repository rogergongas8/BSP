create table if not exists public.contrast_mistakes (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  contrast_phrase_id uuid not null references public.contrast_phrases(id) on delete cascade,
  battle_id          text not null,
  resolved_at        timestamptz,
  created_at         timestamptz not null default now()
);

create index if not exists contrast_mistakes_user_idx on public.contrast_mistakes (user_id);
create index if not exists contrast_mistakes_user_open_idx on public.contrast_mistakes (user_id, battle_id) where resolved_at is null;

alter table public.contrast_mistakes enable row level security;

drop policy if exists "Users can read own contrast mistakes" on public.contrast_mistakes;
create policy "Users can read own contrast mistakes"
  on public.contrast_mistakes for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own contrast mistakes" on public.contrast_mistakes;
create policy "Users can insert own contrast mistakes"
  on public.contrast_mistakes for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own contrast mistakes" on public.contrast_mistakes;
create policy "Users can update own contrast mistakes"
  on public.contrast_mistakes for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
