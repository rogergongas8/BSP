import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkAndAwardAchievements } from '@/lib/check-achievements'
import { getLevelInfo } from '@/lib/levels'
import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin } from '@/lib/security'
import {
  dayNumber,
  difficultyForDay,
  isChallengeComplete,
  pickChallenge,
} from '@/lib/daily-challenges'
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
  // The level-up check happens at the end, against the final total — completing a daily
  // challenge adds more XP below and can be what crosses the boundary.

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

  // Daily challenge completion. Selection must match the home page exactly — same level,
  // same day, same pool — or the card would show one goal while XP was awarded for another.
  // Both sides call into @/lib/daily-challenges to guarantee that.
  // Keyed on the level the user had when the page rendered the card (oldLevel), not the one
  // they may have just reached: levelling up mid-session must not swap the challenge out from
  // under them and evaluate a goal they were never shown.
  let challengeXpAwarded = 0
  // The challenge's own wording, returned only when this request is the one that completed it,
  // so the client can name the goal in the completion popup without re-deriving the pick.
  let challengeText: string | null = null
  let finalXp = newXp

  const today_ = dayNumber()
  const { data: challengePool } = await admin.from('daily_challenges').select('*')
  const challenge = pickChallenge(
    (challengePool ?? []).filter(c => c.difficulty === difficultyForDay(oldLevel, today_)),
    user.id,
    today_
  )

  if (challenge) {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { data: todaySessions } = await admin
      .from('practice_sessions')
      .select('tense, total, correct, first_try, with_hints, skipped, half_correct')
      .eq('user_id', user.id)
      .gte('completed_at', todayStart.toISOString())

    if (isChallengeComplete(challenge, todaySessions ?? [])) {
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

          // The challenge's own reward (50/70/90 by difficulty) on top of the session XP
          // already applied above. Added to `newXp` rather than re-reading the profile so it
          // does not clobber that update.
          challengeXpAwarded = challenge.xp_reward
          challengeText = challenge.text
          finalXp = newXp + challengeXpAwarded

          await admin
            .from('profiles')
            .update({
              total_xp: finalXp,
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

  // Recomputed against the final total: completing a challenge can be what tips the user over
  // a level boundary, and the level-up modal must fire for that case too.
  const finalLevel = getLevelInfo(finalXp).level

  return NextResponse.json({
    ok: true,
    xpEarned: xpEarned + challengeXpAwarded,
    challengeXpAwarded,
    challengeText,
    newAchievements,
    leveledUp: finalLevel > oldLevel,
    newLevel: finalLevel,
  })
}
