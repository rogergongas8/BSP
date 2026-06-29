'use client'

import { useEffect, useState } from 'react'
import { BadgeModal } from '@/components/game/badge-modal'
import { LevelUpModal } from '@/components/game/level-up-modal'
import { ACHIEVEMENTS } from '@/lib/achievements'
import type { AchievementId } from '@/lib/achievements'

type QueueItem =
  | { type: 'badge'; achievementId: AchievementId }
  | { type: 'levelup'; level: number }

export default function NotificationQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [current, setCurrent] = useState<QueueItem | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('bsp_session_result')
    if (!raw) return
    sessionStorage.removeItem('bsp_session_result')

    try {
      const { newAchievements, leveledUp, newLevel } = JSON.parse(raw)
      const items: QueueItem[] = []

      for (const id of (newAchievements as string[])) {
        if (id in ACHIEVEMENTS) {
          items.push({ type: 'badge', achievementId: id as AchievementId })
        }
      }
      if (leveledUp) {
        items.push({ type: 'levelup', level: newLevel })
      }

      if (items.length > 0) {
        setQueue(items.slice(1))
        setCurrent(items[0])
      }
    } catch {
      // ignore malformed data
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

  if (!current) return null

  if (current.type === 'badge') {
    const achievement = ACHIEVEMENTS[current.achievementId]
    return (
      <BadgeModal
        open
        onClose={handleClose}
        achievement={achievement}
      />
    )
  }

  return (
    <LevelUpModal
      open
      onClose={handleClose}
      level={current.level}
    />
  )
}
