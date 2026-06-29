'use client'

import Image from 'next/image'
import { useState } from 'react'
import { ACHIEVEMENTS } from '@/lib/achievements'
import type { AchievementId } from '@/lib/achievements'

type Props = {
  unlockedIds: AchievementId[]
  total: number
}

const ORDER: AchievementId[] = [
  'paso_a_paso', 'cambio_de_look', 'cata_juegos', 'viajero_del_tiempo', 'no_paras',
  'exterminador', 'ni_un_fallo', 'pequeno_gigante', 'hola_de_nuevo', 'reto_aceptado',
  'vaya_semana', 'podio', 'campeones', 'senor_del_tiempo', 'vaya_leyenda',
]

export default function AchievementsGrid({ unlockedIds, total }: Props) {
  const [selected, setSelected] = useState<AchievementId | null>(null)
  const unlocked = new Set(unlockedIds)
  const achievement = selected ? ACHIEVEMENTS[selected] : null

  return (
    <>
      <div className="grid grid-cols-5 gap-2 mb-3">
        {ORDER.map(id => {
          const a = ACHIEVEMENTS[id]
          const isUnlocked = unlocked.has(id)
          const isSelected = selected === id
          return (
            <button
              key={id}
              onClick={() => setSelected(prev => prev === id ? null : id)}
              className={`aspect-square flex items-center justify-center rounded-xl transition-transform active:scale-90 ${isSelected ? 'ring-2 ring-bsp-blue bg-blue-50' : ''}`}
            >
              <Image
                src={a.badge}
                alt={a.nameEs}
                width={56}
                height={56}
                className={`w-full h-full object-contain p-0.5 ${isUnlocked ? '' : 'grayscale opacity-40'}`}
              />
            </button>
          )
        })}
      </div>

      {achievement && (
        <div className="bg-gray-50 rounded-xl px-4 py-3 mb-2">
          <p className="font-bold text-gray-800 text-sm">{achievement.nameEs}</p>
          <p className="text-gray-500 text-xs mt-0.5">{achievement.description}</p>
        </div>
      )}

      <p className="text-center text-gray-400 text-xs">Tap to view achievement details</p>
    </>
  )
}
