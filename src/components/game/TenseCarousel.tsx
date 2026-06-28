'use client'

import { useState, useRef, useCallback, useEffect, memo } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, useMotionValue, useAnimation, useTransform, type MotionValue } from 'motion/react'
import { ChevronRight } from 'lucide-react'

export type TenseItem = {
  id: string
  cat: string
  catName: string
  tense: string
  color: string
  colorLight: string
  descEs: React.ReactNode
  descEn: string
  bgProps: { rotate: number; scaleX: number; scaleY: number; y: number }
  bgSvg?: string
  svgProps?: { x: number; y: number; scale: number }
  bgFullSvg?: string
}

export const TENSES: TenseItem[] = [
  {
    id: 'pretérito-perfecto',
    cat: 'javi-tostado',
    catName: 'JAVI TOSTADO',
    tense: 'PRETÉRITO PERFECTO',
    color: '#C85C6E',
    colorLight: '#D4758A',
    descEs: (
      <>
        Siempre tuvo un pie en el presente: hoy{' '}
        <span className="text-[#F5A623]">ha hecho</span> mucho, esta semana{' '}
        <span className="text-[#F5A623]">ha visto</span> de todo y, por el camino,{' '}
        <span className="text-[#F5A623]">ha cometido</span> algún error.
      </>
    ),
    descEn: 'It always had one foot in the present. today it has done a lot, this week it has seen all sorts of things and along the way, it has made a few mistakes.',
    bgProps: { rotate: -4, scaleX: 1.05, scaleY: 1.05, y: 0 },
    bgSvg: '/images/escribiendo/bg-javi.svg',
    svgProps: { x: 1, y: 2, scale: 1.04 },
    bgFullSvg: '/images/escribiendo/bg-full-javi.svg',
  },
  {
    id: 'imperfecto',
    cat: 'mimo',
    catName: 'MIMO',
    tense: 'IMPERFECTO',
    color: '#E8922A',
    colorLight: '#F0A84A',
    descEs: (
      <>
        Siempre <span className="text-[#F5A623]">estaba</span> ahí, en el fondo de la escena; mientras otros{' '}
        <span className="text-[#F5A623]">hacían</span> cosas, él{' '}
        <span className="text-[#F5A623]">describía</span> cómo{' '}
        <span className="text-[#F5A623]">era</span> todo, qué{' '}
        <span className="text-[#F5A623]">pasaba</span> y qué{' '}
        <span className="text-[#F5A623]">solía</span> ocurrir.
      </>
    ),
    descEn: 'It was always there in the background; while others were doing things, it described what things were like, what was going on and what used to happen.',
    bgProps: { rotate: 5, scaleX: 1.05, scaleY: 1.05, y: -2 },
    bgSvg: '/images/escribiendo/bg-mimo.svg',
    svgProps: { x: 3, y: 3, scale: 1.05 },
    bgFullSvg: '/images/escribiendo/bg-full-mimo.svg',
  },
  {
    id: 'indefinido',
    cat: 'zas',
    catName: 'ZAS',
    tense: 'INDEFINIDO',
    color: '#4A5BB5',
    colorLight: '#6272C8',
    descEs: (
      <>
        No se <span className="text-[#F5A623]">quedó</span> dando vueltas:{' '}
        <span className="text-[#F5A623]">entró</span>,{' '}
        <span className="text-[#F5A623]">decidió</span>,{' '}
        <span className="text-[#F5A623]">pagó</span>,{' '}
        <span className="text-[#F5A623]">salió</span> y dejó la historia lista para continuar.
      </>
    ),
    descEn: 'It did not hang around: it came in, made a decision, paid, left and moved the story on.',
    bgProps: { rotate: -2, scaleX: 1.02, scaleY: 1.02, y: -4 },
    bgSvg: '/images/escribiendo/bg-zas.svg',
    svgProps: { x: -2, y: 6, scale: 1.02 },
    bgFullSvg: '/images/escribiendo/bg-full-zas.svg',
  },
]

const GAP = 0

const TenseCard = memo(({ i, xValue, centerOffset, onClick, onPlay, isDragging, contained, cardW, itemW }: {
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
  const distance = useTransform(xValue, (latestX) => Math.abs(itemX + latestX))
  const scale = useTransform(distance, [0, itemW], [1, 0.82], { clamp: true })
  const opacity = useTransform(distance, [0, itemW], [1, 0.65], { clamp: true })
  const catBottom = useTransform(distance, [0, itemW], [80, 60], { clamp: true })
  const height = useTransform(distance, [0, itemW], contained ? [210, 160] : [200, 155], { clamp: true })
  const buttonOpacity = useTransform(distance, [0, 40], [1, 0], { clamp: true })
  const zIndex = useTransform(distance, (d) => Math.max(1, 100 - Math.floor(d / 10)))
  const tense = TENSES[i as 0 | 1 | 2]
  const bgRotate = useTransform(distance, [0, itemW], [tense.bgProps.rotate, 0], { clamp: true })
  const bgScaleX = useTransform(distance, [0, itemW], [tense.bgProps.scaleX, 1], { clamp: true })
  const bgScaleY = useTransform(distance, [0, itemW], [tense.bgProps.scaleY, 1], { clamp: true })
  const bgY = useTransform(distance, [0, itemW], [tense.bgProps.y, 0], { clamp: true })
  const [isPressed, setIsPressed] = useState(false)

  const handleClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (isDragging.current) return
    if (distance.get() <= 30) onPlay(`/practice/${tense.id}`)
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
        <motion.div
          className="absolute top-1/2 left-1/2 rounded-[28px]"
          style={{ width: cardW, height, x: -cardW / 2, y: '-50%' }}
        >
          {tense.bgFullSvg ? (
            <img src={tense.bgFullSvg} alt="" className="absolute inset-[-6px] w-[calc(100%+12px)] h-[calc(100%+12px)] object-fill pointer-events-none" />
          ) : (
            <>
              <motion.div className="absolute inset-0 pointer-events-none" style={tense.bgSvg ? {} : { rotate: bgRotate, scaleX: bgScaleX, scaleY: bgScaleY, y: bgY }}>
                {tense.bgSvg ? (
                  <div className="absolute w-full h-full" style={{ backgroundColor: tense.colorLight, maskImage: `url(${tense.bgSvg})`, maskSize: '100% 100%', maskRepeat: 'no-repeat', maskPosition: 'center', WebkitMaskImage: `url(${tense.bgSvg})`, WebkitMaskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', transform: `scale(${tense.svgProps?.scale || 1.04}) translate(${tense.svgProps?.x || 0}px, ${tense.svgProps?.y || 0}px)` }} />
                ) : (
                  <div className="w-full h-full rounded-[28px]" style={{ backgroundColor: tense.colorLight }} />
                )}
              </motion.div>
              <motion.div className="absolute inset-0 rounded-[28px]" style={{ backgroundColor: tense.color, backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%)' }} />
            </>
          )}

          <motion.div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-fit flex justify-center" style={{ opacity: buttonOpacity }}>
            <motion.div whileTap={{ scale: 0.82 }} transition={{ type: 'spring', stiffness: 500, damping: 12 }} onPointerDown={(e) => e.stopPropagation()}>
              <button
                className="flex items-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-bold text-gray-900 shadow-md"
                style={{ backgroundColor: tense.colorLight }}
                onClick={handleClick}
              >
                Jugar <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-10" style={{ width: contained ? 160 : 190, height: contained ? 160 : 190, bottom: catBottom }}>
          <Image src={`/images/escribiendo/${tense.cat}.png`} alt={tense.catName} fill className="object-contain drop-shadow-lg" draggable={false} priority />
        </motion.div>
      </motion.div>
    </motion.div>
  )
})
TenseCard.displayName = 'TenseCard'

export default function TenseCarousel({ onPlay, contained = false }: { onPlay: (href: string) => void; contained?: boolean }) {
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
      index = Math.max(0, Math.min(TENSES.length - 1, index))
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
    target = Math.max(0, Math.min(TENSES.length - 1, target))
    snapTo(target)
  }, [x, snapTo, itemW])

  const selected = TENSES[renderIndex]

  return (
    <>
      <div ref={containerRef} className="relative flex justify-center items-center" style={{ height: contained ? 220 : 260, overflow: contained ? 'hidden' : 'visible' }}>
        <motion.div
          className="absolute top-0 left-0 w-full h-full cursor-grab active:cursor-grabbing"
          style={{ x }}
          drag="x"
          dragConstraints={{ right: 0, left: -(TENSES.length - 1) * itemW }}
          animate={controls}
          onDragStart={() => { isDragging.current = true }}
          onDragEnd={handleDragEnd}
          dragElastic={0.1}
        >
          {([0, 1, 2] as const).map((i) => (
            <TenseCard key={i} i={i} xValue={x} centerOffset={centerOffset} onClick={() => snapTo(i)} onPlay={onPlay} isDragging={isDragging} contained={contained} cardW={cardW} itemW={itemW} />
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
          <p className="text-base font-black tracking-wide text-gray-900">{selected.catName}</p>
          <p className="text-xs font-semibold tracking-widest text-center text-gray-500">{selected.tense}</p>
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
