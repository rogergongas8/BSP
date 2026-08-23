'use client'

/**
 * Dev-only gallery for the celebration popups.
 *
 * These only ever fire after a finished session, which makes them awkward to iterate on:
 * you would have to play a whole activity, and level-ups in particular need the XP to land
 * on a boundary. The buttons below render each modal directly.
 *
 * "Via NotificationQueue" goes the real route instead — it writes the same `bsp_session_result`
 * payload a results screen writes and reloads, so it also exercises the queue, its ordering,
 * and the fact that the queue is mounted for every (app) route.
 */

import { useState } from 'react'
import { DailyChallengeModal } from '@/components/game/daily-challenge-modal'
import { LevelUpModal } from '@/components/game/level-up-modal'
import { BadgeModal } from '@/components/game/badge-modal'
import { ACHIEVEMENTS, type AchievementId } from '@/lib/achievements'

type Shown =
  | { kind: 'challenge' }
  | { kind: 'levelup'; level: number }
  | { kind: 'badge'; id: AchievementId }
  | null

const ACHIEVEMENT_IDS = Object.keys(ACHIEVEMENTS) as AchievementId[]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-xs font-black uppercase tracking-widest text-gray-500">{title}</h2>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  )
}

function Btn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl bg-bsp-blue px-4 py-2.5 text-sm font-bold text-white shadow active:scale-95 transition-transform"
    >
      {children}
    </button>
  )
}

/** Writes the payload a results screen would write, then reloads so the queue picks it up. */
function fireViaQueue(payload: Record<string, unknown>) {
  sessionStorage.setItem('bsp_session_result', JSON.stringify({
    newAchievements: [],
    leveledUp: false,
    newLevel: 1,
    challengeXpAwarded: 0,
    challengeText: null,
    ...payload,
  }))
  window.location.reload()
}

export default function PreviewPage() {
  const [shown, setShown] = useState<Shown>(null)
  const close = () => setShown(null)

  return (
    <div className="min-h-dvh bg-gray-100 px-5 pt-8">
      <h1 className="mb-1 text-xl font-black text-gray-900">Popups</h1>
      <p className="mb-6 text-sm text-gray-500">Dev preview — no está enlazada desde la app.</p>

      <Section title="Reto diario">
        <Btn onClick={() => setShown({ kind: 'challenge' })}>Reto completado</Btn>
      </Section>

      <Section title="Subir de nivel">
        {[2, 3, 4].map(l => (
          <Btn key={l} onClick={() => setShown({ kind: 'levelup', level: l })}>Nivel {l}</Btn>
        ))}
      </Section>

      <Section title="Logros">
        {ACHIEVEMENT_IDS.map(id => (
          <Btn key={id} onClick={() => setShown({ kind: 'badge', id })}>
            {ACHIEVEMENTS[id].nameEs}
          </Btn>
        ))}
      </Section>

      <Section title="Vía NotificationQueue (flujo real, recarga)">
        <Btn onClick={() => fireViaQueue({ leveledUp: true, newLevel: 5 })}>
          Nivel
        </Btn>
        <Btn onClick={() => fireViaQueue({ challengeXpAwarded: 50, challengeText: 'Get 25 pretérito perfecto forms right, hints allowed.' })}>
          Reto
        </Btn>
        <Btn onClick={() => fireViaQueue({ newAchievements: [ACHIEVEMENT_IDS[0]] })}>
          Logro
        </Btn>
        <Btn onClick={() => fireViaQueue({
          challengeXpAwarded: 50,
          challengeText: 'Get 25 pretérito perfecto forms right, hints allowed.',
          newAchievements: ACHIEVEMENT_IDS.slice(0, 2),
          leveledUp: true,
          newLevel: 5,
        })}>
          Los tres en cola
        </Btn>
      </Section>

      {/* Clears the fixed bottom nav, which otherwise covers the last row of buttons. */}
      <div className="h-40" />

      {shown?.kind === 'challenge' && (
        <DailyChallengeModal
          open
          onClose={close}
          text="Get 25 pretérito perfecto forms right, hints allowed."
          xp={50}
        />
      )}
      {shown?.kind === 'levelup' && (
        <LevelUpModal open onClose={close} level={shown.level} />
      )}
      {shown?.kind === 'badge' && (
        <BadgeModal open onClose={close} achievement={ACHIEVEMENTS[shown.id]} />
      )}
    </div>
  )
}
