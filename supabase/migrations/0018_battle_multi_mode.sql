-- Battle (multiplayer) gains support for all Escribiendo tenses and all Lío de tiempos
-- battles, not just indefinido. A room now records which game it's playing; each round
-- points at either a `phrases` row (escribiendo) or a `contrast_phrases` row (contraste),
-- never both — enforced by the check constraint below.

alter table public.rooms
  add column if not exists game_type text not null default 'escribiendo'
    check (game_type in ('escribiendo', 'contraste')),
  add column if not exists game_mode text not null default 'indefinido';

-- rounds.phrase_id becomes optional; a round references exactly one of the two phrase tables.
alter table public.rounds
  alter column phrase_id drop not null,
  add column if not exists contrast_phrase_id uuid references public.contrast_phrases(id),
  add constraint rounds_phrase_ref_consistent check (
    (phrase_id is not null and contrast_phrase_id is null)
    or
    (phrase_id is null and contrast_phrase_id is not null)
  );

create index if not exists rounds_contrast_phrase_idx on public.rounds (contrast_phrase_id);

-- round_answers gains contrast-specific selection columns; `answer`/`is_correct`/
-- `validation_status` stay as the escribiendo path, unused (null) for contraste rounds.
alter table public.round_answers
  add column if not exists selected_1 smallint check (selected_1 in (1, 2)),
  add column if not exists selected_2 smallint check (selected_2 in (1, 2));
