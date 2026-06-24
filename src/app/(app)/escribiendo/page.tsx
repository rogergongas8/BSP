'use client'

import { useState, useRef, useCallback, useEffect, memo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence, useMotionValue, useAnimation, useTransform, MotionValue } from 'motion/react'
import { ChevronRight } from 'lucide-react'

const TENSES = [
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
] as const

const CARD_W = 180
const GAP = 0
const ITEM_W = CARD_W + GAP

const TenseCard = memo(({ i, xValue, centerOffset, onClick }: { i: number, xValue: MotionValue<number>, centerOffset: number, onClick: () => void }) => {
  const itemX = i * ITEM_W
  const distance = useTransform(xValue, (latestX) => Math.abs(itemX + latestX))
  
  const scale = useTransform(distance, [0, ITEM_W], [1, 0.82], { clamp: true })
  const opacity = useTransform(distance, [0, ITEM_W], [1, 0.65], { clamp: true })
  const catBottom = useTransform(distance, [0, ITEM_W], [80, 60], { clamp: true })
  const height = useTransform(distance, [0, ITEM_W], [200, 155], { clamp: true })
  const buttonOpacity = useTransform(distance, [0, 40], [1, 0], { clamp: true })
  const zIndex = useTransform(distance, (d) => Math.max(1, 100 - Math.floor(d / 10)))
  
  const tenseIndex = ((i % 3) + 3) % 3
  const tense = TENSES[tenseIndex]

  // Rotated background animations using custom props per tense
  const bgRotate = useTransform(distance, [0, ITEM_W], [tense.bgProps.rotate, 0], { clamp: true })
  const bgScaleX = useTransform(distance, [0, ITEM_W], [tense.bgProps.scaleX, 1], { clamp: true })
  const bgScaleY = useTransform(distance, [0, ITEM_W], [tense.bgProps.scaleY, 1], { clamp: true })
  const bgY = useTransform(distance, [0, ITEM_W], [tense.bgProps.y, 0], { clamp: true })
  
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
      onClick={onClick}
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
        {tense.bgFullSvg ? (
          <img 
            src={tense.bgFullSvg} 
            alt="" 
            className="absolute inset-[-6px] w-[calc(100%+12px)] h-[calc(100%+12px)] object-fill pointer-events-none"
          />
        ) : (
          <>
            {/* Light Rotated Background */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={tense.bgSvg ? {} : { rotate: bgRotate, scaleX: bgScaleX, scaleY: bgScaleY, y: bgY }}
            >
              {tense.bgSvg ? (
                <div 
                  className="absolute w-full h-full"
                  style={{ 
                    backgroundColor: tense.colorLight,
                    maskImage: `url(${tense.bgSvg})`,
                    maskSize: '100% 100%',
                    maskRepeat: 'no-repeat',
                    maskPosition: 'center',
                    WebkitMaskImage: `url(${tense.bgSvg})`,
                    WebkitMaskSize: '100% 100%',
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    transform: `scale(${tense.svgProps?.scale || 1.04}) translate(${tense.svgProps?.x || 0}px, ${tense.svgProps?.y || 0}px)`
                  }} 
                />
              ) : (
                <div className="w-full h-full rounded-[28px]" style={{ backgroundColor: tense.colorLight }} />
              )}
            </motion.div>
            
            {/* Dark Main Background with Gradient Overlay */}
            <motion.div
              className="absolute inset-0 rounded-[28px]"
              style={{ 
                backgroundColor: tense.color,
                backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%)'
              }}
            />
          </>
        )}

        {/* Button */}
        <motion.div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full flex justify-center"
          style={{ opacity: buttonOpacity }}
        >
          <Link
            href={`/practice/${tense.id}`}
            className="flex items-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-bold text-gray-900 shadow-md"
            style={{ backgroundColor: tense.colorLight }}
            onClick={(e) => {
              if (distance.get() > 10) {
                e.preventDefault()
              } else {
                e.stopPropagation()
              }
            }}
          >
            Jugar <ChevronRight className="w-4 h-4 stroke-[3]" />
          </Link>
        </motion.div>
      </motion.div>

      {/* Cat — overflows above, rendered after Card Wrapper to appear on top */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-10"
        style={{ width: 190, height: 190, bottom: catBottom }}
      >
        <Image
          src={`/images/escribiendo/${tense.cat}.png`}
          alt={tense.catName}
          fill
          className="object-contain drop-shadow-lg"
          draggable={false}
          priority
        />
      </motion.div>
    </motion.div>
  )
})
TenseCard.displayName = 'TenseCard'

export default function EscribiendoPage() {
  const [renderIndex, setRenderIndex] = useState(0)
  const x = useMotionValue(0)
  const controls = useAnimation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [centerOffset, setCenterOffset] = useState(111)

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
      const index = Math.round(-latest / ITEM_W)
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
    const targetIndex = Math.round(-predictedX / ITEM_W)
    snapTo(targetIndex)
  }, [x, snapTo])

  const selectedTense = TENSES[((renderIndex % 3) + 3) % 3]

  const indices = []
  for (let i = renderIndex - 2; i <= renderIndex + 2; i++) {
    indices.push(i)
  }

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Blue header ── */}
      <div className="relative bg-bsp-blue px-5 pt-8 pb-12 overflow-hidden">
        <Image
          src="/images/escribiendo/background.png"
          alt=""
          fill
          className="object-cover opacity-20 pointer-events-none select-none"
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
        <div className="relative mb-2">
          <Link href="/" className="flex items-center gap-1 text-white/80 text-xs font-semibold w-fit">
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            Back
          </Link>
        </div>
        <h1 className="relative text-center text-3xl font-black text-white tracking-tight">
          Escribiendo...
        </h1>
      </div>

      {/* ── Wave ── */}
      <div className="bg-bsp-blue -mb-px">
        <svg viewBox="0 0 402 36" preserveAspectRatio="none" className="w-full block h-9">
          <path d="M0,0 C67,36 134,0 201,18 C268,36 335,0 402,18 L402,36 L0,36 Z" fill="#FFFFFF" />
        </svg>
      </div>

      {/* ── Content ── */}
      <div className="bg-white flex-1 pt-5 pb-8">

        <p className="px-5 text-sm font-black text-gray-900 mb-10">Choose your tense</p>

        {/* ── Carousel ── */}
        <div ref={containerRef} className="relative overflow-hidden" style={{ height: 280 }}>
          <motion.div
            className="absolute top-0 left-0 w-full h-full cursor-grab active:cursor-grabbing"
            style={{ x }}
            drag="x"
            animate={controls}
            onDragEnd={handleDragEnd}
            dragElastic={0.1}
          >
            {indices.map((i) => (
              <TenseCard key={i} i={i} xValue={x} centerOffset={centerOffset} onClick={() => snapTo(i)} />
            ))}
          </motion.div>
        </div>

        {/* ── Info ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={renderIndex}
            className="px-6 flex flex-col items-center gap-2 mt-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            <p className="text-base font-black text-gray-900 tracking-wide">{selectedTense.catName}</p>
            <p className="text-xs font-semibold text-gray-500 tracking-widest">{selectedTense.tense}</p>
            <p className="text-sm text-gray-600 text-center leading-relaxed mt-1">{selectedTense.descEs}</p>
            <p className="text-[11px] text-gray-400 text-center leading-relaxed mt-1 px-4">{selectedTense.descEn}</p>
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  )
}
