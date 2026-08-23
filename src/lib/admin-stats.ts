import { createAdminClient } from '@/lib/supabase/admin'
import { getLevelInfo } from '@/lib/levels'
import { sessionScorePct, type SessionRow } from '@/lib/daily-challenges'
import { ACHIEVEMENTS, type AchievementId } from '@/lib/achievements'

// Server-only: imports the service-role admin client. Never import from a Client Component.
/**
 * Read-only aggregation for the /admin control centre.
 *
 * Everything here runs through the admin client because the point of the page is a
 * cross-user view: RLS deliberately scopes every table to `auth.uid()`, so the anon
 * client would return one row per query. The route guard (see the page) is what keeps
 * this private — the client is only reached after the caller is confirmed to be the owner.
 *
 * One pass over each table, aggregated in memory. At the current scale (tens of profiles,
 * hundreds of answers) that is far cheaper than a dozen round-trips for grouped counts,
 * and it keeps the shaping logic here in TypeScript instead of spread across RPCs.
 */

/** The 6 game modes, in display order. Mirrors VALID_TENSES in /api/sessions. */
export const MODES = [
  'indefinido',
  'imperfecto',
  'pretérito-perfecto',
  'javi-zas',
  'mimo-zas',
  'javi-mimo-zas',
] as const
export type Mode = typeof MODES[number]

export const MODE_LABELS: Record<Mode, string> = {
  'indefinido':         'Indefinido',
  'imperfecto':         'Imperfecto',
  'pretérito-perfecto': 'Pretérito perfecto',
  'javi-zas':           'Perfecto vs Indefinido',
  'mimo-zas':           'Indefinido vs Imperfecto',
  'javi-mimo-zas':      'Tres tiempos',
}

/**
 * `rooms.game_type` stores the family a room belongs to, not one of the six modes
 * (which is what `game_mode` holds), so it needs its own labels.
 */
const FAMILY_LABELS: Record<string, string> = {
  escribiendo: 'Escribiendo…',
  contraste:   'Lío de tiempos',
}

function labelFor(value: string): string {
  return MODE_LABELS[value as Mode] ?? FAMILY_LABELS[value] ?? value
}

export type UserRow = {
  id: string
  username: string
  totalXp: number
  level: number
  streak: number
  activitiesCompleted: number
  sessions: number
  gamesWon: number
  top3: number
  dailyChallenges: number
  achievements: number
  accuracyPct: number | null
  createdAt: string
  lastActivityDate: string | null
}

export type DayPoint = {
  date: string
  sessions: number
  items: number
  minutes: number
  activeUsers: number
}

export type ModeRow = {
  mode: string
  label: string
  sessions: number
  items: number
  accuracyPct: number
  firstTryPct: number
  hintPct: number
  skipPct: number
  avgScorePct: number
}

export type RoomRow = {
  code: string
  gameType: string
  family: string
  status: string
  players: number
  rounds: number
  answers: number
  accuracyPct: number | null
  createdAt: string
}

export type MistakeRow = {
  sentence: string
  mode: string
  label: string
  total: number
  unresolved: number
}

export type AchievementRow = {
  id: string
  name: string
  description: string
  unlocked: number
}

export type AdminStats = {
  generatedAt: string
  totals: {
    users: number
    activeUsers: number
    neverPlayed: number
    sessions: number
    items: number
    xp: number
    rooms: number
    rounds: number
    answers: number
    minutes: number
    mistakes: number
    mistakesResolved: number
    accuracyPct: number
  }
  users: UserRow[]
  levelDistribution: { level: number; users: number }[]
  timeline: DayPoint[]
  hourly: { hour: number; answers: number }[]
  modes: ModeRow[]
  rooms: RoomRow[]
  multiplayer: {
    accuracyPct: number
    avgResponseMs: number | null
    fastestMs: number | null
    avgPlayersPerRoom: number
    finishedRooms: number
    answersByRoundNumber: { round: number; answers: number; accuracyPct: number }[]
  }
  topMistakes: MistakeRow[]
  achievements: AchievementRow[]
}

/** YYYY-MM-DD in local time, so days line up with how the app counts a "day". */
function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}

export async function getAdminStats(): Promise<AdminStats> {
  const admin = createAdminClient()

  const [
    profilesRes, sessionsRes, playTimeRes, roomsRes, roomPlayersRes,
    roundsRes, answersRes, achievementsRes, phraseMistakesRes, contrastMistakesRes,
  ] = await Promise.all([
    admin.from('profiles').select('id, username, total_xp, streak, activities_completed, games_won, top3_finishes, daily_challenges_completed, created_at, last_activity_date'),
    admin.from('practice_sessions').select('user_id, tense, total, correct, first_try, with_hints, skipped, half_correct, duration_seconds, completed_at'),
    admin.from('play_time_logs').select('user_id, seconds, source, logged_at'),
    admin.from('rooms').select('id, code, game_type, game_mode, status, created_at'),
    admin.from('room_players').select('room_id, user_id'),
    admin.from('rounds').select('id, room_id, round_number, phrase_id, contrast_phrase_id'),
    admin.from('round_answers').select('round_id, user_id, is_correct, response_time_ms, points_awarded'),
    admin.from('user_achievements').select('achievement_id, user_id'),
    admin.from('phrase_mistakes').select('phrase_id, tense, resolved_at'),
    admin.from('contrast_mistakes').select('contrast_phrase_id, battle_id, resolved_at'),
  ])

  const profiles = profilesRes.data ?? []
  const sessions = sessionsRes.data ?? []
  const playTime = playTimeRes.data ?? []
  const rooms = roomsRes.data ?? []
  const roomPlayers = roomPlayersRes.data ?? []
  const rounds = roundsRes.data ?? []
  const answers = answersRes.data ?? []
  const achievements = achievementsRes.data ?? []
  const phraseMistakes = phraseMistakesRes.data ?? []
  const contrastMistakes = contrastMistakesRes.data ?? []

  // ── Per-user rollups ────────────────────────────────────────────────────────
  const sessionsByUser = new Map<string, typeof sessions>()
  for (const s of sessions) {
    const list = sessionsByUser.get(s.user_id)
    if (list) list.push(s)
    else sessionsByUser.set(s.user_id, [s])
  }

  const achievementsByUser = new Map<string, number>()
  for (const a of achievements) {
    achievementsByUser.set(a.user_id, (achievementsByUser.get(a.user_id) ?? 0) + 1)
  }

  const users: UserRow[] = profiles
    .map(p => {
      const own = sessionsByUser.get(p.id) ?? []
      const items = own.reduce((n, s) => n + s.total, 0)
      const correct = own.reduce((n, s) => n + s.correct, 0)
      return {
        id: p.id,
        username: p.username,
        totalXp: p.total_xp,
        level: getLevelInfo(p.total_xp).level,
        streak: p.streak,
        activitiesCompleted: p.activities_completed,
        sessions: own.length,
        gamesWon: p.games_won,
        top3: p.top3_finishes,
        dailyChallenges: p.daily_challenges_completed,
        achievements: achievementsByUser.get(p.id) ?? 0,
        accuracyPct: items > 0 ? pct(correct, items) : null,
        createdAt: p.created_at,
        lastActivityDate: p.last_activity_date,
      }
    })
    .sort((a, b) => b.totalXp - a.totalXp)

  const levelCounts = new Map<number, number>()
  for (const u of users) levelCounts.set(u.level, (levelCounts.get(u.level) ?? 0) + 1)
  const levelDistribution = [...levelCounts]
    .map(([level, n]) => ({ level, users: n }))
    .sort((a, b) => a.level - b.level)

  // ── Timeline: sessions, items and minutes per day ───────────────────────────
  type DayAcc = { sessions: number; items: number; seconds: number; users: Set<string> }
  const byDay = new Map<string, DayAcc>()
  const touchDay = (key: string): DayAcc => {
    let acc = byDay.get(key)
    if (!acc) { acc = { sessions: 0, items: 0, seconds: 0, users: new Set() }; byDay.set(key, acc) }
    return acc
  }

  for (const s of sessions) {
    const acc = touchDay(dayKey(s.completed_at))
    acc.sessions += 1
    acc.items += s.total
    acc.seconds += s.duration_seconds
    acc.users.add(s.user_id)
  }
  for (const t of playTime) {
    const acc = touchDay(dayKey(t.logged_at))
    acc.seconds += t.seconds
    acc.users.add(t.user_id)
  }

  // Fill the gaps so a quiet day reads as a zero rather than vanishing from the axis.
  const dayKeys = [...byDay.keys()].sort()
  const timeline: DayPoint[] = []
  if (dayKeys.length > 0) {
    const cursor = new Date(`${dayKeys[0]}T00:00:00`)
    const last = new Date(`${dayKeys[dayKeys.length - 1]}T00:00:00`)
    while (cursor <= last) {
      const key = dayKey(cursor.toISOString())
      const acc = byDay.get(key)
      timeline.push({
        date: key,
        sessions: acc?.sessions ?? 0,
        items: acc?.items ?? 0,
        minutes: Math.round((acc?.seconds ?? 0) / 60),
        activeUsers: acc?.users.size ?? 0,
      })
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  // ── Hour-of-day histogram, from multiplayer answers (the finest timestamp there is) ──
  const hourCounts = new Array(24).fill(0) as number[]
  for (const s of sessions) hourCounts[new Date(s.completed_at).getHours()] += 1
  const hourly = hourCounts.map((answersCount, hour) => ({ hour, answers: answersCount }))

  // ── Per-mode performance ────────────────────────────────────────────────────
  const modes: ModeRow[] = MODES.map(mode => {
    const own = sessions.filter(s => s.tense === mode)
    const items = own.reduce((n, s) => n + s.total, 0)
    const correct = own.reduce((n, s) => n + s.correct, 0)
    const firstTry = own.reduce((n, s) => n + s.first_try, 0)
    const hints = own.reduce((n, s) => n + s.with_hints, 0)
    const skipped = own.reduce((n, s) => n + s.skipped, 0)
    const scores = own.map(s => sessionScorePct(s as SessionRow))
    return {
      mode,
      label: MODE_LABELS[mode],
      sessions: own.length,
      items,
      accuracyPct: pct(correct, items),
      firstTryPct: pct(firstTry, items),
      hintPct: pct(hints, items),
      skipPct: pct(skipped, items),
      avgScorePct: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    }
  })

  // ── Multiplayer ─────────────────────────────────────────────────────────────
  const roundsByRoom = new Map<string, string[]>()
  for (const r of rounds) {
    const list = roundsByRoom.get(r.room_id)
    if (list) list.push(r.id)
    else roundsByRoom.set(r.room_id, [r.id])
  }
  const roundToRoom = new Map(rounds.map(r => [r.id, r.room_id]))
  const roundToNumber = new Map(rounds.map(r => [r.id, r.round_number]))

  const playersByRoom = new Map<string, number>()
  for (const p of roomPlayers) playersByRoom.set(p.room_id, (playersByRoom.get(p.room_id) ?? 0) + 1)

  type RoomAcc = { answers: number; correct: number }
  const answersByRoom = new Map<string, RoomAcc>()
  for (const a of answers) {
    const roomId = roundToRoom.get(a.round_id)
    if (!roomId) continue
    const acc = answersByRoom.get(roomId) ?? { answers: 0, correct: 0 }
    acc.answers += 1
    if (a.is_correct) acc.correct += 1
    answersByRoom.set(roomId, acc)
  }

  const roomRows: RoomRow[] = rooms
    .map(r => {
      const acc = answersByRoom.get(r.id)
      return {
        code: r.code,
        gameType: labelFor(r.game_mode),
        family: labelFor(r.game_type),
        status: r.status,
        players: playersByRoom.get(r.id) ?? 0,
        rounds: roundsByRoom.get(r.id)?.length ?? 0,
        answers: acc?.answers ?? 0,
        accuracyPct: acc && acc.answers > 0 ? pct(acc.correct, acc.answers) : null,
        createdAt: r.created_at,
      }
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const times = answers.map(a => a.response_time_ms).filter((n): n is number => n !== null && n > 0)
  const mpCorrect = answers.filter(a => a.is_correct).length

  const byRoundNumber = new Map<number, { answers: number; correct: number }>()
  for (const a of answers) {
    const n = roundToNumber.get(a.round_id)
    if (n === undefined) continue
    const acc = byRoundNumber.get(n) ?? { answers: 0, correct: 0 }
    acc.answers += 1
    if (a.is_correct) acc.correct += 1
    byRoundNumber.set(n, acc)
  }

  const multiplayer = {
    accuracyPct: pct(mpCorrect, answers.length),
    avgResponseMs: times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
    fastestMs: times.length > 0 ? Math.min(...times) : null,
    avgPlayersPerRoom: rooms.length > 0
      ? Math.round((roomPlayers.length / rooms.length) * 10) / 10
      : 0,
    finishedRooms: rooms.filter(r => r.status === 'finished').length,
    answersByRoundNumber: [...byRoundNumber]
      .map(([round, acc]) => ({ round, answers: acc.answers, accuracyPct: pct(acc.correct, acc.answers) }))
      .sort((a, b) => a.round - b.round),
  }

  // ── Hardest phrases ─────────────────────────────────────────────────────────
  // Two mistake tables with different foreign keys, so the sentences are fetched
  // separately and merged into one ranking.
  const phraseIds = [...new Set(phraseMistakes.map(m => m.phrase_id))]
  const contrastIds = [...new Set(contrastMistakes.map(m => m.contrast_phrase_id))]

  const [phraseTextsRes, contrastTextsRes] = await Promise.all([
    phraseIds.length > 0
      ? admin.from('phrases').select('id, sentence, tense').in('id', phraseIds)
      : Promise.resolve({ data: [] as { id: string; sentence: string; tense: string }[] }),
    contrastIds.length > 0
      ? admin.from('contrast_phrases').select('id, sentence, battle_id').in('id', contrastIds)
      : Promise.resolve({ data: [] as { id: string; sentence: string; battle_id: string }[] }),
  ])

  const phraseText = new Map((phraseTextsRes.data ?? []).map(p => [p.id, p]))
  const contrastText = new Map((contrastTextsRes.data ?? []).map(p => [p.id, p]))

  const mistakeAcc = new Map<string, MistakeRow>()
  const bumpMistake = (key: string, sentence: string, mode: string, resolved: boolean) => {
    const row = mistakeAcc.get(key) ?? {
      sentence,
      mode,
      label: labelFor(mode),
      total: 0,
      unresolved: 0,
    }
    row.total += 1
    if (!resolved) row.unresolved += 1
    mistakeAcc.set(key, row)
  }

  for (const m of phraseMistakes) {
    const p = phraseText.get(m.phrase_id)
    if (p) bumpMistake(`p:${m.phrase_id}`, p.sentence, m.tense, m.resolved_at !== null)
  }
  for (const m of contrastMistakes) {
    const p = contrastText.get(m.contrast_phrase_id)
    if (p) bumpMistake(`c:${m.contrast_phrase_id}`, p.sentence, m.battle_id, m.resolved_at !== null)
  }

  const topMistakes = [...mistakeAcc.values()]
    .sort((a, b) => b.total - a.total || b.unresolved - a.unresolved)
    .slice(0, 15)

  // ── Achievements ────────────────────────────────────────────────────────────
  const achievementCounts = new Map<string, number>()
  for (const a of achievements) {
    achievementCounts.set(a.achievement_id, (achievementCounts.get(a.achievement_id) ?? 0) + 1)
  }
  const achievementRows: AchievementRow[] = (Object.keys(ACHIEVEMENTS) as AchievementId[])
    .map(id => ({
      id,
      name: ACHIEVEMENTS[id].nameEs,
      description: ACHIEVEMENTS[id].description,
      unlocked: achievementCounts.get(id) ?? 0,
    }))
    .sort((a, b) => b.unlocked - a.unlocked)

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totalItems = sessions.reduce((n, s) => n + s.total, 0)
  const totalCorrect = sessions.reduce((n, s) => n + s.correct, 0)
  const allMistakes = phraseMistakes.length + contrastMistakes.length
  const resolvedMistakes =
    phraseMistakes.filter(m => m.resolved_at !== null).length +
    contrastMistakes.filter(m => m.resolved_at !== null).length

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      users: profiles.length,
      activeUsers: users.filter(u => u.totalXp > 0).length,
      neverPlayed: users.filter(u => u.totalXp === 0).length,
      sessions: sessions.length,
      items: totalItems,
      xp: profiles.reduce((n, p) => n + p.total_xp, 0),
      rooms: rooms.length,
      rounds: rounds.length,
      answers: answers.length,
      minutes: Math.round(
        (sessions.reduce((n, s) => n + s.duration_seconds, 0) +
          playTime.reduce((n, t) => n + t.seconds, 0)) / 60
      ),
      mistakes: allMistakes,
      mistakesResolved: resolvedMistakes,
      accuracyPct: pct(totalCorrect, totalItems),
    },
    users,
    levelDistribution,
    timeline,
    hourly,
    modes,
    rooms: roomRows,
    multiplayer,
    topMistakes,
    achievements: achievementRows,
  }
}
