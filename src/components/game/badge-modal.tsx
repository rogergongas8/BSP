'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Achievement } from '@/lib/achievements'

type BadgeModalProps = {
  open: boolean
  onClose: () => void
  achievement: Achievement
}

type Piece = {
  id: number
  angle: number
  distance: number
  color: string
  w: number
  h: number
  rotations: number
  duration: number
  delay: number
}

/**
 * Confetti that bursts from behind the card when the badge lands.
 *
 * Deterministic rather than `Math.random()`: this renders inside a portal that mounts on the
 * client, and a random layout would differ between the server pass and hydration.
 *
 * The throw is deliberately biased vertically. The card is tall and narrow (320px wide, ~600px
 * tall), so an evenly-spread circular burst hides most of its pieces behind the card and only
 * the near-horizontal ones escape — which reads as "a few bits peeking out at the sides", not
 * as a celebration. Pieces are pushed toward the top and bottom edges, where there is room for
 * them to be seen, and thrown far enough to clear the card in every direction.
 */
function generateBurst(): Piece[] {
  const colors = ['#F55379', '#F5A623', '#FFFFFF', '#FF8716', '#FFD166']
  return Array.from({ length: 46 }, (_, i) => {
    const seed = (i * 137 + 31) % 100
    const seed2 = (i * 79 + 17) % 100

    // Spread within the upper OR lower fan rather than the full circle: alternating pieces go
    // up and down, each covering a 150° arc centred on straight up / straight down.
    const up = i % 2 === 0
    const t = (i / 46) + (seed % 10) / 100          // 0..~1.1, the position within the fan
    const spread = 150
    const angle = up
      ? -90 - spread / 2 + (t % 1) * spread          // fan pointing up
      :  90 - spread / 2 + (t % 1) * spread          // fan pointing down

    return {
      id: i,
      angle,
      // Far enough to clear the card: half its width is 160px, half its height ~300px.
      distance: 300 + (seed2 % 220),
      color: colors[i % colors.length],
      w: 8 + (i * 3) % 8,
      h: 10 + (i * 5) % 9,
      rotations: 200 + seed * 5,
      duration: 1.1 + seed2 * 0.008,
      // A small stagger so it reads as a burst rather than a single popped ring.
      delay: (i % 5) * 0.045,
    }
  })
}

const BURST = generateBurst()

/** Fires just after the badge has sprung into place (its own delay is 0.08s). */
const BURST_AT_S = 0.3

function BurstPiece({ p, still }: { p: Piece; still: boolean }) {
  const rad = (p.angle * Math.PI) / 180
  const x = Math.cos(rad) * p.distance
  const y = Math.sin(rad) * p.distance

  // Reduced motion: pieces sit in their landed positions instead of flying out.
  if (still) {
    return (
      <div
        className="absolute left-1/2 top-1/2 pointer-events-none"
        style={{
          width: p.w,
          height: p.h,
          backgroundColor: p.color,
          borderRadius: 1,
          transform: `translate(${x * 0.7}px, ${y * 0.7}px)`,
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
        x: [0, x * 0.85, x],
        y: [0, y * 0.85, y + 56],   // drifts down at the end, so it falls rather than freezes
        scale: [0, 1, 1],
        opacity: [0, 1, 0],
        rotate: [0, p.rotations],
      }}
      transition={{
        duration: p.duration,
        delay: BURST_AT_S + p.delay,
        ease: 'easeOut',
        // A per-property override replaces the parent transition rather than extending it, so
        // duration and delay have to be repeated here or opacity runs on its own default.
        opacity: {
          duration: p.duration,
          delay: BURST_AT_S + p.delay,
          times: [0, 0.12, 1],
          ease: 'linear',
        },
      }}
    />
  )
}

export function BadgeModal({ open, onClose, achievement }: BadgeModalProps) {
  const [mounted, setMounted] = useState(false)
  const reduceMotion = useReducedMotion()

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  const badgeSize = 'min(148px, 37vw)'
  const whitePaddingTop = 136

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

          {/* Burst origin sits behind the card, so the pieces read as coming from under it. */}
          <div className="absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2">
            {BURST.map(p => <BurstPiece key={p.id} p={p} still={!!reduceMotion} />)}
          </div>

          {/* Card */}
          <motion.div
            className="relative z-10 w-full max-w-[20rem] overflow-visible rounded-3xl shadow-2xl"
            initial={{ scale: 0.75, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 18, stiffness: 280, delay: 0.05 }}
          >

            {/* ── Pink sunburst section ── */}
            <div
              className="relative flex flex-col items-center justify-center rounded-t-3xl px-5 pt-20 pb-20"
              style={{ background: 'repeating-conic-gradient(#F55379 0deg 10deg, #F76877 10deg 20deg)' }}
            >
              {/* Pill */}
              <motion.div
                className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-white/40 bg-white/20 px-4 py-1.5 backdrop-blur-md whitespace-nowrap"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
              >
                <Star className="h-3.5 w-3.5 fill-white text-white" />
                <span className="text-[11px] font-extrabold tracking-widest text-white uppercase">
                  Logro Desbloqueado
                </span>
              </motion.div>

              {/* ¡Felicidades! */}
              <motion.p
                className="text-lg font-black text-white drop-shadow"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0 }}
              >
                ¡Felicidades!
              </motion.p>
            </div>

            {/* ── Badge + Cats ── */}
            <div
              className="relative z-10 flex justify-center"
              style={{
                marginTop: `calc(-1 * ${badgeSize} / 2)`,
                marginBottom: `calc(-1 * ${badgeSize} / 2)`,
                transform: 'translateY(4px)',
              }}
            >
              {/* Top cat */}
              {achievement.cats[0] && (
                <motion.div
                  className="absolute top-[6px] left-1/2 z-20 -translate-x-1/2"
                  initial={{ opacity: 0, y: -16, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', damping: 14, stiffness: 240, delay: 0.12 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={achievement.cats[0]} alt="mascot" className="h-12 w-12 object-contain" />
                </motion.div>
              )}

              {/* Badge */}
              <motion.img
                src={achievement.badge}
                alt={achievement.nameEs}
                style={{ height: badgeSize, width: badgeSize, translateY: 36 }}
                className="relative z-10 object-contain drop-shadow-xl"
                initial={{ scale: 0.3, opacity: 0, rotate: -15 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.08 }}
              />

              {/* Bottom-left cat */}
              {achievement.cats[1] && (
                <motion.div
                  className="absolute -bottom-[34px] left-[5.375rem] z-20"
                  initial={{ opacity: 0, x: -20, scale: 0.6 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ type: 'spring', damping: 14, stiffness: 240, delay: 0.15 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={achievement.cats[1]} alt="mascot" className="h-16 w-16 object-contain" />
                </motion.div>
              )}

              {/* Bottom-right cat */}
              {achievement.cats[2] && (
                <motion.div
                  className="absolute -bottom-[43px] right-[4.9375rem] z-0"
                  initial={{ opacity: 0, x: 20, scale: 0.6 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ type: 'spring', damping: 14, stiffness: 240, delay: 0.2 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={achievement.cats[2]} alt="mascot" className="h-[4.375rem] w-[4.375rem] object-contain" />
                </motion.div>
              )}
            </div>

            {/* ── White section ── */}
            <div
              className="flex flex-col items-center gap-3 rounded-b-3xl bg-white px-5 pb-7"
              style={{ paddingTop: whitePaddingTop }}
            >
              <p className="text-center text-sm font-black text-gray-900 leading-tight">
                {achievement.nameEs} | {achievement.nameEn}
              </p>
              <p className="text-center text-xs text-gray-400">{achievement.description}</p>

              <Button
                onClick={onClose}
                className={cn(
                  'mt-2 w-2/3 rounded-full py-2.5 text-xs font-bold text-white shadow-md',
                  'bg-[#F55379] hover:bg-[#e04060] active:scale-95 transition-transform'
                )}
              >
                ¡Genial!
              </Button>

              <p className="text-center text-[10px] text-gray-300">
                You can view all your badges in your profile
              </p>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
