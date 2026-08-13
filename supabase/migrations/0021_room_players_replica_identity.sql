-- REPLICA IDENTITY FULL lets Realtime include the deleted row's user_id on DELETE events,
-- needed to show "a player left" notifications to the remaining players in a room.
ALTER TABLE public.room_players REPLICA IDENTITY FULL;
