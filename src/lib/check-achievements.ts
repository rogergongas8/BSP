import { createAdminClient } from '@/lib/supabase/admin'
import type { AchievementId } from '@/lib/achievements'

// The 6 game types a "cata_juegos" run must touch — matches the tense/battle_id values
// practice_sessions.tense is populated with (see VALID_TENSES in /api/sessions).
const ALL_GAME_TYPES = ['indefinido', 'imperfecto', 'pretérito-perfecto', 'javi-zas', 'mimo-zas', 'javi-mimo-zas']

type ProfileSnapshot = {
  activities_completed: number
  streak: number
  top3_finishes: number
  games_won: number
  avatar_id: string | null
  daily_challenges_completed: number
  daily_challenge_streak: number
}

type SessionAggregate = {
  total_items: number
  items_no_skip: number
  perfect_sessions: number
  distinct_game_types: number
  resolved_mistakes: number
}

function evaluateAchievements(
  profile: ProfileSnapshot,
  agg: SessionAggregate,
  unlocked: Set<AchievementId>,
): AchievementId[] {
  const earned: AchievementId[] = []

  const check = (id: AchievementId, condition: boolean) => {
    if (condition && !unlocked.has(id)) earned.push(id)
  }

  check('paso_a_paso',        profile.activities_completed >= 1)
  check('pequeno_gigante',    profile.activities_completed >= 100)
  check('hola_de_nuevo',      profile.streak >= 7)
  check('podio',              profile.top3_finishes >= 10)
  check('campeones',          profile.games_won >= 5)
  check('cambio_de_look',     profile.avatar_id !== null && profile.avatar_id !== 'default')
  check('reto_aceptado',      profile.daily_challenges_completed >= 30)
  check('vaya_semana',        profile.daily_challenge_streak >= 7)
  check('viajero_del_tiempo', agg.total_items >= 500)
  check('senor_del_tiempo',   agg.total_items >= 1500)
  check('no_paras',           agg.items_no_skip >= 100)
  check('ni_un_fallo',        agg.perfect_sessions >= 10)
  check('vaya_leyenda',       agg.perfect_sessions >= 30)
  check('cata_juegos',        agg.distinct_game_types >= ALL_GAME_TYPES.length)
  check('exterminador',       agg.resolved_mistakes >= 100)

  return earned
}

export async function checkAndAwardAchievements(userId: string): Promise<AchievementId[]> {
  const admin = createAdminClient()

  const [profileRes, sessionsRes, unlockedRes, phraseMistakesRes, contrastMistakesRes] = await Promise.all([
    admin.from('profiles')
      .select('activities_completed, streak, top3_finishes, games_won, avatar_id, daily_challenges_completed, daily_challenge_streak')
      .eq('id', userId)
      .single(),

    admin.from('practice_sessions')
      .select('total, skipped, first_try, tense')
      .eq('user_id', userId),

    admin.from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId),

    admin.from('phrase_mistakes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('resolved_at', 'is', null),

    admin.from('contrast_mistakes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('resolved_at', 'is', null),
  ])

  if (!profileRes.data) return []

  const sessions = sessionsRes.data ?? []
  const agg: SessionAggregate = {
    total_items:         sessions.reduce((s, r) => s + r.total, 0),
    items_no_skip:       sessions.filter(r => r.skipped === 0).reduce((s, r) => s + r.total, 0),
    perfect_sessions:    sessions.filter(r => r.first_try === r.total && r.skipped === 0).length,
    distinct_game_types: new Set(sessions.map(r => r.tense)).size,
    resolved_mistakes:   (phraseMistakesRes.count ?? 0) + (contrastMistakesRes.count ?? 0),
  }

  const unlocked = new Set(
    (unlockedRes.data ?? []).map(r => r.achievement_id as AchievementId)
  )

  const newlyEarned = evaluateAchievements(profileRes.data, agg, unlocked)
  if (newlyEarned.length === 0) return []

  await admin.from('user_achievements').insert(
    newlyEarned.map(achievement_id => ({ user_id: userId, achievement_id }))
  )

  return newlyEarned
}
