import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin } from '@/lib/security'
import { z } from 'zod'

const BodySchema = z.object({
  to: z.enum(['collecting', 'results', 'scoreboard', 'next_round']),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const originError = checkOrigin(request)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { to } = parsed.data
  const admin = createAdminClient()

  // Fetch round with room info
  const { data: round } = await admin
    .from('rounds')
    .select('id, room_id, round_number, status, phrase_id')
    .eq('id', id)
    .single()

  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

  // Verify requester is the host
  const { data: room } = await admin
    .from('rooms')
    .select('host_id, total_rounds, status')
    .eq('id', round.room_id)
    .single()

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.host_id !== user.id) return NextResponse.json({ error: 'Not the host' }, { status: 403 })

  if (to === 'collecting') {
    if (round.status !== 'active') {
      return NextResponse.json({ error: 'Round is not active' }, { status: 409 })
    }
    await admin.from('rounds').update({ status: 'collecting' }).eq('id', id)
  }

  if (to === 'results') {
    if (round.status !== 'collecting' && round.status !== 'active') {
      return NextResponse.json({ error: 'Round not in active/collecting phase' }, { status: 409 })
    }

    // Insert 0-point answers for players who haven't responded
    const { data: allPlayers } = await admin
      .from('room_players')
      .select('user_id')
      .eq('room_id', round.room_id)

    const { data: existingAnswers } = await admin
      .from('round_answers')
      .select('user_id')
      .eq('round_id', id)

    const answeredIds = new Set((existingAnswers ?? []).map(a => a.user_id))
    const nonResponders = (allPlayers ?? []).filter(p => !answeredIds.has(p.user_id))

    if (nonResponders.length > 0) {
      await admin.from('round_answers').insert(
        nonResponders.map(p => ({
          round_id: id,
          user_id: p.user_id,
          answer: null,
          is_correct: false,
          points_awarded: 0,
          validation_status: 'no_answer',
        }))
      )
    }

    await admin.from('rounds').update({ status: 'results' }).eq('id', id)
  }

  if (to === 'scoreboard') {
    if (round.status !== 'results') {
      return NextResponse.json({ error: 'Round is not in results phase' }, { status: 409 })
    }
    await admin.from('rounds').update({ status: 'scoreboard' }).eq('id', id)
  }

  if (to === 'next_round') {
    if (round.status !== 'scoreboard') {
      return NextResponse.json({ error: 'Round is not in scoreboard phase' }, { status: 409 })
    }

    // Mark this round as done
    await admin.from('rounds').update({ status: 'done' }).eq('id', id)

    // Is there a next round?
    const { data: nextRound } = await admin
      .from('rounds')
      .select('id')
      .eq('room_id', round.room_id)
      .eq('round_number', round.round_number + 1)
      .single()

    if (nextRound) {
      await admin
        .from('rounds')
        .update({ status: 'active', started_at: new Date().toISOString() })
        .eq('id', nextRound.id)
    } else {
      // All rounds done — game over
      await admin.from('rooms').update({ status: 'finished' }).eq('id', round.room_id)
    }
  }

  return NextResponse.json({ ok: true })
}
