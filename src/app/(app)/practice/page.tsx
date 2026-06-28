'use client'

import { useState, useRef, useCallback, useEffect, memo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useMotionValue, useAnimation, useTransform, MotionValue } from 'motion/react'
import { ChevronRight } from 'lucide-react'

type TransitionPhase = 'idle' | 'curtain-down' | 'cats' | 'curtain-up'

type BattleItem = {
  id: string
  catName: string
  tense: string
  descEs: React.ReactNode
  descEn: string
  bgFullSvg: string
  image: string
}

const BATTLES: BattleItem[] = [
  {
    id: 'javi-zas',
    catName: 'JAVI TOSTADO vs. ZAS',
    tense: 'PRETÉRITO PERFECTO - INDEFINIDO',
    descEs: 'Javi Tostado todavía tiene una pata en el presente. Zas pasó, hizo lo suyo y cerró la puerta al salir.',
    descEn: 'Javi Tostado still has one paw in the present. Zas came, did his thing and closed the door on the way out.',
    bgFullSvg: '/images/lio-de-tiempos/bg-javi-zas.svg',
    image: '/images/lio-de-tiempos/Battle - Javi Tostada & Zas.png',
  },
  {
    id: 'mimo-zas',
    catName: 'MIMO vs. ZAS',
    tense: 'IMPERFECTO - INDEFINIDO',
    descEs: 'Mimo preparaba la escena, Zas entró, hizo algo y cambió la historia.',
    descEn: 'Mimo was setting the scene. Zas came in, did something and changed the story.',
    bgFullSvg: '/images/lio-de-tiempos/bg-mimo-zas.svg',
    image: '/images/lio-de-tiempos/Battle - Mimo & Zas.png',
  },
  {
    id: 'javi-mimo-zas',
    catName: 'JAVI TOSTADO vs. ZAS vs. MIMO',
    tense: 'PRETÉRITO PERFECTO - INDEFINIDO - IMPERFECTO',
    descEs: 'Mientras Mimo contaba cómo era todo, Javi Tostado llegó con algo que todavía le importa, pero Zas pasó página y siguió adelante.',
    descEn: 'While Mimo was describing what everything was like, Javi Tostado arrived with something that still matters to him, but Zas turned the page and moved on.',
    bgFullSvg: '/images/lio-de-tiempos/bg-javi-mimo-zas.svg',
    image: '/images/lio-de-tiempos/Batlle - Javi Tostado & Mimo & Zas.png',
  },
]

const CARD_W = 180
const GAP = 24
const ITEM_W = CARD_W + GAP

const BattleCard = memo(({ i, xValue, centerOffset, onClick, onPlay }: { i: number, xValue: MotionValue<number>, centerOffset: number, onClick: () => void, onPlay: (href: string) => void }) => {
  const itemX = i * ITEM_W
  const distance = useTransform(xValue, (latestX) => Math.abs(itemX + latestX))
  
  const scale = useTransform(distance, [0, ITEM_W], [1, 0.82], { clamp: true })
  const opacity = useTransform(distance, [0, ITEM_W], [1, 0.65], { clamp: true })
  const catBottom = useTransform(distance, [0, ITEM_W], [35, 15], { clamp: true })
  const height = useTransform(distance, [0, ITEM_W], [200, 155], { clamp: true })
  const buttonOpacity = useTransform(distance, [0, 40], [1, 0], { clamp: true })
  const zIndex = useTransform(distance, (d) => Math.max(1, 100 - Math.floor(d / 10)))
  
  const battleIndex = i as 0 | 1 | 2
  const battle = BATTLES[battleIndex]

  const [isPressed, setIsPressed] = useState(false)

  const handleClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (distance.get() <= 30) {
      onPlay(`/practice/${battle.id}`)
    } else {
      onClick()
    }
  }

  return (
    <motion.div
      className="absolute flex-shrink-0 cursor-pointer flex flex-col justify-end"
      style={{ 
        width: CARD_W, 
        left: centerOffset + itemX,
        scale,
        opacity,
        zIndex,
        bottom: 8,
        top: 0
      }}
      onClick={handleClick}
    >
      <motion.div 
        className="w-full h-full relative"
        animate={{ scale: isPressed ? 0.94 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        onPointerDown={() => setIsPressed(true)}
        onPointerUp={() => setIsPressed(false)}
        onPointerLeave={() => setIsPressed(false)}
        onPointerCancel={() => setIsPressed(false)}
      >
        {/* Card Wrapper */}
        <motion.div
          className="absolute top-1/2 left-1/2 rounded-[28px]"
          style={{
            width: CARD_W,
            height,
            x: -CARD_W / 2,
            y: '-50%',
          }}
        >
        <img 
          src={battle.bgFullSvg} 
          alt="" 
          className="absolute inset-[-6px] w-[calc(100%+12px)] h-[calc(100%+12px)] object-fill pointer-events-none"
        />

        {/* Button */}
        <motion.div
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-fit flex justify-center"
          style={{ opacity: buttonOpacity }}
        >
          <motion.div
            whileTap={{ scale: 0.82 }}
            transition={{ type: 'spring', stiffness: 500, damping: 12 }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              className="flex items-center gap-1 rounded-full px-6 py-1.5 text-xs font-bold text-white shadow-lg whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #FF8716 0%, #F55379 100%)' }}
              onClick={handleClick}
            >
              Jugar <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Cat Battle Image */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-10"
        style={{ width: 230, height: 230, bottom: catBottom }}
      >
        <Image
          src={battle.image}
          alt={battle.catName}
          fill
          className="object-contain drop-shadow-lg"
          draggable={false}
          priority
        />
      </motion.div>
      </motion.div>
    </motion.div>
  )
})
BattleCard.displayName = 'BattleCard'

export default function LioDeTiemposPage() {
  const [renderIndex, setRenderIndex] = useState(1)
  const x = useMotionValue(-ITEM_W)
  const controls = useAnimation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [centerOffset, setCenterOffset] = useState(111)
  const router = useRouter()
  const [phase, setPhase] = useState<TransitionPhase>('idle')
  const pendingHref = useRef('')

  const handlePlay = useCallback((href: string) => {
    if (phase !== 'idle') return
    pendingHref.current = href
    setPhase('curtain-down')
  }, [phase])

  useEffect(() => {
    if (phase !== 'cats') return
    // Navigate while the curtain is down
    const t = setTimeout(() => {
      router.push(pendingHref.current)
    }, 1200)
    return () => clearTimeout(t)
  }, [phase, router])

  useEffect(() => {
    const updateCenter = () => {
      if (containerRef.current) {
        setCenterOffset(containerRef.current.offsetWidth / 2 - CARD_W / 2)
      }
    }
    updateCenter()
    window.addEventListener('resize', updateCenter)
    return () => window.removeEventListener('resize', updateCenter)
  }, [])

  useEffect(() => {
    return x.on('change', (latest) => {
      let index = Math.round(-latest / ITEM_W)
      index = Math.max(0, Math.min(BATTLES.length - 1, index))
      if (index !== renderIndex) setRenderIndex(index)
    })
  }, [x, renderIndex])

  const snapTo = useCallback((index: number) => {
    controls.start({ x: -index * ITEM_W, transition: { type: 'spring', damping: 26, stiffness: 300 } })
  }, [controls])

  const handleDragEnd = useCallback((_: unknown, info: { offset: { x: number }, velocity: { x: number } }) => {
    const currentX = x.get()
    const velocityX = info.velocity.x
    const predictedX = currentX + velocityX * 0.15
    let targetIndex = Math.round(-predictedX / ITEM_W)
    targetIndex = Math.max(0, Math.min(BATTLES.length - 1, targetIndex))
    snapTo(targetIndex)
  }, [x, snapTo])

  const selectedBattle = BATTLES[renderIndex]

  const indices = [0, 1, 2]

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Blue header ── */}
      <div className="relative bg-bsp-blue px-5 pt-8 pb-12 overflow-hidden">
        <Image
          src="/images/lio-de-tiempos/background.png"
          alt=""
          fill
          className="object-cover opacity-20 pointer-events-none select-none scale-[1.3] translate-x-[15%]"
        />
        <div className="relative flex items-center justify-between mb-3">
          <Image src="/images/nav/user-image.svg" alt="Avatar" width={36} height={36} className="rounded-full" />
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1">
              <Image src="/images/home/fxemoji_fire.svg" alt="Racha" width={16} height={16} />
              <span className="text-white text-xs font-semibold">4</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1">
              <Image src="/images/home/streamline-plump-color_star-circle-flat.svg" alt="Nivel" width={16} height={16} />
              <span className="text-white text-xs font-semibold">Lvl 2.</span>
            </div>
          </div>
        </div>
        <motion.div whileTap={{ scale: 0.9 }} className="relative mb-2 w-fit">
          <Link href="/" className="flex items-center gap-1 text-white/80 text-xs font-semibold">
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            Back
          </Link>
        </motion.div>
        <h1 className="relative text-center text-3xl font-black text-white tracking-tight">
          Lío de tiempos
        </h1>
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

        {/* ── Carousel ── */}
        <div ref={containerRef} className="relative overflow-visible" style={{ height: 260 }}>
          <motion.div
            className="absolute top-0 left-0 w-full h-full cursor-grab active:cursor-grabbing"
            style={{ x }}
            drag="x"
            dragConstraints={{ right: 0, left: -(BATTLES.length - 1) * ITEM_W }}
            animate={controls}
            onDragEnd={handleDragEnd}
            dragElastic={0.1}
          >
            {indices.map((i) => (
              <BattleCard key={i} i={i} xValue={x} centerOffset={centerOffset} onClick={() => snapTo(i)} onPlay={handlePlay} />
            ))}
          </motion.div>
        </div>

        {/* ── Info ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={renderIndex}
            className="px-6 flex flex-col items-center gap-1.5 mt-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            <p className="text-base font-black text-gray-900 tracking-wide">{selectedBattle.catName}</p>
            <p className="text-xs font-semibold text-gray-500 tracking-widest text-center">{selectedBattle.tense}</p>
            <p className="text-sm text-gray-600 text-center leading-relaxed mt-1">{selectedBattle.descEs}</p>
            <p className="text-[11px] text-gray-400 text-center leading-relaxed mt-1 px-4">{selectedBattle.descEn}</p>
          </motion.div>
        </AnimatePresence>

      </div>

      {/* ── Transition overlay ── */}
      {phase !== 'idle' && (
        <motion.div
          className="fixed inset-x-0 top-0 h-screen bg-bsp-blue z-50 flex items-center justify-center gap-6"
          initial={{ y: 'calc(-100% - 50px)' }}
          animate={{ y: phase === 'curtain-down' || phase === 'cats' ? '0%' : 'calc(-100% - 50px)' }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.6, 1] }}
          onAnimationComplete={() => {
            if (phase === 'curtain-down') setPhase('cats')
          }}
        >
          {/* Wave at the bottom of the curtain */}
          <div className="absolute left-0 right-0 bottom-0 translate-y-[99%]">
            <svg viewBox="0 0 402 36" preserveAspectRatio="none" className="w-full block h-9 text-bsp-blue rotate-180">
              <path d="M0,0 C67,36 134,0 201,18 C268,36 335,0 402,18 L402,36 L0,36 Z" fill="currentColor" />
            </svg>
          </div>
          {([1, 2, 3] as const).map((n, i) => (
            <motion.div
              key={n}
              animate={{ y: [0, -22, 0] }}
              transition={{ duration: 0.42, delay: i * 0.13, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Image src={`/images/loading/small-loading${n}.png`} width={60} height={60} alt="" draggable={false} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
