'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Star } from 'lucide-react'

type DailyChallengeModalProps = {
  open: boolean
  onClose: () => void
  /** The challenge text, as stored (`daily_challenges.text`). */
  text: string
  /** XP already credited for the completion — shown, not claimed. */
  xp: number
}

// Ring geometry. r=52 in a 128 box leaves room for the 14px stroke without clipping.
const RING_R = 52
const RING_C = 2 * Math.PI * RING_R

/** How long the ring takes to sweep from empty to full, and when the confetti follows. */
const RING_FILL_S = 1.1
const RING_DELAY_S = 0.25
const BURST_AT_S = RING_DELAY_S + RING_FILL_S

type Piece = {
  id: number
  angle: number
  distance: number
  color: string
  w: number
  h: number
  rotations: number
  duration: number
}

/**
 * Confetti that bursts outward from behind the card once the ring completes.
 *
 * Deterministic rather than `Math.random()`: this renders inside a portal that mounts on the
 * client, and a random layout would differ between the server pass and hydration.
 */
function generateBurst(): Piece[] {
  const colors = ['#4CAF50', '#F5A623', '#FF8716', '#FFFFFF', '#7CD98A']
  return Array.from({ length: 28 }, (_, i) => {
    const seed = (i * 137 + 31) % 100
    const seed2 = (i * 79 + 17) % 100
    return {
      id: i,
      // Spread evenly around the circle, nudged so the ring of pieces is not perfectly regular.
      angle: (i / 28) * 360 + (seed % 12) - 6,
      distance: 150 + (seed2 % 130),
      color: colors[i % colors.length],
      w: 7 + (i * 3) % 7,
      h: 9 + (i * 5) % 8,
      rotations: 180 + seed * 4,
      duration: 0.9 + seed2 * 0.006,
    }
  })
}

const BURST = generateBurst()

function BurstPiece({ p, still }: { p: Piece; still: boolean }) {
  const rad = (p.angle * Math.PI) / 180
  const x = Math.cos(rad) * p.distance
  const y = Math.sin(rad) * p.distance

  // Reduced motion: the pieces appear in their landed positions instead of flying out.
  if (still) {
    return (
      <div
        className="absolute left-1/2 top-1/2 pointer-events-none"
        style={{
          width: p.w,
          height: p.h,
          backgroundColor: p.color,
          borderRadius: 1,
          transform: `translate(${x * 0.6}px, ${y * 0.6}px)`,
          opacity: 0.9,
        }}
      />
    )
  }

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 pointer-events-none"
      style={{ width: p.w, height: p.h, backgroundColor: p.color, borderRadius: 1 }}
      initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 }}
      animate={{
        // Out fast, then a little further as it falls — a burst, not a uniform expansion.
        x: [0, x * 0.85, x],
        y: [0, y * 0.85, y + 40],
        scale: [0, 1, 1],
        opacity: [0, 1, 0],
        rotate: [0, p.rotations],
      }}
      transition={{
        duration: p.duration,
        delay: BURST_AT_S,
        ease: 'easeOut',
        opacity: { times: [0, 0.15, 1], delay: BURST_AT_S, duration: p.duration },
      }}
    />
  )
}

export function DailyChallengeModal({ open, onClose, text, xp }: DailyChallengeModalProps) {
  const [mounted, setMounted] = useState(false)
  const reduceMotion = useReducedMotion()

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-[#1A1F6E]/60 backdrop-blur-md" onClick={onClose} />

          {/* Burst origin sits behind the card, so pieces read as coming from under it. */}
          <div className="absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2">
            {BURST.map(p => <BurstPiece key={p.id} p={p} still={!!reduceMotion} />)}
          </div>

          {/* Card */}
          <motion.div
            className="relative z-10 w-full max-w-[20rem]"
            initial={{ scale: 0.75, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 18, stiffness: 280, delay: 0.05 }}
          >
            {/* Cat peeking over the top edge */}
            <motion.div
              className="absolute left-1/2 -top-[68px] z-20 -translate-x-1/2"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 15, stiffness: 240, delay: 0.18 }}
            >
              {/* Sized so the cat clears the pill below it rather than covering the label.
                  height:auto keeps the intrinsic ratio — next/image warns when only one axis
                  is set from CSS. */}
              <Image
                src="/images/home/avatar.svg"
                alt=""
                width={104}
                height={104}
                style={{ height: 'auto' }}
                className="object-contain drop-shadow-lg"
              />
            </motion.div>

            <div className="relative overflow-hidden rounded-[1.75rem] bg-bsp-blue px-5 pt-9 pb-6 shadow-2xl">
              {/* Pill */}
              <motion.div
                className="mx-auto flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/20 px-4 py-2 backdrop-blur-md"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
              >
                <Star className="h-4 w-4 shrink-0 fill-white text-white" />
                <span className="text-xs font-bold tracking-wide text-white whitespace-nowrap">
                  RETO DIARIO COMPLETADO
                </span>
              </motion.div>

              {/* Ring + challenge text */}
              <div className="mt-6 flex items-center gap-4">
                <div className="relative h-[6.5rem] w-[6.5rem] shrink-0">
                  <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
                    <circle
                      cx="64" cy="64" r={RING_R}
                      fill="none" stroke="#FFFFFF" strokeOpacity="0.25" strokeWidth="14"
                    />
                    {/* Sweeps from empty to full: the completion the popup is announcing. */}
                    <motion.circle
                      cx="64" cy="64" r={RING_R}
                      fill="none" stroke="#4CAF50" strokeWidth="14" strokeLinecap="round"
                      strokeDasharray={RING_C}
                      initial={{ strokeDashoffset: reduceMotion ? 0 : RING_C }}
                      animate={{ strokeDashoffset: 0 }}
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { duration: RING_FILL_S, delay: RING_DELAY_S, ease: 'easeOut' }
                      }
                    />
                  </svg>
                </div>

                <p className="flex-1 text-[1.0625rem] font-bold leading-snug text-white">
                  {text}
                </p>
              </div>

              {/* XP earned — already credited when the session saved, so this reports it. */}
              <motion.p
                className="mt-5 text-center text-sm font-black text-bsp-orange"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', damping: 12, stiffness: 260, delay: BURST_AT_S }
                }
              >
                + {xp} XP
              </motion.p>

              <Button
                onClick={onClose}
                className="mt-3 w-full rounded-full py-6 text-base font-bold text-black shadow-lg hover:brightness-105"
                style={{ background: 'linear-gradient(135deg, #F5A623 0%, #FF8716 100%)' }}
              >
                ¡Genial!
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
