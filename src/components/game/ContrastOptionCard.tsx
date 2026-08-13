'use client'

import Image from 'next/image'
import { motion } from 'motion/react'

export type ContrastCardState =
  | 'default' | 'selected' | 'correct-selected' | 'correct-unselected' | 'incorrect-selected' | 'disabled'

const STATE_CLASSES: Record<ContrastCardState, string> = {
  'default':            'bg-white text-gray-800 border border-bsp-blue',
  'selected':           'bg-bsp-blue text-white border border-bsp-blue',
  'correct-selected':   'bg-[#DCFCE7] text-[#15803D] border border-[#22C55E]',
  'correct-unselected': 'bg-white text-gray-800 border border-[#1D841D]',
  'incorrect-selected': 'bg-[#FFD4D4] text-[#962F45] border border-[#962F45]',
  'disabled':           'bg-white/60 text-gray-400 border border-gray-200',
}

export default function ContrastOptionCard({
  label, state, iconSrc, onClick,
}: {
  label: string
  state: ContrastCardState
  iconSrc: string | null
  onClick: () => void
}) {
  const clickable = state === 'default' || state === 'selected'

  return (
    <div className="relative pt-4">
      {iconSrc && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10 w-8 h-8">
          <Image src={iconSrc} alt="" width={32} height={32} className="w-full h-full object-contain" />
        </div>
      )}
      <motion.button
        type="button"
        onClick={clickable ? onClick : undefined}
        whileTap={clickable ? { scale: 0.96 } : undefined}
        animate={state === 'correct-unselected' ? { x: [0, -4, 4, -4, 0] } : { x: 0 }}
        transition={state === 'correct-unselected' ? { duration: 0.4 } : undefined}
        className={`w-full min-h-[88px] rounded-2xl px-3 py-6 text-center text-sm font-bold leading-tight break-words shadow-sm transition-colors ${STATE_CLASSES[state]} ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {label}
      </motion.button>
    </div>
  )
}
