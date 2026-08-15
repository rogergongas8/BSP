/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useRef, useCallback, useEffect, memo } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, useMotionValue, useAnimation, useTransform, type MotionValue } from 'motion/react'
import { ChevronRight } from 'lucide-react'

export type BattleItem = {
  id: string
  catName: string
  tense: string
  gradient: string
  descEs: string
  descEn: string
  bgFullSvg: string
  image: string
}

export const BATTLES: BattleItem[] = [
  {
    id: 'javi-zas',
    catName: 'JAVI TOSTADO vs. ZAS',
    tense: 'PRETÉRITO PERFECTO - INDEFINIDO',
    gradient: 'linear-gradient(135deg, #C85C6E 0%, #E8922A 100%)',
    descEs: 'Javi Tostado todavía tiene una pata en el presente. Zas pasó, hizo lo suyo y cerró la puerta al salir.',
    descEn: 'Javi Tostado still has one paw in the present. Zas came, did his thing and closed the door on the way out.',
    bgFullSvg: '/images/lio-de-tiempos/bg-javi-zas.svg',
    image: '/images/lio-de-tiempos/Battle - Javi Tostada & Zas.png',
  },
  {
    id: 'mimo-zas',
    catName: 'MIMO vs. ZAS',
    tense: 'IMPERFECTO - INDEFINIDO',
    gradient: 'linear-gradient(135deg, #E8922A 0%, #FF8716 100%)',
    descEs: 'Mimo preparaba la escena, Zas entró, hizo algo y cambió la historia.',
    descEn: 'Mimo was setting the scene. Zas came in, did something and changed the story.',
    bgFullSvg: '/images/lio-de-tiempos/bg-mimo-zas.svg',
    image: '/images/lio-de-tiempos/Battle - Mimo & Zas.png',
  },
  {
    id: 'javi-mimo-zas',
    catName: 'JAVI TOSTADO vs. ZAS vs. MIMO',
    tense: 'PRETÉRITO PERFECTO - INDEFINIDO - IMPERFECTO',
    gradient: 'linear-gradient(135deg, #4A5BB5 0%, #8B75C0 100%)',
    descEs: 'Mientras Mimo contaba cómo era todo, Javi Tostado llegó con algo que todavía le importa, pero Zas pasó página y siguió adelante.',
    descEn: 'While Mimo was describing what everything was like, Javi Tostado arrived with something that still matters to him, but Zas turned the page and moved on.',
    bgFullSvg: '/images/lio-de-tiempos/bg-javi-mimo-zas.svg',
    image: '/images/lio-de-tiempos/Batlle - Javi Tostado & Mimo & Zas.png',
  },
]

const GAP = 24

const BattleCard = memo(({ i, xValue, centerOffset, onClick, onPlay, isDragging, contained, cardW, itemW }: {
  i: number
  xValue: MotionValue<number>
  centerOffset: number
  onClick: () => void
  onPlay: (href: string) => void
  isDragging: { current: boolean }
  contained: boolean
  cardW: number
  itemW: number
}) => {
  const itemX = i * itemW
  // Snap sub-pixel rest values (spring settle jitter, odd-width centerOffset rounding) to exactly 0 —
  // otherwise the centered card's scale/height/etc land a hair under their "selected" value and the
  // Jugar button reads as randomly smaller even though nothing is actually mid-animation.
  const distance = useTransform(xValue, (latestX) => {
    const raw = Math.abs(itemX + latestX)
    return raw < 1 ? 0 : raw
  })
  const scale = useTransform(distance, [0, itemW], [1, 0.82], { clamp: true })
  const opacity = useTransform(distance, [0, itemW], [1, 0.65], { clamp: true })
  const catBottom = useTransform(distance, [0, itemW], [35, 15], { clamp: true })
  const height = useTransform(distance, [0, itemW], contained ? [210, 160] : [200, 155], { clamp: true })
  const buttonOpacity = useTransform(distance, [0, 40], [1, 0], { clamp: true })
  const zIndex = useTransform(distance, (d) => Math.max(1, 40 - Math.floor(d / 10)))
  const battle = BATTLES[i as 0 | 1 | 2]
  const [isPressed, setIsPressed] = useState(false)

  const handleClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (isDragging.current) return
    if (distance.get() <= 30) onPlay(`/practice/${battle.id}`)
    else onClick()
  }

  return (
    <motion.div
      className="absolute flex-shrink-0 cursor-pointer flex flex-col justify-end"
      style={{ width: cardW, left: centerOffset + itemX, scale, opacity, zIndex, bottom: 8, top: 0 }}
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
        <motion.div className="absolute top-1/2 left-1/2 rounded-[28px]" style={{ width: cardW, height, x: -cardW / 2, y: '-50%' }}>
          <img src={battle.bgFullSvg} alt="" className="absolute inset-[-6px] w-[calc(100%+12px)] h-[calc(100%+12px)] object-fill pointer-events-none" />

          <motion.div className={`absolute ${contained ? 'bottom-2' : '-bottom-3'} left-1/2 -translate-x-1/2 w-fit flex justify-center`} style={{ opacity: buttonOpacity }}>
            <motion.div whileTap={{ scale: 0.82 }} transition={{ type: 'spring', stiffness: 500, damping: 12 }} onPointerDown={(e) => e.stopPropagation()}>
              <button
                className="flex items-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-bold text-gray-800 shadow-md backdrop-blur-sm"
                style={{ background: 'rgba(255,255,255,0.38)' }}
                onClick={handleClick}
              >
                Jugar <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-10" style={{ width: contained ? 190 : 230, height: contained ? 190 : 230, bottom: catBottom }}>
          <Image src={battle.image} alt={battle.catName} fill className="object-contain drop-shadow-lg" draggable={false} priority />
        </motion.div>
      </motion.div>
    </motion.div>
  )
})
BattleCard.displayName = 'BattleCard'

export default function BattleCarousel({ onPlay, contained = false }: { onPlay: (href: string) => void; contained?: boolean }) {
  const cardW = contained ? 150 : 180
  const itemW = cardW + GAP
  const [renderIndex, setRenderIndex] = useState(1)
  const x = useMotionValue(-itemW)
  const controls = useAnimation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [centerOffset, setCenterOffset] = useState(111)
  const isDragging = useRef(false)

  useEffect(() => {
    const update = () => { if (containerRef.current) setCenterOffset(containerRef.current.offsetWidth / 2 - cardW / 2) }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [cardW])

  useEffect(() => {
    return x.on('change', (latest) => {
      let index = Math.round(-latest / itemW)
      index = Math.max(0, Math.min(BATTLES.length - 1, index))
      if (index !== renderIndex) setRenderIndex(index)
    })
  }, [x, renderIndex, itemW])

  const snapTo = useCallback((index: number) => {
    controls.start({ x: -index * itemW, transition: { type: 'spring', damping: 26, stiffness: 300 } })
  }, [controls, itemW])

  const handleDragEnd = useCallback((_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    setTimeout(() => { isDragging.current = false }, 50)
    const predicted = x.get() + info.velocity.x * 0.15
    let target = Math.round(-predicted / itemW)
    target = Math.max(0, Math.min(BATTLES.length - 1, target))
    snapTo(target)
  }, [x, snapTo, itemW])

  const selected = BATTLES[renderIndex]

  return (
    <>
      <div ref={containerRef} className="relative flex justify-center items-center" style={{ height: contained ? 220 : 260, overflow: contained ? 'hidden' : 'visible' }}>
        <motion.div
          className="absolute top-0 left-0 w-full h-full cursor-grab active:cursor-grabbing select-none"
          style={{ x }}
          drag="x"
          dragConstraints={{ right: 0, left: -(BATTLES.length - 1) * itemW }}
          animate={controls}
          onDragStart={() => { isDragging.current = true }}
          onDragEnd={handleDragEnd}
          dragElastic={0.1}
        >
          {([0, 1, 2] as const).map((i) => (
            <BattleCard key={i} i={i} xValue={x} centerOffset={centerOffset} onClick={() => snapTo(i)} onPlay={onPlay} isDragging={isDragging} contained={contained} cardW={cardW} itemW={itemW} />
          ))}
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={renderIndex}
          className="px-6 flex flex-col items-center gap-1.5 mt-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18 }}
        >
          <p className={`text-sm font-semibold tracking-wide ${contained ? 'text-white' : 'text-gray-900'}`}>{selected.catName}</p>
          <p className={`text-[10px] font-medium tracking-widest text-center ${contained ? 'text-white/60' : 'text-gray-500'}`}>{selected.tense}</p>
          {!contained && (
            <>
              <p className="text-sm text-gray-600 text-center leading-relaxed mt-1">{selected.descEs}</p>
              <p className="text-[11px] text-gray-400 text-center leading-relaxed mt-1 px-4">{selected.descEn}</p>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  )
}
