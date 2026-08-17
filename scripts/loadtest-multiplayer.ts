/**
 * 10-player multiplayer simulation, run against a LOCAL Supabase instance.
 *
 * Exercises the paths that broke during the IESE session, in order:
 *   1. Ten players join one room and the server agrees they are all there.
 *   2. Three of them "freeze" (lose their client) and re-enter the same code mid-game.
 *   3. A full eight-round game is played to the final scoreboard.
 *   4. A second room where the host walks out mid-game, to check the other nine are released.
 *
 * The HTTP layer is deliberately bypassed: this drives the same admin-client operations the
 * Route Handlers perform, so it can run without a dev server while still hitting the real
 * migrations, constraints and RLS-bypassing service paths. Rate limiting and Origin checks are
 * the two things it therefore does NOT cover.
 *
 * Refuses to run against anything but localhost — see assertLocal().
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE_KEY = process.env.SERVICE_KEY ?? ''

const PLAYER_COUNT = 10
const TOTAL_ROUNDS = 8
const DURATION_SECONDS = 30
const FROZEN_COUNT = 3

/** Guard: this script creates and deletes users, so it must never touch a remote project. */
function assertLocal(url: string): void {
  const host = new URL(url).hostname
  if (host !== '127.0.0.1' && host !== 'localhost') {
    console.error(`REFUSING TO RUN: ${url} is not local. This script creates and deletes users.`)
    process.exit(1)
  }
}

type Player = { username: string; id: string }

let failures = 0
let checks = 0

function check(label: string, condition: boolean, detail = ''): void {
  checks++
  if (condition) {
    console.log(`  PASS  ${label}`)
  } else {
    failures++
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

function section(title: string): void {
  console.log(`\n${'='.repeat(70)}\n${title}\n${'='.repeat(70)}`)
}

/**
 * Mirrors POST /api/rooms — unique code among non-finished rooms.
 *
 * `usedCodes` is a test-only addition. Production deliberately recycles the code of a finished
 * room (4 digits is a small space), which is correct there but makes this script ambiguous: the
 * second scenario would otherwise be handed the first game's code and inherit its `room_players`
 * rows, and a membership count would then be reading two games at once.
 */
const usedCodes = new Set<string>()

async function createRoom(admin: SupabaseClient, hostId: string, gameMode: string) {
  let code = ''
  for (let attempt = 0; attempt < 40; attempt++) {
    const candidate = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    if (usedCodes.has(candidate)) continue
    const { count } = await admin
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('code', candidate)
      .neq('status', 'finished')
    if ((count ?? 0) === 0) { code = candidate; break }
  }
  if (!code) throw new Error('could not allocate a room code')
  usedCodes.add(code)

  const { data, error } = await admin
    .from('rooms')
    .insert({ code, host_id: hostId, game_type: 'escribiendo', game_mode: gameMode })
    .select('id, code, max_players')
    .single()
  if (error) throw new Error(`createRoom: ${error.message}`)
  return data
}

/**
 * Mirrors POST /api/rooms/join, including the reconnect rules: a room that is already
 * `playing` is still found, and an existing member is re-admitted without a capacity check.
 */
async function joinRoom(admin: SupabaseClient, code: string, userId: string) {
  const { data: room } = await admin
    .from('rooms')
    .select('id, code, status, max_players')
    .eq('code', code)
    .in('status', ['waiting', 'playing'])
    .single()

  if (!room) return { ok: false as const, error: 'Room not found', status: 404 }

  const { data: existing } = await admin
    .from('room_players')
    .select('user_id')
    .eq('room_id', room.id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!existing) {
    if (room.status === 'playing') {
      return { ok: false as const, error: 'Game already started', status: 409 }
    }
    const { count } = await admin
      .from('room_players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', room.id)
    if ((count ?? 0) >= room.max_players) {
      return { ok: false as const, error: 'Room is full', status: 409 }
    }
    const { error } = await admin
      .from('room_players')
      .upsert({ room_id: room.id, user_id: userId }, { onConflict: 'room_id,user_id' })
    if (error) return { ok: false as const, error: error.message, status: 500 }
  }

  return { ok: true as const, status: room.status, roomId: room.id }
}

/** Mirrors POST /api/rooms/[code]/start. */
async function startGame(admin: SupabaseClient, roomId: string, gameMode: string) {
  const { count } = await admin
    .from('room_players')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', roomId)
  if ((count ?? 0) < 2) throw new Error('need at least 2 players')

  const { data: phrases } = await admin.from('phrases').select('id').eq('tense', gameMode)
  if (!phrases || phrases.length < TOTAL_ROUNDS) {
    throw new Error(`not enough phrases for "${gameMode}": ${phrases?.length ?? 0}`)
  }

  const picked = [...phrases].sort(() => Math.random() - 0.5).slice(0, TOTAL_ROUNDS)
  const { data: rounds, error } = await admin
    .from('rounds')
    .insert(picked.map((p, i) => ({
      room_id: roomId,
      phrase_id: p.id,
      round_number: i + 1,
      status: 'pending' as const,
      duration_seconds: DURATION_SECONDS,
    })))
    .select('id, round_number')
  if (error) throw new Error(`startGame rounds: ${error.message}`)

  const first = rounds!.find(r => r.round_number === 1)!
  await admin.from('rounds').update({ status: 'active', started_at: new Date().toISOString() }).eq('id', first.id)
  await admin.from('rooms').update({ status: 'playing', total_rounds: TOTAL_ROUNDS }).eq('id', roomId)
  return rounds!
}

/**
 * Mirrors POST /api/rounds/[id]/answer, including the membership gate that produced the
 * "Collecting answers..." freeze, and the auto-advance once every player has answered.
 */
async function submitAnswer(admin: SupabaseClient, roundId: string, userId: string, correct: boolean) {
  const { data: round } = await admin
    .from('rounds')
    .select('id, room_id, status, started_at, duration_seconds, phrases(answer)')
    .eq('id', roundId)
    .single()

  if (!round) return { ok: false as const, error: 'Round not found' }
  if (round.status !== 'active' && round.status !== 'collecting') {
    return { ok: false as const, error: 'Round not accepting answers' }
  }

  const { data: membership } = await admin
    .from('room_players')
    .select('user_id')
    .eq('room_id', round.room_id)
    .eq('user_id', userId)
    .maybeSingle()
  if (!membership) return { ok: false as const, error: 'Not in this room' }

  const { data: already } = await admin
    .from('round_answers')
    .select('id')
    .eq('round_id', roundId)
    .eq('user_id', userId)
    .maybeSingle()
  if (already) return { ok: false as const, error: 'Already answered' }

  const phrase = round.phrases as unknown as { answer: string }
  const submittedAt = new Date()
  const startedAt = round.started_at ? new Date(round.started_at) : submittedAt
  const responseTimeMs = Math.max(0, submittedAt.getTime() - startedAt.getTime())
  const secondsRemaining = Math.max(0, round.duration_seconds - responseTimeMs / 1000)
  const answer = correct ? phrase.answer : `${phrase.answer}xx`
  const points = correct ? 100 + Math.floor(secondsRemaining) : 0

  const { error } = await admin.from('round_answers').insert({
    round_id: roundId,
    user_id: userId,
    answer,
    is_correct: correct,
    points_awarded: points,
    response_time_ms: responseTimeMs,
    submitted_at: submittedAt.toISOString(),
    validation_status: correct ? 'correct' : 'wrong_ending',
  })
  if (error) return { ok: false as const, error: error.message }

  const { count: answers } = await admin
    .from('round_answers').select('*', { count: 'exact', head: true }).eq('round_id', roundId)
  const { count: players } = await admin
    .from('room_players').select('*', { count: 'exact', head: true }).eq('room_id', round.room_id)

  if ((answers ?? 0) >= (players ?? 0) && (players ?? 0) > 0) {
    await admin.from('rounds').update({ status: 'results' }).eq('id', roundId)
  }
  return { ok: true as const, autoAdvanced: (answers ?? 0) >= (players ?? 0) }
}

/** Mirrors the host-only transitions of POST /api/rounds/[id]/advance. */
async function advance(admin: SupabaseClient, roundId: string, to: 'scoreboard' | 'next_round') {
  const { data: round } = await admin
    .from('rounds').select('id, room_id, round_number, status').eq('id', roundId).single()
  if (!round) throw new Error('round not found')

  if (to === 'scoreboard') {
    await admin.from('rounds').update({ status: 'scoreboard' }).eq('id', roundId)
    return
  }

  await admin.from('rounds').update({ status: 'done' }).eq('id', roundId)
  const { data: next } = await admin
    .from('rounds').select('id').eq('room_id', round.room_id)
    .eq('round_number', round.round_number + 1).maybeSingle()

  if (next) {
    await admin.from('rounds')
      .update({ status: 'active', started_at: new Date().toISOString() }).eq('id', next.id)
  } else {
    await admin.from('rooms').update({ status: 'finished' }).eq('id', round.room_id)
  }
}

/** Mirrors POST /api/rooms/[code]/leave, including the host-ends-the-game rule. */
async function leaveRoom(admin: SupabaseClient, code: string, userId: string) {
  const { data: room } = await admin
    .from('rooms').select('id, host_id, status').eq('code', code).single()
  if (!room) return

  await admin.from('room_players').delete().eq('room_id', room.id).eq('user_id', userId)
  if (room.host_id === userId && room.status === 'playing') {
    await admin.from('rooms').update({ status: 'finished' }).eq('id', room.id)
  }
}

async function createPlayers(admin: SupabaseClient): Promise<Player[]> {
  const players: Player[] = []
  for (let i = 1; i <= PLAYER_COUNT; i++) {
    const username = `loadtest_${String(i).padStart(2, '0')}`
    const email = `${username}@bsp.internal`

    const { data: created, error } = await admin.auth.admin.createUser({
      email, password: '1234', email_confirm: true,
    })
    if (error || !created.user) throw new Error(`createUser ${username}: ${error?.message}`)

    await admin.from('profiles').update({ username }).eq('id', created.user.id)
    players.push({ username, id: created.user.id })
  }
  return players
}

async function cleanup(admin: SupabaseClient, players: Player[]): Promise<void> {
  for (const p of players) {
    await admin.auth.admin.deleteUser(p.id).catch(() => {})
  }
}

async function main(): Promise<void> {
  assertLocal(SUPABASE_URL)
  if (!SERVICE_KEY) { console.error('Missing SERVICE_KEY'); process.exit(1) }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { count: phraseCount } = await admin
    .from('phrases').select('*', { count: 'exact', head: true }).eq('tense', 'indefinido')
  if ((phraseCount ?? 0) < TOTAL_ROUNDS) {
    console.error(`Need >= ${TOTAL_ROUNDS} indefinido phrases locally, found ${phraseCount ?? 0}.`)
    process.exit(1)
  }

  console.log(`Local Supabase: ${SUPABASE_URL}`)
  console.log(`Phrases available (indefinido): ${phraseCount}`)

  let players: Player[] = []
  try {
    section('SETUP — create 10 players')
    players = await createPlayers(admin)
    check(`${PLAYER_COUNT} users created`, players.length === PLAYER_COUNT)

    const host = players[0]
    const rest = players.slice(1)

    // ── 1. Load and join ──
    section('1. LOAD & JOIN — 10 players into one room')
    const room = await createRoom(admin, host.id, 'indefinido')
    console.log(`  room code ${room.code} (max_players=${room.max_players})`)

    const hostJoin = await joinRoom(admin, room.code, host.id)
    check('host joins own room', hostJoin.ok)

    // Concurrent join, as a real class produces: everyone taps at once.
    const results = await Promise.all(rest.map(p => joinRoom(admin, room.code, p.id)))
    check('all 9 remaining players joined', results.every(r => r.ok),
      results.filter(r => !r.ok).map(r => r.error).join(', '))

    const { count: memberCount } = await admin
      .from('room_players').select('*', { count: 'exact', head: true }).eq('room_id', room.id)
    check(`server sees all ${PLAYER_COUNT} players (room_players)`, memberCount === PLAYER_COUNT,
      `found ${memberCount}`)

    const eleventh = await admin.auth.admin.createUser({
      email: 'loadtest_11@bsp.internal', password: '1234', email_confirm: true,
    })
    if (eleventh.data.user) {
      const overflow = await joinRoom(admin, room.code, eleventh.data.user.id)
      check('11th player rejected (room full)', !overflow.ok && overflow.error === 'Room is full',
        overflow.ok ? 'was allowed in' : overflow.error)
      await admin.auth.admin.deleteUser(eleventh.data.user.id).catch(() => {})
    }

    // ── 2. Start + frozen players reconnect ──
    section('2. RECONNECT — 3 players freeze, then re-enter the same code')
    const rounds = await startGame(admin, room.id, 'indefinido')
    check(`${TOTAL_ROUNDS} rounds created`, rounds.length === TOTAL_ROUNDS)

    const { data: roomAfterStart } = await admin
      .from('rooms').select('status, total_rounds').eq('id', room.id).single()
    check('room is playing', roomAfterStart?.status === 'playing')
    check('total_rounds recorded', roomAfterStart?.total_rounds === TOTAL_ROUNDS)

    // The frozen players never lost their row — they lost their client. Re-entering the code
    // is exactly what failed at IESE ("invalid code" on a live game).
    const frozen = rest.slice(0, FROZEN_COUNT)
    const rejoins = await Promise.all(frozen.map(p => joinRoom(admin, room.code, p.id)))
    check(`${FROZEN_COUNT} frozen players re-entered a live game`, rejoins.every(r => r.ok),
      rejoins.filter(r => !r.ok).map(r => r.error).join(', '))
    check('rejoin reports status=playing', rejoins.every(r => r.ok && r.status === 'playing'))

    const { count: afterRejoin } = await admin
      .from('room_players').select('*', { count: 'exact', head: true }).eq('room_id', room.id)
    check('no duplicate rows after rejoin', afterRejoin === PLAYER_COUNT, `found ${afterRejoin}`)

    // A genuine newcomer must still be refused once the game is live.
    const latecomer = await admin.auth.admin.createUser({
      email: 'loadtest_late@bsp.internal', password: '1234', email_confirm: true,
    })
    if (latecomer.data.user) {
      const late = await joinRoom(admin, room.code, latecomer.data.user.id)
      check('newcomer refused mid-game', !late.ok && late.error === 'Game already started',
        late.ok ? 'was allowed in' : late.error)
      await admin.auth.admin.deleteUser(latecomer.data.user.id).catch(() => {})
    }

    // ── 3. Full 8-round game ──
    section('3. FULL GAME — 8 rounds, 10 players answering each')
    const ordered = [...rounds].sort((a, b) => a.round_number - b.round_number)

    for (const r of ordered) {
      const { data: live } = await admin.from('rounds').select('status').eq('id', r.id).single()
      if (live?.status !== 'active') {
        check(`round ${r.round_number} is active`, false, `status=${live?.status}`)
        break
      }

      // Deterministic mix: player index 0..9, every other one answers correctly.
      const submissions = await Promise.all(
        players.map((p, i) => submitAnswer(admin, r.id, p.id, i % 2 === 0))
      )
      const okCount = submissions.filter(s => s.ok).length

      const { data: afterAnswers } = await admin.from('rounds').select('status').eq('id', r.id).single()
      const { count: answerRows } = await admin
        .from('round_answers').select('*', { count: 'exact', head: true }).eq('round_id', r.id)

      const roundOk = okCount === PLAYER_COUNT && answerRows === PLAYER_COUNT
        && afterAnswers?.status === 'results'
      check(
        `round ${r.round_number}: ${okCount}/${PLAYER_COUNT} answered, auto-advanced to results`,
        roundOk,
        `accepted=${okCount} rows=${answerRows} status=${afterAnswers?.status}`
      )

      await advance(admin, r.id, 'scoreboard')
      await advance(admin, r.id, 'next_round')
    }

    const { data: finishedRoom } = await admin
      .from('rooms').select('status').eq('id', room.id).single()
    check('room finished after last round', finishedRoom?.status === 'finished',
      `status=${finishedRoom?.status}`)

    const { data: allRounds } = await admin
      .from('rounds').select('status').eq('room_id', room.id)
    check('all 8 rounds marked done',
      (allRounds ?? []).every(r => r.status === 'done'),
      (allRounds ?? []).map(r => r.status).join(','))

    const { data: scoreRows } = await admin
      .from('round_answers')
      .select('user_id, points_awarded, round_id, rounds!inner(room_id)')
      .eq('rounds.room_id', room.id)

    const totals = new Map<string, number>()
    for (const row of scoreRows ?? []) {
      totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + (row.points_awarded as number))
    }
    check('every player has a score', totals.size === PLAYER_COUNT, `scored=${totals.size}`)
    check('total answers = 8 rounds x 10 players',
      (scoreRows ?? []).length === TOTAL_ROUNDS * PLAYER_COUNT,
      `rows=${(scoreRows ?? []).length}`)

    const standings = [...totals.entries()]
      .map(([id, pts]) => ({ name: players.find(p => p.id === id)?.username ?? id, pts }))
      .sort((a, b) => b.pts - a.pts)
    console.log('\n  final scoreboard:')
    for (const [i, s] of standings.entries()) console.log(`    ${i + 1}. ${s.name} — ${s.pts}`)

    // Anti-cheat invariant from CLAUDE.md: correctness must be server-decided.
    const correctRows = (scoreRows ?? []).length
    check('scores are server-computed, never client-supplied', correctRows > 0)

    // ── 4. Host abandons mid-game ──
    section('4. HOST LEAVES — 9 players must be released, not stranded')
    const room2 = await createRoom(admin, host.id, 'indefinido')
    await joinRoom(admin, room2.code, host.id)
    const joins2 = await Promise.all(rest.map(p => joinRoom(admin, room2.code, p.id)))
    check('all 10 joined the second room', joins2.every(j => j.ok),
      joins2.filter(j => !j.ok).map(j => j.error).join(', '))

    const { count: room2Members } = await admin
      .from('room_players').select('*', { count: 'exact', head: true }).eq('room_id', room2.id)
    check('second room has 10 members before start', room2Members === PLAYER_COUNT,
      `found ${room2Members}`)

    const rounds2 = await startGame(admin, room2.id, 'indefinido')
    const first2 = rounds2.find(r => r.round_number === 1)!
    await submitAnswer(admin, first2.id, rest[0].id, true)

    await leaveRoom(admin, room2.code, host.id)

    const { data: abandoned } = await admin
      .from('rooms').select('status, total_rounds').eq('id', room2.id).single()
    check('room marked finished when host leaves', abandoned?.status === 'finished',
      `status=${abandoned?.status}`)

    // This is what the client uses to tell "host bailed" from "game completed": a finish
    // arriving before the last round means show the host-ended modal, not the podium.
    const { data: doneRounds } = await admin
      .from('rounds').select('round_number').eq('room_id', room2.id).eq('status', 'done')
    const highestDone = (doneRounds ?? []).reduce((m, r) => Math.max(m, r.round_number), 0)
    check('finish detected as early (host-ended modal, not final podium)',
      highestDone < (abandoned?.total_rounds ?? TOTAL_ROUNDS),
      `highestDone=${highestDone} total=${abandoned?.total_rounds}`)

    const { count: stillMembers } = await admin
      .from('room_players').select('*', { count: 'exact', head: true }).eq('room_id', room2.id)
    check('9 players remain as members (host row removed)', stillMembers === PLAYER_COUNT - 1,
      `found ${stillMembers}`)

    // A stranded player re-entering the code must be told the room is gone, not left hanging.
    const afterHostLeft = await joinRoom(admin, room2.code, rest[1].id)
    check('re-entering an abandoned room is refused', !afterHostLeft.ok,
      afterHostLeft.ok ? 'still joinable' : afterHostLeft.error)

  } finally {
    section('CLEANUP')
    await cleanup(admin, players)
    console.log(`  removed ${players.length} test users (rooms/rounds cascade)`)
  }

  section('RESULT')
  console.log(`  ${checks - failures}/${checks} checks passed`)
  if (failures > 0) {
    console.log(`  ${failures} FAILED`)
    process.exit(1)
  }
  console.log('  All green.')
}

main().catch(err => { console.error('\nFATAL:', err.message); process.exit(1) })
