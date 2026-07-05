-- Add total_rounds to rooms
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS total_rounds INTEGER NOT NULL DEFAULT 8;

-- rounds: one row per question in a battle
CREATE TABLE IF NOT EXISTS public.rounds (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id          UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  phrase_id        UUID NOT NULL REFERENCES public.phrases(id),
  round_number     INTEGER NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','active','collecting','results','scoreboard','done')),
  started_at       TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 30,
  UNIQUE(room_id, round_number)
);

CREATE INDEX IF NOT EXISTS rounds_room_idx   ON public.rounds (room_id);
CREATE INDEX IF NOT EXISTS rounds_status_idx ON public.rounds (status);

ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read rounds"
  ON public.rounds FOR SELECT TO authenticated USING (true);

-- round_answers: one row per player per round
-- All writes go through the service role (admin client) — no INSERT/UPDATE policies.
CREATE TABLE IF NOT EXISTS public.round_answers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id          UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.profiles(id),
  answer            TEXT,
  is_correct        BOOLEAN NOT NULL DEFAULT FALSE,
  points_awarded    INTEGER NOT NULL DEFAULT 0,
  response_time_ms  INTEGER,
  validation_status TEXT NOT NULL DEFAULT 'no_answer',
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(round_id, user_id)
);

CREATE INDEX IF NOT EXISTS round_answers_round_idx ON public.round_answers (round_id);

ALTER TABLE public.round_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own answers"
  ON public.round_answers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Aggregate view safe to expose: per-round correct/total counts
-- (used by results screen bar chart)
CREATE POLICY "Users can read aggregate answers after results"
  ON public.round_answers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rounds r
      WHERE r.id = round_id
        AND r.status IN ('results', 'scoreboard', 'done')
    )
  );
