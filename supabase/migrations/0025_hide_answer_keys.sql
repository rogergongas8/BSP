-- Withhold the answer keys from the browser.
--
-- In a Battle the client subscribes to `rounds` and reads the joined phrase row straight from
-- PostgREST. RLS on `phrases` / `contrast_phrases` is `using (true)` for authenticated users,
-- and RLS filters rows, never columns — so `phrases.answer` and `contrast_phrases.correct_1/2`
-- were readable by any logged-in student. Worse, joining from `rounds` exposed the answers of
-- rounds that had not started yet, so the whole game could be read ahead of time:
--
--   GET /rest/v1/rounds?select=id,status,phrases(answer)&status=in.(pending,active)
--   -> [{"status":"pending","phrases":{"answer":"cené"}}, ...]
--
-- Column-level grants are the right tool here: they apply to the `authenticated` role only.
-- The service role bypasses them, so every server path keeps working unchanged — including
-- /api/phrases/random and /api/contrast-phrases/random, which feed singleplayer, where the
-- client legitimately needs the key to validate locally for instant feedback.
--
-- Requires the matching client change: the Battle round select must no longer ask for the
-- key columns, or PostgREST returns a permission error for the whole request. The key now
-- reaches the client only via GET /api/rounds/[id]/results, which gates on the round having
-- reached results/scoreboard/done.

-- `revoke ... on table` drops the table-wide grant; the column grants below then become the
-- only SELECT the role has. Both statements are required: a table-level SELECT grant would
-- otherwise override the narrower column list.
revoke select on table public.phrases from authenticated;
revoke select on table public.contrast_phrases from authenticated;

-- Everything needed to render a question — minus `answer`.
grant select (
  id, verb, sentence, type, person, tense, expected_stem, stem_group, created_at
) on table public.phrases to authenticated;

-- Everything needed to render a contrast question — minus `correct_1` / `correct_2`.
-- The gap-2 columns stay readable: the UI needs option_a_2/option_b_2 to know a second gap
-- exists (see phraseGapCount), and they do not reveal which option is right.
grant select (
  id, battle_id, sentence,
  infinitive_1, option_a_1, option_b_1,
  infinitive_2, option_a_2, option_b_2,
  created_at
) on table public.contrast_phrases to authenticated;
