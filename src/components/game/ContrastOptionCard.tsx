'use client'

import Image from 'next/image'
import { motion } from 'motion/react'

export type ContrastCardState =
  | 'default' | 'selected' | 'correct-selected' | 'correct-unselected' | 'incorrect-selected' | 'disabled'

const STATE_CLASSES: Record<ContrastCardState, string> = {
  'default':            'bg-white border-2 border-blue-600 text-gray-900',
  'selected':           'bg-blue-800 border-2 border-blue-800 text-white',
  'correct-selected':   'bg-green-600 border-2 border-green-600 text-white',
  'correct-unselected': 'bg-white border-2 border-green-600 text-gray-900',
  'incorrect-selected': 'bg-red-100 border-2 border-red-400 text-red-900',
  'disabled':           'bg-gray-200 border-2 border-gray-200 text-gray-400',
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
    <div className="relative pt-5">
      {iconSrc && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 w-9 h-9 rounded-full bg-white shadow-sm overflow-hidden">
          <Image src={iconSrc} alt="" width={36} height={36} className="object-cover" />
        </div>
      )}
      <motion.button
        type="button"
        onClick={clickable ? onClick : undefined}
        whileTap={clickable ? { scale: 0.96 } : undefined}
        animate={state === 'correct-unselected' ? { x: [0, -4, 4, -4, 0] } : { x: 0 }}
        transition={state === 'correct-unselected' ? { duration: 0.4 } : undefined}
        className={`w-full rounded-2xl px-2 py-5 text-center text-sm font-bold leading-tight break-words transition-colors ${STATE_CLASSES[state]} ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {label}
      </motion.button>
    </div>
  )
}
