import { createClient } from '@/lib/supabase/server'
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

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, code, status, max_players')
    .eq('code', code)
    .eq('status', 'waiting')
    .single()

  if (roomError || !room) {
    return NextResponse.json({ error: 'Room not found or already started' }, { status: 404 })
  }

  // Check player count
  const { count } = await supabase
    .from('room_players')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', room.id)

  if ((count ?? 0) >= room.max_players) {
    return NextResponse.json({ error: 'Room is full' }, { status: 409 })
  }

  // Join (upsert handles re-joining)
  const { error: joinError } = await supabase
    .from('room_players')
    .upsert({ room_id: room.id, user_id: user.id })

  if (joinError) {
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 })
  }

  return NextResponse.json({ data: { code: room.code } })
}
