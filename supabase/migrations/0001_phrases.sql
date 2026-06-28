create table public.phrases (
  id          uuid primary key default gen_random_uuid(),
  verb        text not null,
  sentence    text not null,
  answer      text not null,
  type        text not null,
  person      text not null,
  tense       text not null,
  created_at  timestamptz not null default now()
);

create index phrases_tense_idx on public.phrases (tense);
create index phrases_type_idx  on public.phrases (type);

alter table public.phrases enable row level security;

create policy "Phrases are readable by authenticated users"
  on public.phrases for select
  to authenticated
  using (true);
