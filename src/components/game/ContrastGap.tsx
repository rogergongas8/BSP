'use client'

import { Check, X } from 'lucide-react'
import ContrastOptionCard, { type ContrastCardState } from './ContrastOptionCard'

function cardState(opt: 1 | 2, selected: 1 | 2 | null, correct: 1 | 2, submitted: boolean): ContrastCardState {
  if (!submitted) return selected === opt ? 'selected' : 'default'
  if (opt === correct) return selected === opt ? 'correct-selected' : 'correct-unselected'
  return selected === opt ? 'incorrect-selected' : 'disabled'
}

export default function ContrastGap({
  optionA, optionB, correctOption, selected, submitted, showHints, iconA, iconB, bgColor, accentColor, showResultBadge, onSelect,
}: {
  optionA: string
  optionB: string
  correctOption: 1 | 2
  selected: 1 | 2 | null
  submitted: boolean
  showHints: boolean
  iconA: string
  iconB: string
  bgColor: string
  /** Border/background color for a selected (not-yet-submitted) card — differs per gap/column. */
  accentColor?: string
  showResultBadge?: boolean
  onSelect: (opt: 1 | 2) => void
}) {
  const isCorrect = submitted && selected === correctOption
  // Icons reveal the tense on demand via the hint toggle, but always reveal once the
  // answer is checked — that's when the user needs to see which tense they landed on.
  const showIcon = showHints || submitted

  return (
    <div className="relative flex flex-col gap-4 rounded-3xl px-4 py-6" style={{ backgroundColor: bgColor }}>
      {/* Correct/incorrect badge — only shown for phrases with 4 options (2 gaps) */}
      {showResultBadge && submitted && (
        <div
          className="absolute -top-3 -right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-sm"
          style={{ backgroundColor: isCorrect ? '#22C55E' : '#962F45' }}
        >
          {isCorrect
            ? <Check className="w-4 h-4 text-white stroke-[3]" />
            : <X className="w-4 h-4 text-white stroke-[3]" />
          }
        </div>
      )}
      <ContrastOptionCard
        label={optionA}
        state={cardState(1, selected, correctOption, submitted)}
        iconSrc={showIcon ? iconA : null}
        onClick={() => onSelect(1)}
        accentColor={accentColor}
      />
      <ContrastOptionCard
        label={optionB}
        state={cardState(2, selected, correctOption, submitted)}
        iconSrc={showIcon ? iconB : null}
        onClick={() => onSelect(2)}
        accentColor={accentColor}
      />
    </div>
  )
}
