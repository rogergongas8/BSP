alter table public.phrases add column if not exists expected_stem text;
alter table public.phrases add column if not exists stem_group   text;
