create table if not exists public.rooms (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  host_id     uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  max_players integer not null default 6,
  created_at  timestamptz not null default now()
);

create index if not exists rooms_code_idx on public.rooms (code);
create index if not exists rooms_status_idx on public.rooms (status);

alter table public.rooms enable row level security;

create policy "Anyone authenticated can read rooms"
  on public.rooms for select
  to authenticated
  using (true);

create policy "Host can update own room"
  on public.rooms for update
  to authenticated
  using (auth.uid() = host_id)
  with check (auth.uid() = host_id);

create policy "Authenticated users can create rooms"
  on public.rooms for insert
  to authenticated
  with check (auth.uid() = host_id);

-- room_players: one row per player in a room
create table if not exists public.room_players (
  id        uuid primary key default gen_random_uuid(),
  room_id   uuid not null references public.rooms(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create index if not exists room_players_room_idx on public.room_players (room_id);

alter table public.room_players enable row level security;

create policy "Anyone authenticated can read room players"
  on public.room_players for select
  to authenticated
  using (true);

create policy "Users can join rooms"
  on public.room_players for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can leave rooms"
  on public.room_players for delete
  to authenticated
  using (auth.uid() = user_id);

-- Generate a random 4-digit room code
create or replace function public.generate_room_code()
returns text
language plpgsql
as $$
declare
  code text;
  exists boolean;
begin
  loop
    code := lpad(floor(random() * 10000)::text, 4, '0');
    select count(*) > 0 into exists
      from public.rooms
      where rooms.code = code and status != 'finished';
    exit when not exists;
  end loop;
  return code;
end;
$$;
