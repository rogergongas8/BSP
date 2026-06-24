'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Achievement } from '@/lib/achievements'

type BadgeModalProps = {
  open: boolean
  onClose: () => void
  achievement: Achievement
}

export function BadgeModal({ open, onClose, achievement }: BadgeModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !open) return null

  const badgeSize = 'min(148px, 37vw)'
  const whitePaddingTop = 136

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-[320px] overflow-visible rounded-3xl shadow-2xl">

        {/* ── Pink sunburst section ── */}
        <div
          className="relative flex flex-col items-center justify-center rounded-t-3xl px-5 pt-20 pb-20"
          style={{ background: 'repeating-conic-gradient(#F55379 0deg 10deg, #F76877 10deg 20deg)' }}
        >
          {/* Pill — fijo arriba */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-white/40 bg-white/20 px-4 py-1.5 backdrop-blur-md whitespace-nowrap">
            <Star className="h-3.5 w-3.5 fill-white text-white" />
            <span className="text-[11px] font-extrabold tracking-widest text-white uppercase">
              Logro Desbloqueado
            </span>
          </div>

          {/* Title — centrado en el sunburst */}
          <p className="text-lg font-black text-white drop-shadow">¡Felicidades!</p>
        </div>

        {/* ── Badge + Cat — straddle the pink/white boundary ── */}
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
            <div className="absolute top-[6px] left-1/2 z-20 -translate-x-1/2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={achievement.cats[0]} alt="mascot" className="h-12 w-12 object-contain" />
            </div>
          )}

          {/* Badge */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={achievement.badge}
            alt={achievement.nameEs}
            style={{ height: badgeSize, width: badgeSize, transform: 'translateY(36px)' }}
            className="relative z-10 object-contain drop-shadow-xl"
          />

          {/* Side cats — only for yellow (3 cats), positioned bottom-left and bottom-right */}
          {/* Bottom-left cat */}
          {achievement.cats[1] && (
            <div className="absolute -bottom-[34px] left-[86px] z-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={achievement.cats[1]} alt="mascot" className="h-16 w-16 object-contain" />
            </div>
          )}
          {/* Bottom-right cat */}
          {achievement.cats[2] && (
            <div className="absolute -bottom-[43px] right-[79px] z-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={achievement.cats[2]} alt="mascot" className="h-[70px] w-[70px] object-contain" />
            </div>
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

      </div>
    </div>,
    document.body
  )
}
