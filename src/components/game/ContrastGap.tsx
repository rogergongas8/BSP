'use client'

import ContrastOptionCard, { type ContrastCardState } from './ContrastOptionCard'

function cardState(opt: 1 | 2, selected: 1 | 2 | null, correct: 1 | 2, submitted: boolean): ContrastCardState {
  if (!submitted) return selected === opt ? 'selected' : 'default'
  if (opt === correct) return selected === opt ? 'correct-selected' : 'correct-unselected'
  return selected === opt ? 'incorrect-selected' : 'disabled'
}

export default function ContrastGap({
  optionA, optionB, correctOption, selected, submitted, showHints, iconA, iconB, bgClass, onSelect,
}: {
  optionA: string
  optionB: string
  correctOption: 1 | 2
  selected: 1 | 2 | null
  submitted: boolean
  showHints: boolean
  iconA: string
  iconB: string
  bgClass: string
  onSelect: (opt: 1 | 2) => void
}) {
  return (
    <div className={`flex flex-col gap-3 rounded-3xl p-3 ${bgClass}`}>
      <ContrastOptionCard
        label={optionA}
        state={cardState(1, selected, correctOption, submitted)}
        iconSrc={showHints ? iconA : null}
        onClick={() => onSelect(1)}
      />
      <ContrastOptionCard
        label={optionB}
        state={cardState(2, selected, correctOption, submitted)}
        iconSrc={showHints ? iconB : null}
        onClick={() => onSelect(2)}
      />
    </div>
  )
}
