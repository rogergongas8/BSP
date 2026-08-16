-- Daily challenges become a pool of 50, picked by difficulty against the user's level,
-- replacing the fixed six that rotated on `day % 6`.
--
-- What changes and why:
--
-- 1. `difficulty` (easy|medium|hard) — the design rotates difficulty blocks by level:
--      level 1-2  -> Easy, Easy, Easy, Medium
--      level 3-5  -> Easy, Easy, Medium, Medium, Hard
--      level 6+   -> Easy, Medium, Hard, Medium, Hard
--    The rotation slot is derived from the day, then the challenge is picked from within
--    that difficulty — so a user sees a stable challenge for the whole day (progress must
--    not reset mid-day) while still drawing from the full pool over time.
--
-- 2. `day_index` loses its UNIQUE constraint and becomes nullable. With 50 rows selected by
--    difficulty, a per-day unique index is meaningless. Kept (unused) rather than dropped so
--    the column can be reused if the selection strategy changes again.
--
-- 3. The `type` check constraint is widened from 3 values to 11. Each type names how progress
--    is measured; src/lib/daily-challenges.ts holds the matching evaluator and the two must
--    stay in sync.
--
-- 4. `scope` narrows a challenge to one game family or one battle. NULL means "any activity".
--    Values match practice_sessions.tense, which stores either a tense id (escribiendo) or a
--    battle id (lío de tiempos) — see VALID_TENSES in /api/sessions.
--
-- Not included: challenges counting consecutive correct answers ("5 in a row") or Review
-- fixes. practice_sessions stores per-session totals, not the answer sequence, and nothing
-- marks a session as a Review redo. Those need new columns plus a client change, so they are
-- deliberately left out of this pool rather than shipped as challenges that never complete.

alter table public.daily_challenges
  add column if not exists difficulty text,
  add column if not exists scope      text;

-- Existing rows predate difficulty; give them one before the NOT NULL below.
update public.daily_challenges set difficulty = 'easy' where difficulty is null;

alter table public.daily_challenges
  alter column difficulty set not null,
  alter column day_index drop not null;

alter table public.daily_challenges
  drop constraint if exists daily_challenges_day_index_key;

alter table public.daily_challenges
  drop constraint if exists daily_challenges_difficulty_check;
alter table public.daily_challenges
  add constraint daily_challenges_difficulty_check
  check (difficulty in ('easy', 'medium', 'hard'));

-- Widen `type`. The old three are kept so existing rows stay valid.
alter table public.daily_challenges
  drop constraint if exists daily_challenges_type_check;
alter table public.daily_challenges
  add constraint daily_challenges_type_check check (type in (
    'activities',        -- finish N sessions (scope optional)
    'tense_correct',     -- N correct in one tense/battle (scope required)
    'cross_correct',     -- N correct across everything
    'correct_no_hints',  -- N correct answered first try, no hint used
    'written_correct',   -- N correct in escribiendo (written) modes
    'choice_correct',    -- N correct in lío de tiempos (choice) modes
    'written_and_choice',-- N correct in BOTH families (target applies to each)
    'score_pct',         -- score >= target% in a single session (scope optional)
    'score_pct_games',   -- score >= target% in N separate sessions (uses target_secondary)
    'games_in_category', -- N sessions within one scope
    'no_skip_games'      -- N sessions finished without skipping
  ));

-- Some challenges need a second number ("70%+ in 2 games", "N games in one category").
alter table public.daily_challenges
  add column if not exists target_secondary integer;

create index if not exists daily_challenges_difficulty_idx
  on public.daily_challenges (difficulty);

-- Rebuild the pool from scratch so re-running is idempotent and the six legacy rows do not
-- linger alongside the new set.
delete from public.daily_challenges;

-- XP per the design: easy 50, medium 70, hard 90.
insert into public.daily_challenges
  (difficulty, text, xp_reward, type, target, target_secondary, tense, scope) values

-- ── EASY (16) ────────────────────────────────────────────────────────────────
  ('easy', 'Get 15 correct answers, hints allowed.',              50, 'cross_correct',      15, null, null, null),
  ('easy', 'Get 25 correct answers, hints allowed.',              50, 'cross_correct',      25, null, null, null),
  ('easy', 'Score 60%+ in 2 games.',                              50, 'score_pct_games',    60, 2,    null, null),
  ('easy', 'Get 20 written answers right, hints allowed.',        50, 'written_correct',    20, null, null, null),
  ('easy', 'Finish 2 Escribiendo… games, no Skip.',               50, 'no_skip_games',      2,  null, null, null),
  ('easy', 'Score 70%+ in Escribiendo…',                          50, 'score_pct',          70, null, null, 'escribiendo'),
  ('easy', 'Get 25 pretérito perfecto forms right, hints allowed.',50,'tense_correct',      25, null, 'pretérito-perfecto', 'pretérito-perfecto'),
  ('easy', 'Get 25 imperfecto forms right, hints allowed.',       50, 'tense_correct',      25, null, 'imperfecto', 'imperfecto'),
  ('easy', 'Get 20 tense choices right.',                         50, 'choice_correct',     20, null, null, null),
  ('easy', 'Score 70%+ in Lío de tiempos.',                       50, 'score_pct',          70, null, null, 'contraste'),
  ('easy', 'Get 20 Perfecto vs Indefinido choices right.',        50, 'tense_correct',      20, null, 'javi-zas', 'javi-zas'),
  ('easy', 'Complete 3 games.',                                   50, 'activities',         3,  null, null, null),
  ('easy', 'Complete 2 games in one category.',                   50, 'games_in_category',  2,  null, null, null),
  ('easy', 'Get 20 indefinido forms right, hints allowed.',       50, 'tense_correct',      20, null, 'indefinido', 'indefinido'),
  ('easy', 'Get 15 written answers right, hints allowed.',        50, 'written_correct',    15, null, null, null),
  ('easy', 'Get 15 tense choices right.',                         50, 'choice_correct',     15, null, null, null),

-- ── MEDIUM (17) ──────────────────────────────────────────────────────────────
  ('medium', 'Get 30 correct answers, hints allowed.',            70, 'cross_correct',      30, null, null, null),
  ('medium', 'Score 70%+ in 2 games.',                            70, 'score_pct_games',    70, 2,    null, null),
  ('medium', 'Get 30 written answers right, hints allowed.',      70, 'written_correct',    30, null, null, null),
  ('medium', 'Get 10 indefinido forms right, hints allowed.',     70, 'tense_correct',      10, null, 'indefinido', 'indefinido'),
  ('medium', 'Get 30 tense choices right.',                       70, 'choice_correct',     30, null, null, null),
  ('medium', 'Get 10 Indefinido vs Imperfecto choices right.',    70, 'tense_correct',      10, null, 'mimo-zas', 'mimo-zas'),
  ('medium', 'Get 8 three-tense choices right.',                  70, 'tense_correct',      8,  null, 'javi-mimo-zas', 'javi-mimo-zas'),
  ('medium', 'Get 10 written answers and 10 tense choices right.',70, 'written_and_choice', 10, null, null, null),
  ('medium', 'Get 15 correct answers, no hints.',                 70, 'correct_no_hints',   15, null, null, null),
  ('medium', 'Get 15 written answers right, no hints.',           70, 'correct_no_hints',   15, null, null, 'escribiendo'),
  ('medium', 'Score 80%+ in 1 game.',                             70, 'score_pct',          80, null, null, null),
  ('medium', 'Score 80%+ in Escribiendo…',                        70, 'score_pct',          80, null, null, 'escribiendo'),
  ('medium', 'Complete 4 games.',                                 70, 'activities',         4,  null, null, null),
  ('medium', 'Get 15 Perfecto vs Indefinido choices right.',      70, 'tense_correct',      15, null, 'javi-zas', 'javi-zas'),
  ('medium', 'Score 80%+ in Lío de tiempos.',                     70, 'score_pct',          80, null, null, 'contraste'),
  ('medium', 'Complete 3 games in one category.',                 70, 'games_in_category',  3,  null, null, null),
  ('medium', 'Get 25 imperfecto forms right, hints allowed.',     70, 'tense_correct',      25, null, 'imperfecto', 'imperfecto'),

-- ── HARD (17) ────────────────────────────────────────────────────────────────
  ('hard', 'Get 40 correct answers, hints allowed.',              90, 'cross_correct',      40, null, null, null),
  ('hard', 'Get 20 correct answers, no hints.',                   90, 'correct_no_hints',   20, null, null, null),
  ('hard', 'Score 80%+ in Lío de tiempos.',                       90, 'score_pct',          80, null, null, 'contraste'),
  ('hard', 'Score 70%+ in 2 Lío de tiempos games.',               90, 'score_pct_games',    70, 2,    null, 'contraste'),
  ('hard', 'Score 80%+ in Escribiendo…',                          90, 'score_pct',          80, null, null, 'escribiendo'),
  ('hard', 'Get 20 pretérito perfecto forms right, no hints.',    90, 'correct_no_hints',   20, null, 'pretérito-perfecto', 'pretérito-perfecto'),
  ('hard', 'Get 20 imperfecto forms right, no hints.',            90, 'correct_no_hints',   20, null, 'imperfecto', 'imperfecto'),
  ('hard', 'Get 15 indefinido forms right, no hints.',            90, 'correct_no_hints',   15, null, 'indefinido', 'indefinido'),
  ('hard', 'Get 25 Perfecto vs Indefinido choices right.',        90, 'tense_correct',      25, null, 'javi-zas', 'javi-zas'),
  ('hard', 'Get 12 Indefinido vs Imperfecto choices right.',      90, 'tense_correct',      12, null, 'mimo-zas', 'mimo-zas'),
  ('hard', 'Get 10 three-tense choices right.',                   90, 'tense_correct',      10, null, 'javi-mimo-zas', 'javi-mimo-zas'),
  ('hard', 'Get 15 written answers and 15 tense choices right.',  90, 'written_and_choice', 15, null, null, null),
  ('hard', 'Complete 5 games.',                                   90, 'activities',         5,  null, null, null),
  ('hard', 'Get 35 tense choices right.',                         90, 'choice_correct',     35, null, null, null),
  ('hard', 'Get 15 three-tense choices right.',                   90, 'tense_correct',      15, null, 'javi-mimo-zas', 'javi-mimo-zas'),
  ('hard', 'Get 30 written answers right, no hints.',             90, 'correct_no_hints',   30, null, null, 'escribiendo'),
  ('hard', 'Complete 4 games in one category.',                   90, 'games_in_category',  4,  null, null, null);
