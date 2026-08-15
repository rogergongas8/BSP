-- Stop players from reading each other's answers while a round is still live.
--
-- round_answers had two permissive SELECT policies:
--   "Users can read own answers"                    -> auth.uid() = user_id
--   "Users can read aggregate answers after results" -> round is results/scoreboard/done
--
-- Permissive policies combine with OR, and the second one does not constrain user_id, so the
-- pair evaluated to "own rows, OR anyone's rows once the round is revealed" — but PostgREST
-- applies that per row, and the second branch was written to gate aggregates, not to be the
-- only guard. In practice a logged-in student could read every other player's row:
--
--   GET /rest/v1/round_answers?select=user_id,answer,is_correct&user_id=neq.<self>
--   -> [{"answer":"puse","is_correct":true,"points_awarded":112}, ...]
--
-- During a written round that is not just a scoreboard leak: another player's submitted
-- answer, with is_correct alongside it, *is* the answer.
--
-- Collapsed into a single policy with the same intent, expressed explicitly: your own row at
-- any time, anyone's row once the round has been revealed.
--
-- Note this also narrows the Realtime feed — Supabase applies RLS to postgres_changes — so a
-- player no longer receives INSERT events for other players' answers. The collecting-phase
-- "3/5 answered" counter therefore no longer comes from the table directly; it is served by
-- GET /api/rounds/[id]/answer-count, which returns totals only.

drop policy if exists "Users can read own answers" on public.round_answers;
drop policy if exists "Users can read aggregate answers after results" on public.round_answers;
drop policy if exists "Read own answers, or any answer once the round is revealed" on public.round_answers;

create policy "Read own answers, or any answer once the round is revealed"
  on public.round_answers for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.rounds r
      where r.id = round_answers.round_id
        and r.status in ('results', 'scoreboard', 'done')
    )
  );
