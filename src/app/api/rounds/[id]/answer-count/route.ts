import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkOrigin } from '@/lib/security'
import { NextRequest, NextResponse } from 'next/server'

/**
 * How many players have answered this round, and how many are in the room.
 *
 * Exists so the "3/5 answered" counter during the collecting phase does not require the
 * browser to read `round_answers` directly. Those rows carry other players' answer text and
 * is_correct — in a written round, a submitted-and-correct answer from someone else is the
 * answer — so migration 0026 restricts them to the owner until the round is revealed.
 *
 * Returns counts only: no user ids, no answers, no correctness. Safe for any member of the
 * room to poll at any point in the round.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const originError = checkOrigin(request)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: round } = await admin
    .from('rounds')
    .select('id, room_id')
    .eq('id', id)
    .single()

  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

  // Same membership check the other round routes make: counts describe a room's progress, so
  // only players in that room may see them.
  const { data: membership } = await admin
    .from('room_players')
    .select('user_id')
    .eq('room_id', round.room_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Not in this room' }, { status: 403 })

  const [{ count: answered }, { count: total }] = await Promise.all([
    admin.from('round_answers').select('*', { count: 'exact', head: true }).eq('round_id', id),
    admin.from('room_players').select('*', { count: 'exact', head: true }).eq('room_id', round.room_id),
  ])

  return NextResponse.json({
    answered_count: answered ?? 0,
    total_count: total ?? 0,
  })
}
