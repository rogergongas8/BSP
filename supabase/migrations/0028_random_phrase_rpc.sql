-- Pick a random phrase in one round trip instead of two.
--
-- /api/phrases/random and /api/contrast-phrases/random ran a COUNT over the whole pool, then
-- a second query with a random OFFSET. Two round trips per question, and with the fallback
-- path (retry without exclusions when the pool is exhausted) it could reach four. During a
-- class that is the hottest query in the app — every student, every question.
--
-- These functions do the same selection inside Postgres with a single statement. The COUNT
-- disappears entirely: `order by random() limit 1` scans the (small, indexed) candidate set
-- once. With pools of a few hundred rows this is comfortably faster than the round trip it
-- replaces, and it removes the count/offset race where a concurrent insert could shift rows
-- between the two queries and return nothing.
--
-- SECURITY DEFINER so the function keeps working under the column grants from 0025: the
-- `authenticated` role cannot read `answer` / `correct_1` / `correct_2` directly, and these
-- functions are only ever called from server routes holding the service role. `search_path`
-- is pinned so a caller cannot shadow `public` with their own schema.

-- Index the columns the candidate filter uses. `phrases.tense` already has one from 0001;
-- contrast_phrases.battle_id does not.
create index if not exists contrast_phrases_battle_idx
  on public.contrast_phrases (battle_id);

-- Escribiendo: one random phrase for a tense, optionally excluding ids already served.
create or replace function public.random_phrase(
  p_tense   text,
  p_exclude uuid[] default '{}'
)
returns table (
  id            uuid,
  verb          text,
  sentence      text,
  answer        text,
  type          text,
  person        text,
  expected_stem text,
  stem_group    text
)
language sql
security definer
set search_path = public
as $$
  -- Prefer an unseen phrase; if every phrase has been served, fall back to the whole pool
  -- rather than returning nothing (mirrors the previous two-pass behaviour).
  with candidates as (
    select p.* from public.phrases p
    where p.tense = p_tense
      and not (p.id = any(p_exclude))
  ),
  fallback as (
    select p.* from public.phrases p
    where p.tense = p_tense
  )
  select c.id, c.verb, c.sentence, c.answer, c.type, c.person, c.expected_stem, c.stem_group
  from (
    select * from candidates
    union all
    select * from fallback where not exists (select 1 from candidates)
  ) c
  order by random()
  limit 1;
$$;

-- Lío de tiempos: same idea. `p_battles` is an array because the javi-mimo-zas combo draws
-- from both underlying battles.
create or replace function public.random_contrast_phrase(
  p_battles text[],
  p_exclude uuid[] default '{}'
)
returns table (
  id           uuid,
  battle_id    text,
  sentence     text,
  infinitive_1 text,
  option_a_1   text,
  option_b_1   text,
  correct_1    smallint,
  infinitive_2 text,
  option_a_2   text,
  option_b_2   text,
  correct_2    smallint
)
language sql
security definer
set search_path = public
as $$
  with candidates as (
    select p.* from public.contrast_phrases p
    where p.battle_id = any(p_battles)
      and not (p.id = any(p_exclude))
  ),
  fallback as (
    select p.* from public.contrast_phrases p
    where p.battle_id = any(p_battles)
  )
  select c.id, c.battle_id, c.sentence,
         c.infinitive_1, c.option_a_1, c.option_b_1, c.correct_1,
         c.infinitive_2, c.option_a_2, c.option_b_2, c.correct_2
  from (
    select * from candidates
    union all
    select * from fallback where not exists (select 1 from candidates)
  ) c
  order by random()
  limit 1;
$$;

-- These return answer keys, so only the service role may call them. Revoking from
-- authenticated/anon keeps them off the public PostgREST surface.
revoke all on function public.random_phrase(text, uuid[]) from public, anon, authenticated;
revoke all on function public.random_contrast_phrase(text[], uuid[]) from public, anon, authenticated;
grant execute on function public.random_phrase(text, uuid[]) to service_role;
grant execute on function public.random_contrast_phrase(text[], uuid[]) to service_role;
