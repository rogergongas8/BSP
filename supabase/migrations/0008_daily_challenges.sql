create table if not exists public.daily_challenges (
  id          serial primary key,
  day_index   integer not null unique, -- 0-5, rotates daily
  text        text not null,
  xp_reward   integer not null,
  type        text not null check (type in ('activities', 'tense_correct', 'cross_correct')),
  target      integer not null,
  tense       text -- only for type = 'tense_correct'
);

alter table public.daily_challenges enable row level security;

drop policy if exists "Anyone authenticated can read daily challenges" on public.daily_challenges;
create policy "Anyone authenticated can read daily challenges"
  on public.daily_challenges for select
  to authenticated
  using (true);

insert into public.daily_challenges (day_index, text, xp_reward, type, target, tense) values
  (0, 'Complete 3 activities',                                    50,  'activities',    3,  null),
  (1, 'Get 25 pretérito perfecto forms right, hints allowed.',    50,  'tense_correct', 25, 'pretérito-perfecto'),
  (2, 'Complete 3 activities',                                    70,  'activities',    3,  null),
  (3, 'Get 10 written answers and 10 tense choices right.',       70,  'cross_correct', 10, null),
  (4, 'Complete 3 activities',                                    90,  'activities',    3,  null),
  (5, 'Get 15 written answers and 15 tense choices right.',       90,  'cross_correct', 15, null);
