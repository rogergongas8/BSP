/**
 * Daily challenge selection and progress evaluation.
 *
 * Both the home page (to render today's card) and /api/sessions (to award XP on completion)
 * need identical answers to "which challenge is it today?" and "how far along is the user?".
 * They previously each carried their own copy of that logic and had already drifted apart, so
 * it lives here once and both import it.
 */
import type { Database } from '@/types/database.types'

export type DailyChallenge = Database['public']['Tables']['daily_challenges']['Row']

/** The columns of practice_sessions this module needs. */
export type SessionRow = {
  tense: string
  total: number
  correct: number
  first_try: number
  with_hints: number
  skipped: number
  half_correct: number
}

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const
export type Difficulty = typeof DIFFICULTIES[number]

/**
 * Difficulty rotation per level band, from the design. The day picks a slot in the array;
 * the slot names the difficulty. Higher bands see harder blocks more often.
 */
const ROTATION_BY_LEVEL: readonly { maxLevel: number; rotation: readonly Difficulty[] }[] = [
  { maxLevel: 2,        rotation: ['easy', 'easy', 'easy', 'medium'] },
  { maxLevel: 5,        rotation: ['easy', 'easy', 'medium', 'medium', 'hard'] },
  { maxLevel: Infinity, rotation: ['easy', 'medium', 'hard', 'medium', 'hard'] },
]

/** Whole days since the epoch — the clock every daily calculation shares. */
export function dayNumber(now: number = Date.now()): number {
  return Math.floor(now / (1000 * 60 * 60 * 24))
}

/** Which difficulty today calls for, given the user's level. */
export function difficultyForDay(level: number, day: number = dayNumber()): Difficulty {
  const band = ROTATION_BY_LEVEL.find(b => level <= b.maxLevel) ?? ROTATION_BY_LEVEL[ROTATION_BY_LEVEL.length - 1]
  return band.rotation[day % band.rotation.length]
}

/**
 * Picks today's challenge from the candidates of the right difficulty.
 *
 * Deliberately deterministic rather than `Math.random()`: the home page and /api/sessions
 * each resolve the challenge independently, and a random pick would hand them different
 * challenges within the same day — the card would show one goal while XP was awarded for
 * another. Seeding on (day, user) keeps it stable all day and still varies between users
 * and across days.
 */
export function pickChallenge(
  candidates: DailyChallenge[],
  userId: string,
  day: number = dayNumber()
): DailyChallenge | null {
  if (candidates.length === 0) return null

  // Order by id so the candidate list is stable regardless of how the DB returned it.
  const ordered = [...candidates].sort((a, b) => a.id - b.id)

  let hash = day
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  }

  return ordered[hash % ordered.length]
}

/** Sessions from escribiendo (written) modes. */
const WRITTEN_TENSES = new Set(['indefinido', 'imperfecto', 'pretérito-perfecto'])
/** Sessions from lío de tiempos (multiple-choice) modes. */
const CHOICE_TENSES = new Set(['javi-zas', 'mimo-zas', 'javi-mimo-zas'])

function isWritten(session: SessionRow): boolean {
  return WRITTEN_TENSES.has(session.tense)
}

function isChoice(session: SessionRow): boolean {
  return CHOICE_TENSES.has(session.tense)
}

/**
 * Whether a session falls inside a challenge's scope. `scope` is either a family
 * ('escribiendo' / 'contraste') or a single tense/battle id; null means everything counts.
 */
function inScope(session: SessionRow, scope: string | null): boolean {
  if (!scope) return true
  if (scope === 'escribiendo') return isWritten(session)
  if (scope === 'contraste') return isChoice(session)
  return session.tense === scope
}

/**
 * Session score as a percentage, matching the weighting the results screens display:
 * a first-try answer is worth full credit, one fixed after a mistake slightly less, one that
 * needed a hint less again, and a half-correct contrast answer half.
 */
export function sessionScorePct(session: SessionRow): number {
  if (session.total <= 0) return 0
  const fixed = Math.max(
    0,
    session.total - session.first_try - session.with_hints - session.skipped - session.half_correct
  )
  const points =
    session.first_try * 10 + fixed * 8 + session.with_hints * 6 + session.half_correct * 5
  return Math.round((points / (session.total * 10)) * 100)
}

/**
 * How far the user has got toward a challenge today.
 *
 * Returns a raw count — callers clamp to `target` for display. Every branch reads only
 * per-session totals, which is what practice_sessions stores; challenge types that would
 * need the answer sequence (streaks) are not in the pool.
 */
export function challengeProgress(challenge: DailyChallenge, sessions: SessionRow[]): number {
  const scoped = sessions.filter(s => inScope(s, challenge.scope))

  switch (challenge.type) {
    case 'activities':
      return scoped.length

    case 'cross_correct':
      return scoped.reduce((sum, s) => sum + s.correct, 0)

    case 'tense_correct': {
      // `tense` predates `scope` and still identifies the target mode on older rows.
      const target = challenge.scope ?? challenge.tense
      return sessions
        .filter(s => (target ? s.tense === target : true))
        .reduce((sum, s) => sum + s.correct, 0)
    }

    case 'written_correct':
      return scoped.filter(isWritten).reduce((sum, s) => sum + s.correct, 0)

    case 'choice_correct':
      return scoped.filter(isChoice).reduce((sum, s) => sum + s.correct, 0)

    case 'correct_no_hints':
      // first_try is exactly "right without a hint and without a previous attempt".
      return scoped.reduce((sum, s) => sum + s.first_try, 0)

    case 'written_and_choice': {
      // Target applies to each side; progress is the weaker of the two so the bar cannot
      // read "done" while one half is still short.
      const written = scoped.filter(isWritten).reduce((sum, s) => sum + s.correct, 0)
      const choice = scoped.filter(isChoice).reduce((sum, s) => sum + s.correct, 0)
      return Math.min(written, choice)
    }

    case 'score_pct':
      // Binary: any single session at or above the threshold completes it.
      return scoped.some(s => sessionScorePct(s) >= challenge.target) ? challenge.target : 0

    case 'score_pct_games': {
      // N games at or above the threshold. `target` is the percentage, so progress is
      // measured against target_secondary (the game count) instead.
      const qualifying = scoped.filter(s => sessionScorePct(s) >= challenge.target).length
      return qualifying
    }

    case 'games_in_category': {
      // Best single category, not the total — "2 games in one category" is not satisfied by
      // one game in each of two categories.
      const byTense = new Map<string, number>()
      for (const s of scoped) byTense.set(s.tense, (byTense.get(s.tense) ?? 0) + 1)
      return Math.max(0, ...byTense.values())
    }

    case 'no_skip_games':
      return scoped.filter(s => s.skipped === 0).length

    default:
      return 0
  }
}

/**
 * The number progress is compared against. Most challenges use `target`, but the
 * percentage-over-N-games type keeps the percentage in `target` and the game count in
 * `target_secondary`.
 */
export function challengeTargetCount(challenge: DailyChallenge): number {
  if (challenge.type === 'score_pct_games') return challenge.target_secondary ?? 1
  return challenge.target
}

/** Whether today's challenge is complete. */
export function isChallengeComplete(challenge: DailyChallenge, sessions: SessionRow[]): boolean {
  return challengeProgress(challenge, sessions) >= challengeTargetCount(challenge)
}
