'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { ChevronRight } from 'lucide-react'
import BattleCarousel from '@/components/game/BattleCarousel'
import { createClient } from '@/lib/supabase/client'
import { getLevelInfo, catImagePath } from '@/lib/levels'
import OverscrollColor from '@/components/overscroll-color'

type TransitionPhase = 'idle' | 'curtain-down' | 'cats'

export default function LioDeTiemposPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<TransitionPhase>('idle')
  const pendingHref = useRef('')
  const [streak, setStreak] = useState(0)
  const [level, setLevel] = useState(1)
  const [avatar, setAvatar] = useState('/images/nav/user-image.svg')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('streak, total_xp').eq('id', user.id).single()
        .then(({ data }) => {
          if (!data) return
          setStreak(data.streak)
          const info = getLevelInfo(data.total_xp)
          setLevel(info.level)
          setAvatar(catImagePath(info.cat))
        })
    })
  }, [])

  const handlePlay = useCallback((href: string) => {
    if (phase !== 'idle') return
    pendingHref.current = href
    setPhase('curtain-down')
  }, [phase])

  useEffect(() => {
    if (phase !== 'cats') return
    const t = setTimeout(() => { router.push(pendingHref.current) }, 1200)
    return () => clearTimeout(t)
  }, [phase, router])

  return (
    <div className="flex flex-col min-h-screen">
      <OverscrollColor top="#2F54BA" bottom="#ffffff" />

      {/* ── Blue header ── */}
      <div className="relative bg-bsp-blue px-5 pt-8 pb-12 overflow-hidden">
        <Image src="/images/lio-de-tiempos/background.png" alt="" fill className="object-cover opacity-20 pointer-events-none select-none scale-[1.3] translate-x-[15%]" />
        <div className="relative flex items-center justify-between mb-3">
          <Image src={avatar} alt="Avatar" width={36} height={36} className="rounded-full object-contain" />
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1">
              <Image src="/images/home/fxemoji_fire.svg" alt="Racha" width={16} height={16} />
              <span className="text-white text-xs font-semibold">{streak}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1">
              <Image src="/images/home/streamline-plump-color_star-circle-flat.svg" alt="Nivel" width={16} height={16} />
              <span className="text-white text-xs font-semibold">Lvl {level}.</span>
            </div>
          </div>
        </div>
        <motion.div whileTap={{ scale: 0.9 }} className="relative mb-2 w-fit">
          <Link href="/" className="flex items-center gap-1 text-white/80 text-xs font-semibold">
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            Back
          </Link>
        </motion.div>
        <h1 className="relative text-center text-3xl font-black text-white tracking-tight">Lío de tiempos</h1>
      </div>

      {/* ── Wave ── */}
      <div className="bg-bsp-blue -mb-px">
        <svg viewBox="0 0 402 36" preserveAspectRatio="none" className="w-full block h-9">
          <path d="M0,0 C67,36 134,0 201,18 C268,36 335,0 402,18 L402,36 L0,36 Z" fill="#FFFFFF" />
        </svg>
      </div>

      {/* ── Content ── */}
      <div className="bg-white flex-1 pt-5 pb-24">
        <p className="px-5 text-sm font-black text-gray-900 mb-6">Choose your battle</p>
        <BattleCarousel onPlay={handlePlay} />
      </div>

      {/* ── Transition overlay ── */}
      {phase !== 'idle' && (
        <motion.div
          className="fixed inset-x-0 top-0 h-screen bg-bsp-blue z-50 flex items-center justify-center gap-6"
          initial={{ y: 'calc(-100% - 50px)' }}
          animate={{ y: phase === 'curtain-down' || phase === 'cats' ? '0%' : 'calc(-100% - 50px)' }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.6, 1] }}
          onAnimationComplete={() => { if (phase === 'curtain-down') setPhase('cats') }}
        >
          <div className="absolute left-0 right-0 bottom-0 translate-y-[99%]">
            <svg viewBox="0 0 402 36" preserveAspectRatio="none" className="w-full block h-9 text-bsp-blue rotate-180">
              <path d="M0,0 C67,36 134,0 201,18 C268,36 335,0 402,18 L402,36 L0,36 Z" fill="currentColor" />
            </svg>
          </div>
          {([1, 2, 3] as const).map((n, i) => (
            <motion.div key={n} animate={{ y: [0, -22, 0] }} transition={{ duration: 0.42, delay: i * 0.13, repeat: Infinity, ease: 'easeInOut' }}>
              <Image src={`/images/loading/small-loading${n}.png`} width={60} height={60} alt="" draggable={false} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
