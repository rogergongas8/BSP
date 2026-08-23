import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      realtime: {
        // Default is 10 events/second, which a full room exceeds on its own. Starting a game
        // emits a burst of round writes plus the room status change, and every player's client
        // also carries lobby/game Presence sync traffic that grows with the square of the player
        // count. At 10/s the client throttles its own intake mid-burst and can miss the room
        // UPDATE that starts the game.
        params: { eventsPerSecond: 40 },
      },
    }
  )
}
