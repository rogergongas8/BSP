/**
 * Resets the database to a clean slate: everything goes except user accounts.
 *
 * Kept: auth.users, profiles (username, avatar, XP, streak, counters), user_achievements,
 * and daily_challenges (seeded reference data, not user content).
 *
 * Cleared: all phrase content, all gameplay history, all practice history.
 *
 * Why a script and not a migration: this is a one-off content reset tied to a specific data
 * drop, not a schema change. Migrations re-run on every fresh database (including a local
 * `supabase db reset`), and a destructive DELETE that fires on every environment is a footgun.
 *
 * Order follows the foreign keys. Two references have NO cascade and would otherwise block:
 *
 *   rounds.phrase_id          -> phrases           ← blocks; rounds must go first
 *   rounds.contrast_phrase_id -> contrast_phrases  ← blocks; rounds must go first
 *
 * The rest cascade (phrase_mistakes/contrast_mistakes from the phrase tables; round_answers
 * from rounds; room_players from rooms), but every table is deleted explicitly so the counts
 * reported below are measured rather than assumed.
 *
 * Note on profile counters: profiles.total_xp / streak / activities_completed survive, so a
 * user keeps their level while their session history is gone. Pass --reset-stats to zero
 * those counters as well, for a fully fresh start.
 *
 * Usage:
 *   pnpm db:purge                        # dry run — counts only, touches nothing
 *   pnpm db:purge --confirm              # delete, keep profile XP/streak
 *   pnpm db:purge --confirm --reset-stats  # delete and zero profile counters too
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

const DRY_RUN = !process.argv.includes('--confirm')
const RESET_STATS = process.argv.includes('--reset-stats')

/** Deleted, in FK-safe order: children before the rows they point at. */
const TABLES_TO_CLEAR = [
  'round_answers',
  'rounds',
  'room_players',
  'rooms',
  'phrase_mistakes',
  'contrast_mistakes',
  'practice_sessions',
  'play_time_logs',
  'daily_challenge_completions',
  'phrases',
  'contrast_phrases',
] as const

/** Explicitly untouched — listed so the report shows they survived. */
const PRESERVED = ['profiles', 'user_achievements', 'daily_challenges'] as const

/** Per-user counters zeroed by --reset-stats; mirrors the columns the app increments. */
const PROFILE_STAT_RESET = {
  total_xp: 0,
  streak: 0,
  activities_completed: 0,
  top3_finishes: 0,
  games_won: 0,
  last_activity_date: null,
  daily_challenges_completed: 0,
  daily_challenge_streak: 0,
  last_daily_challenge_date: null,
} as const

async function countOf(table: string): Promise<number> {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
  if (error) throw new Error(`count ${table}: ${error.message}`)
  return count ?? 0
}

async function main() {
  console.log(DRY_RUN ? '── DRY RUN — nothing will be deleted ──\n' : '── DELETING ──\n')

  console.log('To be cleared:')
  let total = 0
  for (const table of TABLES_TO_CLEAR) {
    const n = await countOf(table)
    total += n
    console.log(`  ${table.padEnd(32)} ${String(n).padStart(6)}`)
  }
  console.log(`  ${''.padEnd(32)} ${String(total).padStart(6)} rows total\n`)

  console.log('Preserved:')
  for (const table of PRESERVED) {
    console.log(`  ${table.padEnd(32)} ${String(await countOf(table)).padStart(6)}`)
  }
  console.log(
    RESET_STATS
      ? '\nProfile counters (XP, streak, wins) will be ZEROED (--reset-stats).'
      : '\nProfile counters (XP, streak, wins) will be KEPT. Pass --reset-stats to zero them.'
  )
  console.log()

  if (DRY_RUN) {
    console.log('Re-run with --confirm to execute.')
    return
  }

  for (const table of TABLES_TO_CLEAR) {
    // PostgREST refuses an unfiltered DELETE, so match every row on a NOT NULL column.
    const { error } = await supabase.from(table).delete().not('id', 'is', null)
    if (error) {
      console.error(`✗ ${table}: ${error.message}`)
      process.exit(1)
    }
    console.log(`✓ cleared ${table}`)
  }

  if (RESET_STATS) {
    const { error } = await supabase
      .from('profiles')
      .update(PROFILE_STAT_RESET)
      .not('id', 'is', null)
    if (error) {
      console.error(`✗ reset profile stats: ${error.message}`)
      process.exit(1)
    }
    console.log('✓ zeroed profile counters')
  }

  console.log('\nVerifying:')
  let dirty = false
  for (const table of TABLES_TO_CLEAR) {
    const n = await countOf(table)
    if (n !== 0) dirty = true
    console.log(`  ${table.padEnd(32)} ${String(n).padStart(6)}${n === 0 ? '' : '  ← NOT EMPTY'}`)
  }
  if (dirty) process.exit(1)

  console.log('\nDone. Reseed with: pnpm db:seed-all')
}

main()
