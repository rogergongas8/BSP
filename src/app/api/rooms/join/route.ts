import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin } from '@/lib/security'
import { clientIp, enforceRateLimit, roomJoinLimiter } from '@/lib/rate-limit'
import { z } from 'zod'

const BodySchema = z.object({
  code: z.string().regex(/^\d{4}$/),
})

export async function POST(request: NextRequest) {
  const originError = checkOrigin(request)
  if (originError) return originError

  const rateLimitError = await enforceRateLimit(roomJoinLimiter, clientIp(request))
  if (rateLimitError) return rateLimitError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid code' }, { status: 400 })

  const { code } = parsed.data

  // A room that is already `playing` is still joinable: during the IESE session several players
  // had their game freeze, and re-entering the code told them it was invalid because this lookup
  // only matched `waiting`. Reconnecting to a live game is the recovery path, so both states are
  // accepted here and the response tells the client which screen to open.
  const admin = createAdminClient()
  const { data: room, error: roomError } = await admin
    .from('rooms')
    .select('id, code, status, max_players')
    .eq('code', code)
    .in('status', ['waiting', 'playing'])
    .single()

  if (roomError || !room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  // Already a member? Let them straight back in without re-checking capacity — otherwise a
  // reconnect into a full game is refused for a seat the player already owns.
  const { data: existing } = await admin
    .from('room_players')
    .select('user_id')
    .eq('room_id', room.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existing) {
    // Joining a game that has already started would leave the newcomer with no answers for the
    // rounds already played, and would inflate the per-round answer target everyone is waiting on.
    if (room.status === 'playing') {
      return NextResponse.json({ error: 'Game already started' }, { status: 409 })
    }

    const { count } = await admin
      .from('room_players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', room.id)

    if ((count ?? 0) >= room.max_players) {
      return NextResponse.json({ error: 'Room is full' }, { status: 409 })
    }

    const { error: joinError } = await admin
      .from('room_players')
      .upsert({ room_id: room.id, user_id: user.id }, { onConflict: 'room_id,user_id' })

    if (joinError) {
      return NextResponse.json({ error: 'Failed to join room' }, { status: 500 })
    }
  }

  return NextResponse.json({ data: { code: room.code, status: room.status } })
}
