import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkAndAwardAchievements } from '@/lib/check-achievements'
import { getLevelInfo } from '@/lib/levels'
import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin } from '@/lib/security'

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
    .select('id, host_id, status')
    .eq('code', code)
    .single()

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.host_id !== user.id) return NextResponse.json({ error: 'Not the host' }, { status: 403 })
  if (room.status !== 'finished') return NextResponse.json({ error: 'Game not finished yet' }, { status: 409 })

  // Get all players in the room
  const { data: players } = await admin
    .from('room_players')
    .select('user_id')
    .eq('room_id', room.id)

  if (!players || players.length === 0) return NextResponse.json({ ok: true })

  // Compute total points per player across all rounds
  const { data: allRounds } = await admin
    .from('rounds')
    .select('id, started_at')
    .eq('room_id', room.id)

  const roundIds = (allRounds ?? []).map(r => r.id)

  // Wall-clock time the room was actually in play, from the first round's start to now (finish time) —
  // there's no dedicated "game started" timestamp on rooms, so the earliest round start stands in for it.
  const roundStartTimes = (allRounds ?? [])
    .map(r => r.started_at)
    .filter((t): t is string => t !== null)
    .map(t => new Date(t).getTime())
  const gameSecondsPlayed = roundStartTimes.length > 0
    ? Math.max(0, Math.round((Date.now() - Math.min(...roundStartTimes)) / 1000))
    : 0

  if (gameSecondsPlayed > 0) {
    await admin.from('play_time_logs').insert(
      players.map(p => ({ user_id: p.user_id, seconds: gameSecondsPlayed, source: 'multiplayer' as const }))
    )
  }

  const { data: allAnswers } = await admin
    .from('round_answers')
    .select('user_id, points_awarded')
    .in('round_id', roundIds)

  const pointsByUser = new Map<string, number>()
  for (const ans of allAnswers ?? []) {
    pointsByUser.set(ans.user_id, (pointsByUser.get(ans.user_id) ?? 0) + ans.points_awarded)
  }

  // Determine rankings for top3_finishes
  const rankings = [...pointsByUser.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([userId, pts], i) => ({ userId, pts, rank: i + 1 }))

  // A top-3 finish only counts toward the profile stat in games with at least 4 players.
  const countsTowardTop3Stat = players.length >= 4

  // Award XP and update profiles
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  // Only the caller (host) gets an in-app notification — everyone's unlocks/level-ups are still recorded below.
  let hostNewAchievements: string[] = []
  let hostLeveledUp = false
  let hostNewLevel = 1

  for (const player of players) {
    const totalPoints = pointsByUser.get(player.user_id) ?? 0
    const xpEarned = Math.round(totalPoints / 30) + 10
    const rankEntry = rankings.find(r => r.userId === player.user_id)
    const isTop3 = countsTowardTop3Stat && (rankEntry?.rank ?? 99) <= 3
    const isWin = (rankEntry?.rank ?? 99) === 1

    const { data: profile } = await admin
      .from('profiles')
      .select('total_xp, streak, last_activity_date, top3_finishes, games_won, activities_completed')
      .eq('id', player.user_id)
      .single()

    if (!profile) continue

    const oldXp = profile.total_xp
    const newXp = oldXp + xpEarned

    const lastDate = profile.last_activity_date
    let newStreak = profile.streak
    if (lastDate === today) {
      // already played today
    } else if (lastDate === yesterday) {
      newStreak += 1
    } else {
      newStreak = 1
    }

    await admin
      .from('profiles')
      .update({
        total_xp: newXp,
        streak: newStreak,
        last_activity_date: today,
        activities_completed: profile.activities_completed + 1,
        top3_finishes: isTop3 ? profile.top3_finishes + 1 : profile.top3_finishes,
        games_won: isWin ? profile.games_won + 1 : profile.games_won,
      })
      .eq('id', player.user_id)

    const earned = await checkAndAwardAchievements(player.user_id).catch(() => [] as string[])
    if (player.user_id === user.id) {
      hostNewAchievements = earned
      const oldLevel = getLevelInfo(oldXp).level
      const newLevel = getLevelInfo(newXp).level
      hostLeveledUp = newLevel > oldLevel
      hostNewLevel = newLevel
    }
  }

  return NextResponse.json({
    ok: true,
    newAchievements: hostNewAchievements,
    leveledUp: hostLeveledUp,
    newLevel: hostNewLevel,
  })
}
