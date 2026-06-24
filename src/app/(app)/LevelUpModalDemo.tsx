'use client'

import { useState } from 'react'
import { LevelUpModal } from '@/components/game/level-up-modal'

export function LevelUpModalDemo() {
  const [level, setLevel] = useState<number | null>(null)

  return (
    <>
      <div className="fixed bottom-24 left-2 z-40 flex flex-col gap-1">
        {[1, 2, 3, 4].map((lvl) => (
          <button
            key={lvl}
            onClick={() => setLevel(lvl)}
            className="rounded-full bg-[#1A1F6E] px-3 py-1.5 text-[10px] font-bold text-white shadow-lg"
          >
            Lvl {lvl}
          </button>
        ))}
      </div>

      {level !== null && (
        <LevelUpModal
          open
          onClose={() => setLevel(null)}
          level={level}
        />
      )}
    </>
  )
}
