'use client'

import { use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { ChevronRight, Sparkles } from 'lucide-react'
import OverscrollColor from '@/components/overscroll-color'
import { BATTLES } from '@/components/game/BattleCarousel'

export default function BattlePracticePage({ params }: { params: Promise<{ tenseId: string }> }) {
  const { tenseId } = use(params)
  const router = useRouter()
  const battle = BATTLES.find(b => b.id === tenseId) ?? BATTLES[0]

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <OverscrollColor top="#2F54BA" bottom="#ffffff" />

      {/* Header */}
      <div className="relative bg-bsp-blue px-5 pt-8 pb-10 overflow-hidden">
        <motion.div whileTap={{ scale: 0.9 }} className="relative mb-3 w-fit">
          <Link href="/practice" className="flex items-center gap-1 text-white/80 text-xs font-semibold">
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            Lío de tiempos
          </Link>
        </motion.div>
        <h1 className="text-2xl font-black text-white text-center tracking-tight">{battle.catName}</h1>
        <p className="text-[11px] font-medium tracking-widest text-center text-white/70 mt-1">{battle.tense}</p>
      </div>

      {/* Wave */}
      <div className="bg-bsp-blue -mb-px">
        <svg viewBox="0 0 402 36" preserveAspectRatio="none" className="w-full block h-9">
          <path d="M0,0 C67,36 134,0 201,18 C268,36 335,0 402,18 L402,36 L0,36 Z" fill="#F9FAFB" />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center gap-5">
        <div className="relative w-48 h-48">
          <Image
            src={battle.image}
            alt={battle.catName}
            fill
            className="object-contain drop-shadow-xl"
            priority
          />
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>¡Próximamente!</span>
        </div>

        <p className="text-base font-bold text-gray-800 max-w-xs">
          Estamos preparando las frases para esta batalla de tiempos verbales.
        </p>
        <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
          Muy pronto podrás poner a prueba la diferencia entre estos tiempos con retos interactivos.
        </p>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => router.push('/practice')}
          className="mt-4 px-8 py-3.5 rounded-2xl bg-bsp-blue text-white text-sm font-bold shadow-md shadow-blue-500/20"
        >
          Volver a Lío de tiempos
        </motion.button>
      </div>
    </div>
  )
}
