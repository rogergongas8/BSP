'use client'

import Image from 'next/image'
import { Check, X } from 'lucide-react'

/** One gap's worth of result data — the correct answer, the class-wide correct/incorrect tally
 * for that gap, and whether the current user got this specific gap right. */
type GapResult = {
  answer: string
  correctCount: number
  incorrectCount: number
  icon: string
  userWasCorrect: boolean
}

/** Background fill for the non-selected side, and the highlighted (bordered, rounded) pill
 * for whichever side this user actually landed on. */
export function ResultBar({ correctCount, incorrectCount, userWasCorrect }: {
  correctCount: number
  incorrectCount: number
  userWasCorrect: boolean
}) {
  const total = correctCount + incorrectCount
  const correctPct = total > 0 ? (correctCount / total) * 100 : 0

  const highlight = userWasCorrect
    ? { side: 'left' as const, width: correctPct, color: '#1D841D', bg: 'bg-green-200', text: 'text-green-900', count: correctCount }
    : { side: 'right' as const, width: 100 - correctPct, color: '#DC2626', bg: 'bg-red-100', text: 'text-red-900', count: incorrectCount }
  const flat = userWasCorrect
    ? { bg: 'bg-red-100', text: 'text-green-900', count: incorrectCount }
    : { bg: 'bg-green-200', text: 'text-red-900', count: correctCount }

  return (
    <div className="relative w-full h-6 rounded-full overflow-hidden">
      <div className={`absolute inset-0 flex items-center text-xs font-bold ${flat.bg} ${flat.text} ${highlight.side === 'left' ? 'justify-end pr-2.5' : 'justify-start pl-2.5'}`}>
        {flat.count}
      </div>
      <div
        className={`absolute inset-y-0 rounded-full border-2 flex items-center text-xs font-bold transition-all duration-700 box-border ${highlight.bg} ${highlight.text} ${highlight.side === 'left' ? 'left-0 justify-start pl-2.5' : 'right-0 justify-end pr-2.5'}`}
        style={{ width: `${highlight.width}%`, borderColor: highlight.color }}
      >
        {highlight.count}
      </div>
    </div>
  )
}

export default function ContrastResultCard({
  gap1, gap2,
}: {
  /** Null when the round's answer key isn't available (a failed results fetch) — the card is
   * then skipped entirely rather than rendered with a guessed answer. */
  gap1: GapResult | null
  gap2: GapResult | null
}) {
  if (!gap1) return null

  const gaps = gap2 ? [gap1, gap2] : [gap1]

  return (
    <div className="bg-white rounded-2xl p-4 border-2 border-gray-200">
      <p className="text-[10px] font-black tracking-widest uppercase mb-4" style={{ color: '#1D841D' }}>
        Correct Answer
      </p>
      <div className={gaps.length === 2 ? 'grid grid-cols-2 gap-4' : ''}>
        {gaps.map((gap, i) => (
          <div key={i} className="flex flex-col items-center gap-5 rounded-2xl pt-5 pb-3 px-3">
            {/* Icon floats directly over the answer box's top border — no backing circle. */}
            <div className="relative w-full max-w-[140px] flex flex-col items-center">
              <div className="absolute -top-4 z-10 w-8 h-8">
                <Image src={gap.icon} alt="" width={32} height={32} className="w-full h-full object-contain" />
              </div>
              {/* Same corner badge ContrastGap uses when an answer is checked, so getting it
                  right or wrong reads identically across the game. */}
              <div
                className="absolute -top-2.5 -right-2.5 z-10 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-sm"
                style={{ backgroundColor: gap.userWasCorrect ? '#22C55E' : '#962F45' }}
              >
                {gap.userWasCorrect
                  ? <Check className="w-4 h-4 text-white stroke-[3]" />
                  : <X className="w-4 h-4 text-white stroke-[3]" />
                }
              </div>
              <div
                className="w-full aspect-[4/3] rounded-xl px-3 flex items-center justify-center text-center text-base font-semibold bg-gray-100 text-gray-900 border-2"
                style={{ borderColor: '#1D841D' }}
              >
                {gap.answer}
              </div>
            </div>

            <ResultBar correctCount={gap.correctCount} incorrectCount={gap.incorrectCount} userWasCorrect={gap.userWasCorrect} />
          </div>
        ))}
      </div>
    </div>
  )
}
