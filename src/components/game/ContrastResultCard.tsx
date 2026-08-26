'use client'

import Image from 'next/image'
import { Check, X } from 'lucide-react'

/** One gap's worth of result data — what this player picked for it, the class-wide
 * correct/incorrect tally for that gap, and whether they got this specific gap right.
 *
 * The answer key is not in here: the sentence above the card already reads correctly once the
 * round is revealed, so repeating it underneath left the player without the one thing the card
 * is for — seeing what they themselves chose. */
type GapResult = {
  /** Null when the round closed before this player picked anything. */
  answer: string | null
  correctCount: number
  incorrectCount: number
  /** The character standing for the option they picked. Null alongside a null answer. */
  icon: string | null
  userWasCorrect: boolean
}

/** Background fill for the non-selected side, and the highlighted (bordered, rounded) pill
 * for whichever side this user actually landed on.
 *
 * A verdict icon sits outside the bar, on the same side as the user's own result: a tick to the
 * left when they got it right, a cross to the right when they did not. The bar itself shrinks to
 * make room, so the icon never covers the counts. */
export function ResultBar({ correctCount, incorrectCount, userWasCorrect, showVerdict = false }: {
  correctCount: number
  incorrectCount: number
  userWasCorrect: boolean
  /** Off by default: the Escribiendo results panel already spells the verdict out above the bar
   *  with its stem/ending/person checks, so a second icon there would just repeat it. */
  showVerdict?: boolean
}) {
  const total = correctCount + incorrectCount
  const correctPct = total > 0 ? (correctCount / total) * 100 : 0

  const highlight = userWasCorrect
    ? { side: 'left' as const, width: correctPct, color: '#1D841D', bg: 'bg-green-200', text: 'text-green-900', count: correctCount }
    : { side: 'right' as const, width: 100 - correctPct, color: '#DC2626', bg: 'bg-red-100', text: 'text-red-900', count: incorrectCount }
  const flat = userWasCorrect
    ? { bg: 'bg-red-100', text: 'text-green-900', count: incorrectCount }
    : { bg: 'bg-green-200', text: 'text-red-900', count: correctCount }

  const verdict = (
    <div
      className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center"
      style={{ backgroundColor: userWasCorrect ? '#22C55E' : '#962F45' }}
    >
      {userWasCorrect
        ? <Check className="w-3 h-3 text-white stroke-[3.5]" />
        : <X className="w-3 h-3 text-white stroke-[3.5]" />
      }
    </div>
  )

  return (
    <div className="w-full flex items-center gap-1.5">
      {showVerdict && userWasCorrect && verdict}

      <div className="relative flex-1 h-6 rounded-full overflow-hidden">
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

      {showVerdict && !userWasCorrect && verdict}
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
      {/* Black, not a verdict colour: the boxes below already carry green/red per gap, and a card
          holding two gaps can be right on one and wrong on the other. */}
      <p className="text-[10px] font-black tracking-widest uppercase mb-4 text-gray-900">
        Your Answer
      </p>
      <div className={gaps.length === 2 ? 'grid grid-cols-2 gap-4' : ''}>
        {gaps.map((gap, i) => (
          <div key={i} className="flex flex-col items-center gap-5 rounded-2xl pt-5 pb-3 px-3">
            {/* Icon floats directly over the answer box's top border — no backing circle. */}
            <div className="relative w-full max-w-[8.75rem] flex flex-col items-center">
              {gap.icon && (
                <div className="absolute -top-4 z-10 w-8 h-8">
                  <Image src={gap.icon} alt="" width={32} height={32} className="w-full h-full object-contain" />
                </div>
              )}
              <div
                className="w-full aspect-[4/3] rounded-xl px-3 flex items-center justify-center text-center text-base font-semibold border-2"
                style={{
                  borderColor: gap.userWasCorrect ? '#22C55E' : '#EF4444',
                  backgroundColor: gap.userWasCorrect ? '#F0FDF4' : '#FEF2F2',
                  color: gap.userWasCorrect ? '#16A34A' : '#DC2626',
                }}
              >
                {gap.answer ?? 'No answer'}
              </div>
            </div>

            <ResultBar
              correctCount={gap.correctCount}
              incorrectCount={gap.incorrectCount}
              userWasCorrect={gap.userWasCorrect}
              showVerdict
            />
          </div>
        ))}
      </div>
    </div>
  )
}
