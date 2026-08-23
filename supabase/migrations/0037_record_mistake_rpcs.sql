-- Wrong answers on an already-open mistake hit the partial unique index and Postgres logged a
-- 23505 for each one. The routes already swallowed the error, so nothing was broken for the user —
-- but the Supabase log filled with noise. These RPCs let Postgres skip the duplicate silently
-- (on conflict do nothing) instead of raising, so no error is ever logged.

create or replace function public.record_phrase_mistake(
  p_phrase_id   uuid,
  p_tense       text,
  p_phrase_type text
)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.phrase_mistakes (user_id, phrase_id, tense, phrase_type)
  values (auth.uid(), p_phrase_id, p_tense, p_phrase_type)
  on conflict (user_id, phrase_id) where resolved_at is null do nothing;
$$;

create or replace function public.record_contrast_mistake(
  p_contrast_phrase_id uuid,
  p_battle_id          text
)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.contrast_mistakes (user_id, contrast_phrase_id, battle_id)
  values (auth.uid(), p_contrast_phrase_id, p_battle_id)
  on conflict (user_id, contrast_phrase_id) where resolved_at is null do nothing;
$$;

grant execute on function public.record_phrase_mistake(uuid, text, text) to authenticated;
grant execute on function public.record_contrast_mistake(uuid, text) to authenticated;
