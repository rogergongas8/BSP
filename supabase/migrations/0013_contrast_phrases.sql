create table if not exists public.contrast_phrases (
  id                  uuid primary key default gen_random_uuid(),
  battle_id           text not null,
  sentence            text not null,
  infinitive_1        text not null,
  option_a_1          text not null,
  option_b_1          text not null,
  correct_1           smallint not null check (correct_1 in (1, 2)),
  infinitive_2        text,
  option_a_2          text,
  option_b_2          text,
  correct_2           smallint check (correct_2 in (1, 2)),
  created_at          timestamptz not null default now(),
  constraint contrast_phrases_hueco2_consistent check (
    (infinitive_2 is null and option_a_2 is null and option_b_2 is null and correct_2 is null)
    or
    (infinitive_2 is not null and option_a_2 is not null and option_b_2 is not null and correct_2 is not null)
  )
);

create index if not exists contrast_phrases_battle_idx on public.contrast_phrases (battle_id);

alter table public.contrast_phrases enable row level security;

drop policy if exists "Contrast phrases are readable by authenticated users" on public.contrast_phrases;
create policy "Contrast phrases are readable by authenticated users"
  on public.contrast_phrases for select
  to authenticated
  using (true);
