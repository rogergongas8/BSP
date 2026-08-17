import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin } from '@/lib/security'

/**
 * Guarantees the caller has a `room_players` row for this room.
 *
 * The lobby lists players from a Realtime Presence channel, but every server-side game decision
 * counts `room_players` rows — how many players must answer before a round closes, who appears in
 * the standings, whether `/answer` and `/results` accept the request at all. Those two views of
 * "who is in the room" were only ever reconciled by the join request itself, so a player whose
 * join had not landed showed up in the lobby for everyone while staying invisible to the server.
 *
 * The consequence, seen live at IESE: the round auto-advanced once the *known* players answered,
 * and the unknown ones got a 403 from `/answer` and `/results` — leaving them stuck on
 * "Collecting answers..." forever. The lobby now calls this on mount so the two agree before
 * anyone presses Jugar.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const originError = checkOrigin(request)
  if (originError) return originError

  if (!/^[0-9]{4}$/.test(code)) {
    return NextResponse.json({ error: 'Invalid room code' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: room } = await admin
    .from('rooms')
    .select('id, status, max_players')
    .eq('code', code)
    .in('status', ['waiting', 'playing'])
    .single()

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  const { data: existing } = await admin
    .from('room_players')
    .select('user_id')
    .eq('room_id', room.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) return NextResponse.json({ data: { member: true } })

  // Only backfill while the room is still waiting. Adding a row mid-game would raise the answer
  // target for a round this player never saw, stalling everyone else instead.
  if (room.status !== 'waiting') {
    return NextResponse.json({ data: { member: false } })
  }

  const { count } = await admin
    .from('room_players')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', room.id)

  if ((count ?? 0) >= room.max_players) {
    return NextResponse.json({ error: 'Room is full' }, { status: 409 })
  }

  const { error: insertError } = await admin
    .from('room_players')
    .upsert({ room_id: room.id, user_id: user.id }, { onConflict: 'room_id,user_id' })

  if (insertError) {
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 })
  }

  return NextResponse.json({ data: { member: true } })
}
