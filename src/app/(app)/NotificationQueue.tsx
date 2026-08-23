'use client'

import { useEffect, useState } from 'react'
import { BadgeModal } from '@/components/game/badge-modal'
import { LevelUpModal } from '@/components/game/level-up-modal'
import { HostEndedModal } from '@/components/game/host-ended-modal'
import { DailyChallengeModal } from '@/components/game/daily-challenge-modal'
import { ACHIEVEMENTS } from '@/lib/achievements'
import type { AchievementId } from '@/lib/achievements'

type QueueItem =
  | { type: 'badge'; achievementId: AchievementId }
  | { type: 'levelup'; level: number }
  | { type: 'challenge'; text: string; xp: number }

export default function NotificationQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [current, setCurrent] = useState<QueueItem | null>(null)
  const [hostEndedGame, setHostEndedGame] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('bsp_session_result')
    if (raw) {
      sessionStorage.removeItem('bsp_session_result')

      try {
        const { newAchievements, leveledUp, newLevel, challengeXpAwarded, challengeText } = JSON.parse(raw)
        const items: QueueItem[] = []

        // First in the queue: it is the goal the user was chasing, and the badges and level-up
        // that follow are often consequences of the XP it just paid out.
        if (challengeXpAwarded > 0) {
          items.push({
            type: 'challenge',
            text: challengeText ?? 'Reto diario completado',
            xp: challengeXpAwarded,
          })
        }

        for (const id of (newAchievements as string[])) {
          if (id in ACHIEVEMENTS) {
            items.push({ type: 'badge', achievementId: id as AchievementId })
          }
        }
        if (leveledUp) {
          items.push({ type: 'levelup', level: newLevel })
        }

        if (items.length > 0) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setQueue(items.slice(1))
          setCurrent(items[0])
        }
      } catch {
        // ignore malformed data
      }
    }

    if (sessionStorage.getItem('bsp_host_ended_game')) {
      sessionStorage.removeItem('bsp_host_ended_game')
      setHostEndedGame(true)
    }
  }, [])

  const handleClose = () => {
    if (queue.length > 0) {
      setCurrent(queue[0])
      setQueue(q => q.slice(1))
    } else {
      setCurrent(null)
    }
  }

  return (
    <>
      {current?.type === 'badge' && (
        <BadgeModal
          open
          onClose={handleClose}
          achievement={ACHIEVEMENTS[current.achievementId]}
        />
      )}
      {current?.type === 'challenge' && (
        <DailyChallengeModal
          open
          onClose={handleClose}
          text={current.text}
          xp={current.xp}
        />
      )}
      {current?.type === 'levelup' && (
        <LevelUpModal
          open
          onClose={handleClose}
          level={current.level}
        />
      )}
      <HostEndedModal open={hostEndedGame} onClose={() => setHostEndedGame(false)} />
    </>
  )
}
