'use client'

import Image from 'next/image'
import { motion } from 'motion/react'

export type ContrastCardState =
  | 'default' | 'selected' | 'correct-selected' | 'correct-unselected' | 'incorrect-selected' | 'disabled'

const STATE_CLASSES: Record<ContrastCardState, string> = {
  'default':            'bg-white text-gray-800',
  'selected':           'bg-white text-gray-900 ring-2 ring-gray-800',
  'correct-selected':   'bg-green-500 text-white',
  'correct-unselected': 'bg-white text-gray-800 ring-2 ring-green-500',
  'incorrect-selected': 'bg-red-400 text-white',
  'disabled':           'bg-white/60 text-gray-400',
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
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-sm overflow-hidden ring-2 ring-white">
          <Image src={iconSrc} alt="" width={32} height={32} className="object-cover" />
        </div>
      )}
      <motion.button
        type="button"
        onClick={clickable ? onClick : undefined}
        whileTap={clickable ? { scale: 0.96 } : undefined}
        animate={state === 'correct-unselected' ? { x: [0, -4, 4, -4, 0] } : { x: 0 }}
        transition={state === 'correct-unselected' ? { duration: 0.4 } : undefined}
        className={`w-full min-h-[64px] rounded-2xl px-3 py-4 text-center text-sm font-bold leading-tight break-words shadow-sm transition-colors ${STATE_CLASSES[state]} ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {label}
      </motion.button>
    </div>
  )
}
