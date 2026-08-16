/**
 * Who is using the app right now, straight from the database.
 *
 * Vercel Analytics answers "how many page views" but not "which student is mid-session", and
 * its dashboard lags by a minute or two. These numbers come from the rows the app itself
 * writes, so they are exact and current:
 *
 *   profiles.updated_at   — bumped on every XP/streak write, so it tracks real activity
 *   practice_sessions     — one row per finished singleplayer activity
 *   rooms / room_players  — live multiplayer lobbies and games
 *
 * Usage:
 *   pnpm db:active            # last 15 minutes
 *   pnpm db:active 60         # last 60 minutes
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

const WINDOW_MINUTES = Number(process.argv[2]) || 15

function minutesAgo(iso: string): number {
  return Math.round((Date.now() - new Date(iso).getTime()) / 60000)
}

function ago(iso: string): string {
  const m = minutesAgo(iso)
  if (m < 1) return 'ahora mismo'
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  return h < 24 ? `hace ${h} h` : `hace ${Math.floor(h / 24)} d`
}

async function main() {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  console.log(`\n═══ Actividad — últimos ${WINDOW_MINUTES} min ═══\n`)

  // Recently active profiles
  const { data: active } = await supabase
    .from('profiles')
    .select('username, total_xp, streak, updated_at')
    .gte('updated_at', since)
    .order('updated_at', { ascending: false })

  console.log(`Usuarios activos: ${active?.length ?? 0}`)
  for (const p of active ?? []) {
    console.log(`  ${p.username.padEnd(20)} ${String(p.total_xp).padStart(6)} XP   ${ago(p.updated_at)}`)
  }

  // Sessions finished inside the window
  const { data: sessions } = await supabase
    .from('practice_sessions')
    .select('user_id, tense, total, correct, completed_at')
    .gte('completed_at', since)
    .order('completed_at', { ascending: false })

  if (sessions?.length) {
    const names = new Map<string, string>()
    const { data: who } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', [...new Set(sessions.map(s => s.user_id))])
    for (const p of who ?? []) names.set(p.id, p.username)

    console.log(`\nActividades completadas: ${sessions.length}`)
    for (const s of sessions.slice(0, 15)) {
      const name = names.get(s.user_id) ?? '—'
      console.log(`  ${name.padEnd(20)} ${s.tense.padEnd(20)} ${s.correct}/${s.total}   ${ago(s.completed_at)}`)
    }
  } else {
    console.log('\nActividades completadas: 0')
  }

  // Live multiplayer
  const { data: liveRooms } = await supabase
    .from('rooms')
    .select('code, status, game_type, game_mode, created_at')
    .in('status', ['waiting', 'playing'])
    .order('created_at', { ascending: false })

  console.log(`\nSalas abiertas: ${liveRooms?.length ?? 0}`)
  for (const r of liveRooms ?? []) {
    const { count } = await supabase
      .from('room_players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', (r as unknown as { id: string }).id ?? '')
    console.log(`  ${r.code}  ${r.status.padEnd(8)} ${r.game_mode.padEnd(18)} ${count ?? '?'} jugadores  ${ago(r.created_at)}`)
  }

  // Today's totals, for context on whether the window above is quiet or the app is
  const [{ count: todaySessions }, { count: totalUsers }] = await Promise.all([
    supabase
      .from('practice_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('completed_at', todayStart.toISOString()),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  console.log(`\n─── Hoy ───`)
  console.log(`  Actividades completadas: ${todaySessions ?? 0}`)
  console.log(`  Usuarios registrados (total): ${totalUsers ?? 0}`)
  console.log()
}

main()
