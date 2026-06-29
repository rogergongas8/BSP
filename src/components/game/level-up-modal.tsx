'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'

type LevelUpModalProps = {
  open: boolean
  onClose: () => void
  level: number
}

const CATS = ['javi-tostado', 'mimo', 'zas'] as const

// Per-level cat config: size and offset relative to the number
const CAT_CONFIG = [
  { size: 90,  right: -50, bottom: -8  }, // lvl 1 (javi-tostado): más a la derecha y abajo
  { size: 200, right: -104, bottom: -52 }, // lvl 2 (mimo): más grande y abajo
  { size: 150, right: -84, bottom: -28 }, // lvl 3 (zas): igual que lvl 2
] as const

type ConfettiPiece = {
  id: number
  x: number
  drift: number   // horizontal drift in px (negative = left, positive = right)
  color: string
  w: number
  h: number
  duration: number
  delay: number
  rotations: number // total degrees to rotate during fall
}

function generateConfetti(): ConfettiPiece[] {
  const colors = ['#F5A623', '#FF8716', '#C0392B', '#F5A623', '#F5A623']
  // Use a deterministic pseudo-random sequence so SSR/CSR stays stable
  return Array.from({ length: 22 }, (_, i) => {
    const seed = (i * 137 + 31) % 100          // 0-99, nicely spread
    const seed2 = (i * 79 + 17) % 100
    return {
      id: i,
      x: 4 + (i * 4.4) % 94,
      // drift: -60..+60 px with alternating sign so pieces spread naturally
      drift: (seed < 50 ? -1 : 1) * (20 + (seed % 40)),
      color: colors[i % colors.length],
      w: 7 + (i * 3) % 8,
      h: 7 + (i * 5) % 7,
      duration: 2.0 + (seed2 * 0.022),          // 2.0 – 4.2 s
      delay: (i * 0.13) % 1.8,
      rotations: 180 + (seed * 5),              // 180-675 degrees
    }
  })
}

const CONFETTI = generateConfetti()

function ConfettiPieceEl({ p }: { p: ConfettiPiece }) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: `${p.x}%`,
        top: -16,
        width: p.w,
        height: p.h,
        backgroundColor: p.color,
        borderRadius: 1,
      }}
      animate={{
        y: ['0vh', '108vh'],
        x: [0, p.drift * 0.4, p.drift],   // ease into drift mid-fall for natural arc
        rotate: [0, p.rotations],
        opacity: [1, 1, 1, 0],             // fade only in the last quarter
      }}
      transition={{
        duration: p.duration,
        delay: p.delay,
        repeat: Infinity,
        ease: 'easeIn',                    // accelerates downward like gravity
        opacity: { times: [0, 0.6, 0.8, 1], ease: 'linear' },
      }}
    />
  )
}

export function LevelUpModal({ open, onClose, level }: LevelUpModalProps) {
  const [mounted, setMounted] = useState(false)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  const catIndex = (level - 1) % 3
  const cat = CATS[catIndex]
  const catCfg = CAT_CONFIG[catIndex]

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-[#1A1F6E]/60 backdrop-blur-md" />

          {/* Confetti */}
          {CONFETTI.map((p) => <ConfettiPieceEl key={p.id} p={p} />)}

          {/* Card */}
          <motion.div
            className="relative z-10 flex flex-col items-center px-8 select-none"
            initial={{ scale: 0.7, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 16, stiffness: 260, delay: 0.05 }}
          >
            {/* NIVEL label */}
            <motion.p
              className="text-[#F5A623] text-sm font-black tracking-[0.3em] uppercase mb-1"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              NIVEL
            </motion.p>

            {/* Number + Cat */}
            <div className="relative flex items-end justify-center">
              <motion.span
                className="font-black leading-none"
                style={{
                  fontSize: 'clamp(140px, 38vw, 180px)',
                  color: '#F5A623',
                  textShadow: '0 4px 24px rgba(245,166,35,0.4)',
                }}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.15 }}
              >
                {level}
              </motion.span>

              <motion.div
                className="absolute"
                style={{ right: catCfg.right, bottom: catCfg.bottom }}
                initial={{ x: 30, opacity: 0, scale: 0.6 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 14, stiffness: 220, delay: 0.3 }}
              >
                <Image
                  src={`/images/levelup/${cat}.png`}
                  alt="mascot"
                  width={catCfg.size}
                  height={catCfg.size}
                  className="object-contain drop-shadow-xl"
                />
              </motion.div>
            </div>

            {/* Subtitle */}
            <motion.p
              className="text-white text-xl font-bold mt-3 drop-shadow"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              ¡Has subido de nivel!
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <Button
                onClick={onClose}
                className="mt-8 rounded-full px-20 py-6 text-lg font-bold text-white shadow-lg"
                style={{ background: 'linear-gradient(135deg, #F5A623 0%, #FF8716 100%)' }}
              >
                ¡Genial!
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
