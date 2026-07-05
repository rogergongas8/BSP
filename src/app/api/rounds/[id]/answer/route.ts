import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validate, type Phrase } from '@/lib/game-logic'

const BodySchema = z.object({
  answer: z.string().min(1).max(100),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const origin = request.headers.get('origin')
  if (origin && origin !== process.env.NEXT_PUBLIC_SITE_URL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const admin = createAdminClient()

  // Fetch round with phrase
  const { data: round } = await admin
    .from('rounds')
    .select('id, room_id, phrase_id, status, started_at, duration_seconds, phrases(id, verb, sentence, answer, type, person, expected_stem, stem_group)')
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

  const phrase = round.phrases as unknown as Phrase
  const answer = parsed.data.answer.trim()

  // Validate and score server-side
  const result = validate(answer, phrase)
  const isCorrect = result.status === 'correct'

  const submittedAt = new Date()
  const startedAt = round.started_at ? new Date(round.started_at) : submittedAt
  const responseTimeMs = Math.max(0, submittedAt.getTime() - startedAt.getTime())
  const secondsRemaining = Math.max(0, round.duration_seconds - responseTimeMs / 1000)

  // Score: 100 + floor(secondsRemaining) if correct, else 0
  const pointsAwarded = isCorrect ? 100 + Math.floor(secondsRemaining) : 0

  await admin.from('round_answers').insert({
    round_id: id,
    user_id: user.id,
    answer,
    is_correct: isCorrect,
    points_awarded: pointsAwarded,
    response_time_ms: responseTimeMs,
    validation_status: result.status,
    submitted_at: submittedAt.toISOString(),
  })

  return NextResponse.json({ ok: true, is_correct: isCorrect })
}
