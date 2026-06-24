'use client'

import { useState } from 'react'
import { BadgeModal } from '@/components/game/badge-modal'
import { ACHIEVEMENTS, type AchievementId } from '@/lib/achievements'

const SAMPLES: AchievementId[] = ['senor_del_tiempo', 'paso_a_paso', 'no_paras', 'vaya_leyenda']

export function BadgeModalDemo() {
  const [current, setCurrent] = useState<AchievementId | null>(null)

  return (
    <>
      <div className="fixed bottom-24 right-2 z-40 flex flex-col gap-1">
        {SAMPLES.map((id) => (
          <button
            key={id}
            onClick={() => setCurrent(id)}
            className="rounded-full bg-[#F55379] px-3 py-1.5 text-[10px] font-bold text-white shadow-lg"
          >
            {ACHIEVEMENTS[id].nameEs}
          </button>
        ))}
      </div>

      {current && (
        <BadgeModal
          open
          onClose={() => setCurrent(null)}
          achievement={ACHIEVEMENTS[current]}
        />
      )}
    </>
  )
}
