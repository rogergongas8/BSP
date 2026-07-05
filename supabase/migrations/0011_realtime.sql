-- Enable Realtime for tables that use postgres_changes subscriptions
-- room_players: lobby player list updates
-- rooms: game start detection (status → 'playing')
-- rounds: game state machine (status changes)
-- round_answers: answer count during collecting phase

ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.round_answers;

-- REPLICA IDENTITY FULL lets Realtime include old row values in UPDATE events
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.rounds REPLICA IDENTITY FULL;
