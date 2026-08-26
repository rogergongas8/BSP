'use client'

import Image from 'next/image'
import { motion } from 'motion/react'
import { Check, X } from 'lucide-react'

export type ContrastCardState =
  | 'default' | 'selected' | 'correct-selected' | 'incorrect-selected' | 'disabled'

const STATE_CLASSES: Record<ContrastCardState, string> = {
  'default':            'bg-white text-gray-800 border border-bsp-blue',
  'selected':           'text-white',
  'correct-selected':   'bg-[#DCFCE7] text-[#15803D] border border-[#22C55E]',
  'incorrect-selected': 'bg-[#FFD4D4] text-[#962F45] border border-[#962F45]',
  // Every option the player did not pick, once the answer is checked — including the right one.
  'disabled':           'bg-white/60 text-gray-400 border border-gray-200',
}

export default function ContrastOptionCard({
  label, state, iconSrc, onClick, accentColor = 'var(--bsp-blue)',
}: {
  label: string
  state: ContrastCardState
  iconSrc: string | null
  onClick: () => void
  /** Background/border color used when state is 'selected' — differs per gap/column. */
  accentColor?: string
}) {
  const clickable = state === 'default' || state === 'selected'

  // Verdict badge, top-right of the card itself — and only ever on the option this player picked.
  // A tick on the right answer they did not choose read as praise for a card they never touched.
  // Nothing marks the unpicked option now: the sentence above the cards is where the right answer
  // is spelled out.
  const verdict =
    state === 'correct-selected' ? 'correct'
    : state === 'incorrect-selected' ? 'incorrect'
    : null

  return (
    <div className="relative pt-4">
      {iconSrc && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10 w-8 h-8">
          <Image src={iconSrc} alt="" width={32} height={32} className="w-full h-full object-contain" />
        </div>
      )}
      {verdict && (
        <div
          className="absolute top-2 right-1.5 z-20 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm"
          style={{ backgroundColor: verdict === 'correct' ? '#22C55E' : '#962F45' }}
        >
          {verdict === 'correct'
            ? <Check className="w-3 h-3 text-white stroke-[3.5]" />
            : <X className="w-3 h-3 text-white stroke-[3.5]" />
          }
        </div>
      )}
      <motion.button
        type="button"
        onClick={clickable ? onClick : undefined}
        whileTap={clickable ? { scale: 0.96 } : undefined}
        style={state === 'selected' ? { backgroundColor: accentColor, borderColor: accentColor, borderWidth: 1, borderStyle: 'solid' } : undefined}
        className={`w-full aspect-square max-h-[110px] rounded-2xl px-3 py-3 text-center text-sm font-bold leading-tight break-words shadow-sm transition-colors flex items-center justify-center ${STATE_CLASSES[state]} ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {label}
      </motion.button>
    </div>
  )
}
