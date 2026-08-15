import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { getLevelInfo, catImagePath } from '@/lib/levels'
import { resolveAvatarPath } from '@/lib/avatars'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Fetch round + phrase (answer is safe to reveal once status is results/scoreboard/done)
  const { data: round } = await admin
    .from('rounds')
    .select(`
      id, room_id, round_number, status, phrase_id, contrast_phrase_id,
      phrases(answer),
      contrast_phrases(option_a_1, option_b_1, correct_1, option_a_2, option_b_2, correct_2)
    `)
    .eq('id', id)
    .single()

  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })
  if (!['results', 'scoreboard', 'done'].includes(round.status)) {
    return NextResponse.json({ error: 'Results not yet available' }, { status: 409 })
  }

  // Ensure user is in this room
  const { data: membership } = await admin
    .from('room_players')
    .select('user_id')
    .eq('room_id', round.room_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Not in this room' }, { status: 403 })

  const isContraste = !!round.contrast_phrase_id

  // Fetch this user's answer for this round
  const { data: myAnswer } = await admin
    .from('round_answers')
    .select('answer, selected_1, selected_2, is_correct, points_awarded, validation_status')
    .eq('round_id', id)
    .eq('user_id', user.id)
    .single()

  // Fetch all answers for aggregate (correct/total)
  const { data: allAnswers } = await admin
    .from('round_answers')
    .select('user_id, is_correct, points_awarded')
    .eq('round_id', id)

  const correctCount = (allAnswers ?? []).filter(a => a.is_correct).length
  const totalCount = allAnswers?.length ?? 0

  // Compute cumulative standings across all completed rounds for this room
  const { data: completedRounds } = await admin
    .from('rounds')
    .select('id')
    .eq('room_id', round.room_id)
    .in('status', ['results', 'scoreboard', 'done'])
    .order('round_number', { ascending: true })

  const completedIds = (completedRounds ?? []).map(r => r.id)

  const { data: allCompletedAnswers } = await admin
    .from('round_answers')
    .select('round_id, user_id, points_awarded, is_correct')
    .in('round_id', completedIds)

  const pointsByUser = new Map<string, number>()
  for (const ans of allCompletedAnswers ?? []) {
    pointsByUser.set(ans.user_id, (pointsByUser.get(ans.user_id) ?? 0) + ans.points_awarded)
  }

  // Current streak per user: consecutive correct answers ending at the most recent completed round.
  const answersByRound = new Map<string, { user_id: string; is_correct: boolean }[]>()
  for (const ans of allCompletedAnswers ?? []) {
    const list = answersByRound.get(ans.round_id) ?? []
    list.push(ans)
    answersByRound.set(ans.round_id, list)
  }

  const streakByUser = new Map<string, number>()
  const brokenStreakUsers = new Set<string>()
  for (let i = completedIds.length - 1; i >= 0; i--) {
    const answers = answersByRound.get(completedIds[i]) ?? []
    for (const ans of answers) {
      if (brokenStreakUsers.has(ans.user_id)) continue
      if (ans.is_correct) {
        streakByUser.set(ans.user_id, (streakByUser.get(ans.user_id) ?? 0) + 1)
      } else {
        brokenStreakUsers.add(ans.user_id)
      }
    }
  }

  const deltaByUser = new Map<string, number>()
  for (const ans of allAnswers ?? []) {
    deltaByUser.set(ans.user_id, ans.points_awarded)
  }

  // Get all players with profiles
  const { data: players } = await admin
    .from('room_players')
    .select('user_id, profiles(username, total_xp, avatar_id)')
    .eq('room_id', round.room_id)

  // Where everyone stood *before* this round, so the scoreboard can show who moved up or down.
  // Totals minus this round's points give the previous standings, ranked by the same rule as the
  // current ones (total alone), so players who simply hold their position register no movement.
  const previousRankByUser = new Map<string, number>()
  ;(players ?? [])
    .map(p => ({
      user_id: p.user_id,
      total: (pointsByUser.get(p.user_id) ?? 0) - (deltaByUser.get(p.user_id) ?? 0),
    }))
    .sort((a, b) => b.total - a.total)
    .forEach((entry, i) => previousRankByUser.set(entry.user_id, i + 1))

  const standings = (players ?? [])
    .map(p => {
      const profile = p.profiles as unknown as { username: string; total_xp: number; avatar_id: string | null }
      const info = getLevelInfo(profile.total_xp)
      return {
        user_id: p.user_id,
        username: profile.username,
        avatar: resolveAvatarPath(profile.avatar_id, catImagePath(info.cat)),
        total_points: pointsByUser.get(p.user_id) ?? 0,
        delta: deltaByUser.get(p.user_id) ?? 0,
        streak: streakByUser.get(p.user_id) ?? 0,
      }
    })
    .sort((a, b) => b.total_points - a.total_points)
    .map((s, i) => {
      const rank = i + 1
      // Positive = climbed (rank 4 -> 2 is +2), negative = dropped, 0 = held position.
      // Rank 1 is the best rank, so the previous rank minus the current one gives the direction.
      const previousRank = previousRankByUser.get(s.user_id) ?? rank
      return { ...s, rank, rank_change: previousRank - rank }
    })

  // Determine current user position info
  const myStanding = standings.find(s => s.user_id === user.id)
  const myRank = myStanding?.rank ?? standings.length
  const playerAhead = myRank > 1 ? standings[myRank - 2] : null

  const baseResponse = {
    my_points: myAnswer?.points_awarded ?? 0,
    is_correct: myAnswer?.is_correct ?? false,
    my_validation_status: myAnswer?.validation_status ?? 'no_answer',
    correct_count: correctCount,
    total_count: totalCount,
    my_rank: myRank,
    total_players: standings.length,
    points_behind: playerAhead ? playerAhead.total_points - (myStanding?.total_points ?? 0) : 0,
    player_ahead_name: playerAhead?.username ?? null,
    standings,
    round_number: round.round_number,
  }

  if (isContraste) {
    const cp = round.contrast_phrases as unknown as {
      option_a_1: string; option_b_1: string; correct_1: 1 | 2
      option_a_2: string | null; option_b_2: string | null; correct_2: 1 | 2 | null
    }
    return NextResponse.json({
      ...baseResponse,
      is_contraste: true,
      correct_1: cp.correct_1,
      correct_2: cp.correct_2,
      my_selected_1: myAnswer?.selected_1 ?? null,
      my_selected_2: myAnswer?.selected_2 ?? null,
    })
  }

  const phrase = round.phrases as unknown as { answer: string }
  return NextResponse.json({
    ...baseResponse,
    is_contraste: false,
    correct_answer: phrase.answer,
    my_answer: myAnswer?.answer ?? null,
  })
}
