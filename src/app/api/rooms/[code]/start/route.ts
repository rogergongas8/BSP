import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin } from '@/lib/security'

const TOTAL_ROUNDS = 8
const DURATION_SECONDS = 30

// javi-mimo-zas has no dedicated data — it draws from both underlying battles at random,
// same convention as /api/contrast-phrases/random.
const BATTLE_SOURCE_IDS: Record<string, string[]> = {
  'javi-zas':      ['javi-zas'],
  'mimo-zas':      ['mimo-zas'],
  'javi-mimo-zas': ['javi-zas', 'mimo-zas'],
}

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
    .select('id, host_id, status, game_type, game_mode')
    .eq('code', code)
    .single()

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.host_id !== user.id) return NextResponse.json({ error: 'Not the host' }, { status: 403 })
  if (room.status !== 'waiting') return NextResponse.json({ error: 'Game already started' }, { status: 409 })

  const { count } = await admin
    .from('room_players')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', room.id)

  if ((count ?? 0) < 2) {
    return NextResponse.json({ error: 'Need at least 2 players' }, { status: 409 })
  }

  const isContraste = room.game_type === 'contraste'

  // Pick TOTAL_ROUNDS random phrases from the pool matching this room's game_mode
  const roundsToInsert: {
    room_id: string
    round_number: number
    status: 'pending'
    duration_seconds: number
    phrase_id?: string
    contrast_phrase_id?: string
  }[] = []

  if (isContraste) {
    const sourceIds = BATTLE_SOURCE_IDS[room.game_mode] ?? [room.game_mode]
    const { data: allPhrases } = await admin
      .from('contrast_phrases')
      .select('id')
      .in('battle_id', sourceIds)

    if (!allPhrases || allPhrases.length < TOTAL_ROUNDS) {
      return NextResponse.json({ error: 'Not enough phrases' }, { status: 500 })
    }

    const shuffled = [...allPhrases].sort(() => Math.random() - 0.5).slice(0, TOTAL_ROUNDS)
    roundsToInsert.push(...shuffled.map((p, i) => ({
      room_id: room.id,
      contrast_phrase_id: p.id,
      round_number: i + 1,
      status: 'pending' as const,
      duration_seconds: DURATION_SECONDS,
    })))
  } else {
    const { data: allPhrases } = await admin
      .from('phrases')
      .select('id')
      .eq('tense', room.game_mode)

    if (!allPhrases || allPhrases.length < TOTAL_ROUNDS) {
      return NextResponse.json({ error: 'Not enough phrases' }, { status: 500 })
    }

    const shuffled = [...allPhrases].sort(() => Math.random() - 0.5).slice(0, TOTAL_ROUNDS)
    roundsToInsert.push(...shuffled.map((p, i) => ({
      room_id: room.id,
      phrase_id: p.id,
      round_number: i + 1,
      status: 'pending' as const,
      duration_seconds: DURATION_SECONDS,
    })))
  }

  const { data: rounds, error: roundsError } = await admin
    .from('rounds')
    .insert(roundsToInsert)
    .select('id, round_number')

  if (roundsError || !rounds) {
    return NextResponse.json({ error: 'Failed to create rounds' }, { status: 500 })
  }

  const firstRound = rounds.find(r => r.round_number === 1)
  if (!firstRound) return NextResponse.json({ error: 'Failed to find first round' }, { status: 500 })

  // Activate first round
  await admin
    .from('rounds')
    .update({ status: 'active', started_at: new Date().toISOString() })
    .eq('id', firstRound.id)

  // Mark room as playing
  await admin
    .from('rooms')
    .update({ status: 'playing', total_rounds: TOTAL_ROUNDS })
    .eq('id', room.id)

  return NextResponse.json({ ok: true })
}
