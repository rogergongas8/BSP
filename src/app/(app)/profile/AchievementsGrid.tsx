'use client'

import Image from 'next/image'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ACHIEVEMENTS } from '@/lib/achievements'
import type { AchievementId } from '@/lib/achievements'

type Props = {
  unlockedIds: AchievementId[]
}

const ORDER: AchievementId[] = [
  'paso_a_paso', 'cambio_de_look', 'cata_juegos', 'viajero_del_tiempo', 'no_paras',
  'exterminador', 'ni_un_fallo', 'pequeno_gigante', 'hola_de_nuevo', 'reto_aceptado',
  'vaya_semana', 'podio', 'campeones', 'senor_del_tiempo', 'vaya_leyenda',
]

export default function AchievementsGrid({ unlockedIds }: Props) {
  const [selected, setSelected] = useState<AchievementId | null>(null)
  const unlocked = new Set(unlockedIds)
  const achievement = selected ? ACHIEVEMENTS[selected] : null

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-5 gap-2">
        {ORDER.map(id => {
          const a = ACHIEVEMENTS[id]
          const isUnlocked = unlocked.has(id)
          const isSelected = selected === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(prev => prev === id ? null : id)}
              className={`aspect-square flex items-center justify-center rounded-2xl transition-all duration-150 active:scale-90 ${
                isSelected
                  ? 'ring-2 ring-bsp-orange bg-orange-50/60 scale-105'
                  : 'hover:bg-gray-50'
              }`}
            >
              <Image
                src={a.badge}
                alt={a.nameEs}
                width={56}
                height={56}
                className={`w-full h-full object-contain p-0.5 transition-all ${
                  isUnlocked ? '' : 'grayscale opacity-40'
                }`}
              />
            </button>
          )
        })}
      </div>

      <p className="text-center text-gray-400 text-xs my-3">
        Tap to view achievement details
      </p>

      <AnimatePresence mode="wait">
        {achievement && (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="rounded-3xl border-2 border-bsp-orange p-4 flex items-center gap-4 bg-white"
          >
            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
              <Image
                src={achievement.badge}
                alt={achievement.nameEs}
                width={68}
                height={68}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gray-900 text-[15px] sm:text-base leading-tight">
                  {achievement.nameEs}
                </span>
                <span className="text-gray-300 font-light select-none">|</span>
                <span className="font-semibold text-gray-400 text-xs sm:text-sm leading-tight">
                  {achievement.nameEn}
                </span>
              </div>
              <p className="text-gray-600 text-xs sm:text-sm mt-1 leading-snug">
                {achievement.description}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
