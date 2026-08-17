-- Backfill a migration for a constraint the live database already has.
--
-- Every seed script upserts into `phrases` with `onConflict: 'sentence'`, which Postgres only
-- accepts when a unique index covers that column. The index exists in production (the upserts
-- work), but no migration ever declared it — it was created out of band. That means
-- `supabase db reset` produced a schema where every phrase seed failed, and the drift was
-- invisible until someone reset locally.
--
-- `if not exists` makes this a no-op against the live database and the missing piece
-- everywhere else. Kept as an index rather than a table constraint so re-running is safe.
create unique index if not exists phrases_sentence_uidx
  on public.phrases (sentence);
