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
  tense:            z.enum(VALID_TENSES),
  total:            z.number().int().min(1).max(50),
  first_try:        z.number().int().min(0),
  with_hints:       z.number().int().min(0),
  skipped:          z.number().int().min(0),
  half_correct:     z.number().int().min(0).default(0),
  duration_seconds: z.number().int().min(0).max(7200).default(0),
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

  const { tense, total, first_try, with_hints, skipped, half_correct, duration_seconds } = parsed.data
  const fixed   = total - first_try - with_hints - skipped - half_correct
  const correct = Math.max(0, first_try + fixed)

  // XP calculation (mirrors results page formula); half_correct earns partial credit
  const scorePct  = total > 0 ? Math.round((first_try * 10 + fixed * 8 + with_hints * 6 + half_correct * 5) / (total * 10) * 100) : 0
  const xpEarned  = Math.round((scorePct / 100) * (XP_AT_100[tense] ?? 25))

  // Save session
  const { error: sessionError } = await supabase
    .from('practice_sessions')
    .insert({ user_id: user.id, tense, total, correct, first_try, with_hints, skipped, half_correct, duration_seconds })

  if (sessionError) return NextResponse.json({ error: 'Failed to save session' }, { status: 500 })

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

  // Increment activities via RPC as well (safe double-increment guard not needed — we update directly above)
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
