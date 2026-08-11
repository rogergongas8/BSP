import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin } from '@/lib/security'
import { z } from 'zod'
import { validate, type Phrase } from '@/lib/game-logic'
import type { ContrastPhrase } from '@/lib/contrast-game-logic'

const BodySchema = z.union([
  z.object({ answer: z.string().min(1).max(100) }),
  z.object({
    selected_1: z.union([z.literal(1), z.literal(2)]),
    selected_2: z.union([z.literal(1), z.literal(2)]).optional(),
  }),
])

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

  const admin = createAdminClient()

  // Fetch round with phrase (either escribiendo or contraste, never both)
  const { data: round } = await admin
    .from('rounds')
    .select(`
      id, room_id, phrase_id, contrast_phrase_id, status, started_at, duration_seconds,
      phrases(id, verb, sentence, answer, type, person, expected_stem, stem_group),
      contrast_phrases(id, battle_id, sentence, infinitive_1, option_a_1, option_b_1, correct_1, infinitive_2, option_a_2, option_b_2, correct_2)
    `)
    .eq('id', id)
    .single()

  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })
  if (round.status !== 'active' && round.status !== 'collecting') {
    return NextResponse.json({ error: 'Round not accepting answers' }, { status: 409 })
  }

  // Check user is in this room
  const { data: membership } = await admin
    .from('room_players')
    .select('user_id')
    .eq('room_id', round.room_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Not in this room' }, { status: 403 })

  // Check not already answered
  const { data: existing } = await admin
    .from('round_answers')
    .select('id')
    .eq('round_id', id)
    .eq('user_id', user.id)
    .single()

  if (existing) return NextResponse.json({ error: 'Already answered' }, { status: 409 })

  const submittedAt = new Date()
  const startedAt = round.started_at ? new Date(round.started_at) : submittedAt
  const responseTimeMs = Math.max(0, submittedAt.getTime() - startedAt.getTime())
  const secondsRemaining = Math.max(0, round.duration_seconds - responseTimeMs / 1000)

  let isCorrect: boolean
  let insertPayload: Record<string, unknown>

  if (round.contrast_phrase_id) {
    if (!('selected_1' in parsed.data)) {
      return NextResponse.json({ error: 'This round expects selected_1/selected_2' }, { status: 400 })
    }
    const phrase = round.contrast_phrases as unknown as ContrastPhrase
    const { selected_1, selected_2 } = parsed.data
    const hasGap2 = phrase.option_a_2 && phrase.option_b_2 && phrase.correct_2

    const correct1 = selected_1 === phrase.correct_1
    const correct2 = hasGap2 ? selected_2 === phrase.correct_2 : true
    isCorrect = correct1 && correct2

    insertPayload = {
      selected_1,
      selected_2: hasGap2 ? (selected_2 ?? null) : null,
      validation_status: isCorrect ? 'correct' : (correct1 || correct2) ? 'half_correct' : 'missed',
    }
  } else {
    if (!('answer' in parsed.data)) {
      return NextResponse.json({ error: 'This round expects answer' }, { status: 400 })
    }
    const phrase = round.phrases as unknown as Phrase
    const answer = parsed.data.answer.trim()

    const result = validate(answer, phrase)
    isCorrect = result.status === 'correct'

    insertPayload = { answer, validation_status: result.status }
  }

  // Score: 100 + floor(secondsRemaining) if correct, else 0
  const pointsAwarded = isCorrect ? 100 + Math.floor(secondsRemaining) : 0

  await admin.from('round_answers').insert({
    round_id: id,
    user_id: user.id,
    is_correct: isCorrect,
    points_awarded: pointsAwarded,
    response_time_ms: responseTimeMs,
    submitted_at: submittedAt.toISOString(),
    ...insertPayload,
  })

  // Auto-advance to results when all players have answered
  const { count: totalAnswers } = await admin
    .from('round_answers')
    .select('*', { count: 'exact', head: true })
    .eq('round_id', id)

  const { count: totalPlayers } = await admin
    .from('room_players')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', round.room_id)

  if ((totalAnswers ?? 0) >= (totalPlayers ?? 0) && (totalPlayers ?? 0) > 0) {
    await admin.from('rounds').update({ status: 'results' }).eq('id', id)
  }

  return NextResponse.json({ ok: true, is_correct: isCorrect })
}
