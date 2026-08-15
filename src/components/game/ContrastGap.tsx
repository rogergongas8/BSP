'use client'

import ContrastOptionCard, { type ContrastCardState } from './ContrastOptionCard'

function cardState(opt: 1 | 2, selected: 1 | 2 | null, correct: 1 | 2 | null, submitted: boolean): ContrastCardState {
  if (!submitted || correct === null) return selected === opt ? 'selected' : 'default'
  if (opt === correct) return selected === opt ? 'correct-selected' : 'correct-unselected'
  return selected === opt ? 'incorrect-selected' : 'disabled'
}

export default function ContrastGap({
  optionA, optionB, correctOption, selected, submitted, showHints, iconA, iconB, bgColor, accentColor, showResultBadge, onSelect,
}: {
  optionA: string
  optionB: string
  /**
   * Which option is right. Only read once `submitted` is true, so callers that are still
   * taking the answer may pass null — in multiplayer the answer key genuinely isn't on the
   * client during a live round, and inventing a placeholder here would misrepresent that.
   */
  correctOption: 1 | 2 | null
  selected: 1 | 2 | null
  submitted: boolean
  showHints: boolean
  iconA: string
  iconB: string
  bgColor: string
  /** Border/background color for a selected (not-yet-submitted) card — differs per gap/column. */
  accentColor?: string
  /** @deprecated No longer read — each option card shows its own verdict badge. Kept so existing
   *  call sites stay valid; drop it once they have all been updated. */
  showResultBadge?: boolean
  onSelect: (opt: 1 | 2) => void
}) {
  // Icons reveal the tense on demand via the hint toggle, but always reveal once the
  // answer is checked — that's when the user needs to see which tense they landed on.
  const showIcon = showHints || submitted

  return (
    <div className="relative flex flex-col gap-4 rounded-3xl px-4 py-6" style={{ backgroundColor: bgColor }}>
      {/* The per-gap badge that used to sit here is gone: each ContrastOptionCard now carries its
          own verdict badge, which says the same thing more precisely (which option was right,
          not just whether the gap was). */}
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
