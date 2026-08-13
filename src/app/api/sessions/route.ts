import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkAndAwardAchievements } from '@/lib/check-achievements'
import { getLevelInfo } from '@/lib/levels'
import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin } from '@/lib/security'
import { z } from 'zod'

const VALID_TENSES = ['indefinido', 'imperfecto', 'pretérito-perfecto', 'javi-zas', 'mimo-zas', 'javi-mimo-zas'] as const

const XP_AT_100: Record<string, number> = {
  'indefinido':         30,
  'imperfecto':         25,
  'pretérito-perfecto': 25,
  'javi-zas':           25,
  'mimo-zas':           30,
  'javi-mimo-zas':      30,
}

const BodySchema = z.object({
  tense:              z.enum(VALID_TENSES),
  total:              z.number().int().min(1).max(50),
  first_try:          z.number().int().min(0),
  with_hints:         z.number().int().min(0),
  skipped:            z.number().int().min(0),
  half_correct:       z.number().int().min(0).default(0),
  duration_seconds:   z.number().int().min(0).max(7200).default(0),
  client_session_id:  z.string().uuid(),
})

export async function POST(request: NextRequest) {
  const originError = checkOrigin(request)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { tense, total, first_try, with_hints, skipped, half_correct, duration_seconds, client_session_id } = parsed.data
  const fixed   = total - first_try - with_hints - skipped - half_correct
  const correct = Math.max(0, first_try + fixed)

  // XP calculation (mirrors results page formula); half_correct earns partial credit
  const scorePct  = total > 0 ? Math.round((first_try * 10 + fixed * 8 + with_hints * 6 + half_correct * 5) / (total * 10) * 100) : 0
  const xpEarned  = Math.round((scorePct / 100) * (XP_AT_100[tense] ?? 25))

  // Idempotency: a retried/duplicate mount of the results page must not double-save
  const { data: existing } = await supabase
    .from('practice_sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('client_session_id', client_session_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ ok: true, xpEarned: 0, newAchievements: [], leveledUp: false, newLevel: null })
  }

  // Save session
  const { error: sessionError } = await supabase
    .from('practice_sessions')
    .insert({ user_id: user.id, tense, total, correct, first_try, with_hints, skipped, half_correct, duration_seconds, client_session_id })

  if (sessionError) {
    // Unique violation on (user_id, client_session_id) = a concurrent duplicate request won the race
    if (sessionError.code === '23505') {
      return NextResponse.json({ ok: true, xpEarned: 0, newAchievements: [], leveledUp: false, newLevel: null })
    }
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 })
  }

  // Update profile: XP + streak + activities_completed (admin bypasses RLS)
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('total_xp, streak, last_activity_date')
    .eq('id', user.id)
    .single()

  const oldXp    = profile?.total_xp ?? 0
  const oldLevel = getLevelInfo(oldXp).level
  const newXp    = oldXp + xpEarned
  const newLevel = getLevelInfo(newXp).level
  const leveledUp = newLevel > oldLevel

  // Streak logic
  const today     = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const lastDate  = profile?.last_activity_date ?? null

  let newStreak = profile?.streak ?? 0
  if (lastDate === today) {
    // Already played today — no change
  } else if (lastDate === yesterday) {
    newStreak += 1
  } else {
    newStreak = 1
  }

  const currentActivities = (profile as unknown as { activities_completed?: number })?.activities_completed ?? 0

  await admin
    .from('profiles')
    .update({
      total_xp:             newXp,
      streak:               newStreak,
      last_activity_date:   today,
      activities_completed: lastDate === today ? currentActivities : currentActivities + 1,
    })
    .eq('id', user.id)

  // Daily challenge completion — mirrors the progress calculation on the home page.
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % 6
  const { data: challenge } = await admin
    .from('daily_challenges')
    .select('type, target, tense')
    .eq('day_index', dayIndex)
    .single()

  if (challenge) {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { data: todaySessions } = await admin
      .from('practice_sessions')
      .select('tense, correct')
      .eq('user_id', user.id)
      .gte('completed_at', todayStart.toISOString())

    let challengeProgress = 0
    if (todaySessions) {
      if (challenge.type === 'activities') {
        challengeProgress = todaySessions.length
      } else if (challenge.type === 'tense_correct') {
        challengeProgress = todaySessions.filter(s => s.tense === challenge.tense).reduce((sum, s) => sum + s.correct, 0)
      } else if (challenge.type === 'cross_correct') {
        challengeProgress = todaySessions.reduce((sum, s) => sum + s.correct, 0)
      }
    }

    if (challengeProgress >= challenge.target) {
      // Unique (user_id, completion_date) makes this a no-op if today was already recorded
      const { error: completionError } = await admin
        .from('daily_challenge_completions')
        .insert({ user_id: user.id, completion_date: today })

      if (!completionError) {
        const { data: challengeProfile } = await admin
          .from('profiles')
          .select('daily_challenges_completed, daily_challenge_streak, last_daily_challenge_date')
          .eq('id', user.id)
          .single()

        if (challengeProfile) {
          const newChallengeStreak = challengeProfile.last_daily_challenge_date === yesterday
            ? challengeProfile.daily_challenge_streak + 1
            : 1

          await admin
            .from('profiles')
            .update({
              daily_challenges_completed: challengeProfile.daily_challenges_completed + 1,
              daily_challenge_streak: newChallengeStreak,
              last_daily_challenge_date: today,
            })
            .eq('id', user.id)
        }
      }
    }
  }

  // Award achievements and return newly unlocked ones
  const newAchievements = await checkAndAwardAchievements(user.id).catch(() => [] as string[])

  return NextResponse.json({
    ok: true,
    xpEarned,
    newAchievements,
    leveledUp,
    newLevel,
  })
}
