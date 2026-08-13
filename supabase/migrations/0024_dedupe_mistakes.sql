-- Every wrong answer inserted a fresh phrase_mistakes/contrast_mistakes row, even when an
-- unresolved one for that exact phrase already existed. Getting the same phrase wrong across
-- multiple sessions before mastering it piled up duplicate open rows, inflating the "N mistakes"
-- counts shown in Review — and since resolving matches on phrase_id (not row id), one correct
-- answer could clear several counted "mistakes" at once, making the count jump unpredictably.

-- One-time cleanup: collapse duplicate open rows down to the most recent one per phrase.
delete from public.phrase_mistakes a
using public.phrase_mistakes b
where a.resolved_at is null
  and b.resolved_at is null
  and a.user_id = b.user_id
  and a.phrase_id = b.phrase_id
  and a.created_at < b.created_at;

delete from public.contrast_mistakes a
using public.contrast_mistakes b
where a.resolved_at is null
  and b.resolved_at is null
  and a.user_id = b.user_id
  and a.contrast_phrase_id = b.contrast_phrase_id
  and a.created_at < b.created_at;

-- Going forward: at most one open (unresolved) mistake per phrase per user.
create unique index if not exists phrase_mistakes_user_phrase_open_uidx
  on public.phrase_mistakes (user_id, phrase_id)
  where resolved_at is null;

create unique index if not exists contrast_mistakes_user_phrase_open_uidx
  on public.contrast_mistakes (user_id, contrast_phrase_id)
  where resolved_at is null;
