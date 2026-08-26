'use client'

import { use, useState, useEffect, useRef, useCallback, type CSSProperties } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { X, ChevronRight, Check, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ContrastGap from '@/components/game/ContrastGap'
import ContrastResultCard, { ResultBar } from '@/components/game/ContrastResultCard'
import StreakBadge from '@/components/game/StreakBadge'
import { CONTRAST_ICON, GAP_COLORS, gapVerbOnly, phraseGapCount, type ContrastPhrasePublic } from '@/lib/contrast-game-logic'
import type { StatusRow } from '@/lib/game-logic'
import { getLevelInfo, catImagePath } from '@/lib/levels'
import { resolveAvatarPath } from '@/lib/avatars'
import { useKeyboardOffset, keyboardLiftStyle } from '@/hooks/use-keyboard-offset'

// ─── Keyboard-aware bottom offset ────────────────────────────────────────────
// `fixed bottom-0` anchors to the layout viewport, so the virtual keyboard slides
// over it. useKeyboardOffset tracks the visual viewport frame-by-frame so the bar
// rides the keyboard's own animation curve instead of chasing it with a transition.

// ─── Types ────────────────────────────────────────────────────────────────────

type Standing = {
  user_id: string
  username: string
  avatar: string
  total_points: number
  delta: number
  streak: number
  rank: number
  /** Places gained since the previous round: positive climbed, negative dropped, 0 held. */
  rank_change: number
}

// TEMP: exported for the /dev-scoreboard preview route — revert to unexported when that route is deleted.
export type RoundResults = {
  is_contraste: boolean
  correct_answer?: string
  my_answer?: string | null
  correct_1?: 1 | 2
  correct_2?: 1 | 2 | null
  my_selected_1?: 1 | 2 | null
  my_selected_2?: 1 | 2 | null
  my_validation_status: string
  /** Per-dimension breakdown of a wrong answer, computed server-side from the phrase's own
   *  type so each tense reports the checks that actually apply to it. Null when correct. */
  status_rows?: StatusRow[] | null
  my_points: number
  is_correct: boolean
  correct_count: number
  total_count: number
  my_rank: number
  total_players: number
  points_behind: number
  player_ahead_name: string | null
  standings: Standing[]
  round_number: number
}

/** The two answer shapes a round can take: free-text (escribiendo) or gap selections (contraste). */
export type MyAnswer =
  | { kind: 'text'; value: string }
  | { kind: 'contrast'; selected1: 1 | 2 | null; selected2: 1 | 2 | null }

const EMPTY_TEXT_ANSWER: MyAnswer = { kind: 'text', value: '' }

/** Narrows a stored gap selection — the column is a plain integer — to the two options a gap has. */
function toGapChoice(value: number | null): 1 | 2 | null {
  return value === 1 || value === 2 ? value : null
}

/** Stand-in results used only when /api/rounds/[id]/results could not be read, so the round can
 *  still leave the collecting screen. The reconcile poll refetches and replaces it. Rendering
 *  guards on `correct_answer`/`correct_1` being absent, so no answer key is invented here. */
const PLACEHOLDER_RESULTS: RoundResults = {
  is_contraste: false,
  my_validation_status: 'no_answer',
  my_points: 0,
  is_correct: false,
  correct_count: 0,
  total_count: 0,
  my_rank: 1,
  total_players: 1,
  points_behind: 0,
  player_ahead_name: null,
  standings: [],
  round_number: 0,
}

// TEMP: exported for the /dev-scoreboard preview route — revert to unexported when that route is deleted.
export type Round = {
  id: string
  room_id: string
  round_number: number
  status: 'pending' | 'active' | 'collecting' | 'results' | 'scoreboard' | 'done'
  started_at: string | null
  duration_seconds: number
  phrase_id: string | null
  contrast_phrase_id: string | null
  phrases: { id: string; verb: string; sentence: string } | null
  // Public shape on purpose: this row is fetched straight from Postgres by the browser, so it
  // must never carry the answer key while the round is live. The correct options arrive with
  // the round results instead (see RoundResults.correct_1 / correct_2).
  contrast_phrases: ContrastPhrasePublic | null
}

/** What each player broadcasts about themselves on the game's Presence channel. Presence is the
 *  only way the others learn who left: DELETE events arrive stripped to the primary key. */
type PlayPresence = {
  user_id: string
  username: string
  avatar: string
}

type GamePhase =
  | { type: 'loading' }
  | { type: 'active'; round: Round }
  | { type: 'collecting'; round: Round; myAnswer: MyAnswer; answeredCount: number; totalCount: number }
  | { type: 'results'; round: Round; myAnswer: MyAnswer; results: RoundResults }
  | { type: 'scoreboard'; roundNumber: number; totalRounds: number; standings: Standing[] }
  | { type: 'finished'; standings: Standing[] }

// ─── Countdown circle ─────────────────────────────────────────────────────────

function CountdownCircle({ seconds, total }: { seconds: number; total: number }) {
  const r = 24
  const circumference = 2 * Math.PI * r
  const progress = Math.max(0, seconds / total)
  const dash = circumference * progress
  const isRed = seconds <= 10

  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <svg width="56" height="56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#E5E7EB" strokeWidth="4" />
        <circle
          cx="28" cy="28" r={r}
          fill="none"
          stroke={isRed ? '#EF4444' : '#3B82F6'}
          strokeWidth="4"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s linear, stroke 0.3s' }}
        />
      </svg>
      <span
        className="absolute text-base font-black tabular-nums"
        style={{ color: isRed ? '#EF4444' : '#1F2937' }}
      >
        {Math.ceil(seconds)}
      </span>
    </div>
  )
}

// ─── Shared sentence display ──────────────────────────────────────────────────

function PhraseSentence({
  sentence, verb, value, editable,
  verbColor, inputBorderColor, inputBg, inputTextColor,
  onChange, onKeyDown, inputRef,
}: {
  sentence: string
  verb: string
  value: string
  editable: boolean
  verbColor: string
  inputBorderColor: string
  inputBg: string
  inputTextColor: string
  onChange?: (v: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  inputRef?: React.RefObject<HTMLInputElement | null>
}) {
  const [before, after] = sentence.split('___')
  const beforeWords = (before ?? '').trim().split(/\s+/).filter(Boolean)
  const afterWords = (after ?? '').trim().split(/\s+/).filter(Boolean)
  const boxWidth = Math.max(80, Math.max(value.length, 8) * 10 + 36)

  return (
    <div className="flex flex-wrap items-end justify-center gap-x-2 gap-y-3 px-4">
      {beforeWords.map((w, i) => (
        <span key={`b${i}`} className="text-gray-700 font-medium text-sm">{w}</span>
      ))}
      {/* gap-[5px]: matches the singleplayer sentence — a 2px gap left the label touching the box. */}
      <div className="flex flex-col items-center gap-[5px]">
        <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: verbColor }}>
          {verb}
        </span>
        <input
          ref={inputRef}
          autoFocus={editable}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={!editable}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-form-type="other"
          inputMode="text"
          className="border-2 rounded-xl px-3 py-1.5 text-center font-medium outline-none transition-all duration-300"
          style={{
            minWidth: 80,
            width: boxWidth,
            borderColor: inputBorderColor,
            backgroundColor: inputBg,
            color: inputTextColor,
            fontSize: '16px',
          }}
        />
      </div>
      {afterWords.map((w, i) => (
        <span key={`a${i}`} className="text-gray-700 font-medium text-sm">{w}</span>
      ))}
    </div>
  )
}

// ─── Unified round view (active → collecting → results, no unmount) ───────────

// TEMP: exported for the /dev-scoreboard preview route — revert to unexported when that route is deleted.
export type RoundPhase =
  | { type: 'active'; round: Round }
  | { type: 'collecting'; round: Round; myAnswer: MyAnswer; answeredCount: number; totalCount: number }
  | { type: 'results'; round: Round; myAnswer: MyAnswer; results: RoundResults }

/** Bottom action bar shared by both round types: Submit (active) / Skip (host, collecting) / Next (host, results). */
function RoundActionBar({
  phase, isHost, canSubmit, onSubmit, onSkip, onNext, kbLift,
}: {
  phase: RoundPhase
  isHost: boolean
  canSubmit: boolean
  onSubmit: () => void
  onSkip: () => void
  onNext: () => void
  kbLift: CSSProperties
}) {
  const [skipping, setSkipping] = useState(false)
  const [nexting, setNexting] = useState(false)

  const hasButton =
    phase.type === 'active' ||
    (isHost && (phase.type === 'collecting' || phase.type === 'results'))

  return (
    // Outer div owns the keyboard lift (plain transform, no Motion involvement so
    // nothing competes for `transform`); inner Motion div only fades the backdrop.
    <div className="fixed bottom-0 left-0 right-0" style={kbLift}>
    <motion.div
      className="px-5 pb-6 pt-3"
      animate={{ backgroundColor: hasButton ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0)' }}
      transition={{ duration: 0.25 }}
    >
      <AnimatePresence mode="wait">
        {phase.type === 'active' && (
          <motion.button
            key="submit"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 340, damping: 26 } }}
            exit={{ opacity: 0, y: 6, transition: { duration: 0.18 } }}
            whileTap={canSubmit ? { scale: 0.96 } : {}}
            onClick={onSubmit}
            disabled={!canSubmit}
            className="w-full py-4 rounded-2xl font-black text-white text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-colors duration-200"
            style={{ backgroundColor: canSubmit ? '#3B82F6' : '#D1D5DB' }}
          >
            <Send className="w-4 h-4 stroke-[2.5]" />
            Submit
          </motion.button>
        )}

        {phase.type === 'collecting' && isHost && (
          <motion.button
            key="skip"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 340, damping: 26 } }}
            exit={{ opacity: 0, y: 6, transition: { duration: 0.18 } }}
            whileTap={skipping ? {} : { scale: 0.96 }}
            onClick={() => {
              if (skipping) return
              setSkipping(true)
              onSkip()
            }}
            disabled={skipping}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-gray-300 text-sm font-bold text-gray-700 disabled:opacity-60"
          >
            {skipping ? 'Skipping...' : 'Skip to next question'}
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </motion.button>
        )}

        {phase.type === 'results' && isHost && (
          <motion.button
            key="next"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 340, damping: 26 } }}
            exit={{ opacity: 0, y: 6, transition: { duration: 0.18 } }}
            whileTap={nexting ? {} : { scale: 0.97 }}
            onClick={() => {
              if (nexting) return
              setNexting(true)
              onNext()
            }}
            disabled={nexting}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm text-white tracking-wider uppercase disabled:opacity-60"
            style={{ backgroundColor: '#3B82F6' }}
          >
            {nexting ? 'Loading...' : 'Next'}
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
    </div>
  )
}

/** Position/points/streak footer shared by both results cards. */
function ResultsFooter({ results, myStreak }: { results: RoundResults; myStreak: number }) {
  return (
    <>
      <div className="text-center text-sm text-gray-600 font-medium px-2">
        {results.my_rank === 1
          ? 'You are in the lead!'
          : `You are in ${ordinal(results.my_rank)} place, ${results.points_behind} points behind ${results.player_ahead_name}`}
      </div>
      {results.my_points > 0 && (
        <div className="flex justify-center">
          <div className="bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-sm font-bold">
            +{results.my_points} pts
          </div>
        </div>
      )}
      {myStreak >= 2 && <StreakBadge streak={myStreak} />}
    </>
  )
}

function TextRoundView({
  phase, secondsLeft, isHost, myStreak, onAnswer, onSkip, onNext,
}: {
  phase: RoundPhase
  secondsLeft: number
  isHost: boolean
  myStreak: number
  onAnswer: (ans: MyAnswer) => void
  onSkip: () => void
  onNext: () => void
}) {
  const [typedInput, setTypedInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const autoSubmittedRef = useRef(false)
  const { offset: kbOffset, settling: kbSettling } = useKeyboardOffset()
  const kbLift = keyboardLiftStyle(kbOffset, kbSettling)

  const round = phase.round
  const hasSubmitted = phase.type === 'collecting' || phase.type === 'results'
  const displayValue = hasSubmitted && phase.myAnswer.kind === 'text' ? phase.myAnswer.value : typedInput

  // Input colors — blue during active+collecting, red/green at results
  let verbColor = '#3B82F6'
  let inputBorderColor = '#3B82F6'
  let inputBg = '#FFFFFF'
  let inputTextColor = '#3B82F6'

  if (phase.type === 'results') {
    const correct = phase.results.my_validation_status === 'correct'
    verbColor = correct ? '#22C55E' : '#EF4444'
    inputBorderColor = correct ? '#22C55E' : '#EF4444'
    inputBg = correct ? '#F0FDF4' : '#FEF2F2'
    inputTextColor = correct ? '#16A34A' : '#DC2626'
  }

  // Time's up: lock in whatever was typed so far — the answer isn't lost just because Submit wasn't tapped.
  useEffect(() => {
    if (phase.type === 'active' && secondsLeft <= 0 && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true
      if (typedInput.trim()) {
        onAnswer({ kind: 'text', value: typedInput.trim() })
      }
    }
  }, [phase, secondsLeft, onAnswer, typedInput])

  const handleSubmit = () => {
    if (phase.type !== 'active' || secondsLeft <= 0 || !typedInput.trim()) return
    inputRef.current?.blur()
    onAnswer({ kind: 'text', value: typedInput.trim() })
  }

  const statusRows = phase.type === 'results' ? (phase.results.status_rows ?? null) : null

  if (!round.phrases) return null

  return (
    <div className="flex-1 flex flex-col">
      {/* Sentence + input — always at top, never remounts across phases */}
      <div className="flex flex-col items-center pt-10 pb-6">
        <PhraseSentence
          sentence={round.phrases.sentence}
          verb={round.phrases.verb}
          value={displayValue}
          editable={phase.type === 'active' && secondsLeft > 0}
          verbColor={verbColor}
          inputBorderColor={inputBorderColor}
          inputBg={inputBg}
          inputTextColor={inputTextColor}
          onChange={v => setTypedInput(v)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          inputRef={inputRef}
        />
      </div>

      {/* Content below — animates in/out without touching the sentence above */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {phase.type === 'collecting' && (
            <motion.div
              key="cat"
              className="flex flex-col items-center justify-center gap-4 pt-8 pb-36"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24, delay: 0.05 } }}
              exit={{ opacity: 0, y: -12, transition: { duration: 0.2 } }}
            >
              <motion.div
                animate={{ y: [0, -14, 0] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Image src="/images/escribiendo/mimo.png" width={160} height={160} alt="" draggable={false} />
              </motion.div>
              <div className="text-center">
                <p className="text-base font-bold text-gray-800">Collecting answers...</p>
                <p className="text-sm text-gray-400 mt-1 font-medium">
                  {phase.answeredCount}/{phase.totalCount}
                </p>
                {/* Same warning the contraste round already carries: the host needs to know that
                    skipping closes the question for everyone, not just for themselves. */}
                {isHost && (
                  <p className="text-xs text-gray-400 mt-3 max-w-[260px] mx-auto leading-snug">
                    All players will move on to the next question now, even if not everyone has answered yet.
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {phase.type === 'results' && (
            <motion.div
              key="results-card"
              className="flex flex-col px-5 pb-36 pt-2 gap-4"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              {/* Correct answer card */}
              <div className="bg-white rounded-2xl p-4 border-2 border-gray-200">
                <p className="text-[10px] font-black tracking-widest uppercase mb-3" style={{ color: '#1D841D' }}>
                  Correct Answer
                </p>
                <div className="flex items-start gap-4">
                  <div
                    className="flex-1 rounded-xl py-3 px-4 text-center text-base font-semibold bg-gray-100 text-gray-900 border-2"
                    style={{ borderColor: '#1D841D' }}
                  >
                    {phase.results.correct_answer}
                  </div>
                  {statusRows && statusRows.length > 0 && (
                    <div className="flex flex-col gap-1.5 text-xs font-semibold shrink-0">
                      {statusRows.map(row => (
                        <div key={row.label} className="flex items-center gap-1.5">
                          {row.ok
                            ? <Check className="w-3.5 h-3.5 text-green-500 stroke-[3]" />
                            : <X className="w-3.5 h-3.5 text-red-400 stroke-[3]" />}
                          <span className="text-gray-600">{row.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <ResultBar
                    correctCount={phase.results.correct_count}
                    incorrectCount={phase.results.total_count - phase.results.correct_count}
                    userWasCorrect={phase.results.is_correct}
                  />
                </div>
              </div>

              <ResultsFooter results={phase.results} myStreak={myStreak} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <RoundActionBar
        phase={phase}
        isHost={isHost}
        canSubmit={!!typedInput.trim() && secondsLeft > 0}
        onSubmit={handleSubmit}
        onSkip={onSkip}
        onNext={onNext}
        kbLift={kbLift}
      />
    </div>
  )
}

/** Splits a contrast sentence on its blank(s) (___), returning text segments around each gap. */
function splitContrastSentence(sentence: string, gapCount: 1 | 2): string[] {
  const parts = sentence.split('___')
  while (parts.length < gapCount + 1) parts.push('')
  return parts
}

function ContrastRoundView({
  phase, secondsLeft, isHost, myStreak, onAnswer, onSkip, onNext,
}: {
  phase: RoundPhase
  secondsLeft: number
  isHost: boolean
  myStreak: number
  onAnswer: (ans: MyAnswer) => void
  onSkip: () => void
  onNext: () => void
}) {
  const [selected1, setSelected1] = useState<1 | 2 | null>(null)
  const [selected2, setSelected2] = useState<1 | 2 | null>(null)
  const autoSubmittedRef = useRef(false)
  const { offset: kbOffset, settling: kbSettling } = useKeyboardOffset()
  const kbLift = keyboardLiftStyle(kbOffset, kbSettling)

  const round = phase.round
  const phrase = round.contrast_phrases
  const hasSubmitted = phase.type === 'collecting' || phase.type === 'results'
  const myAnswer = hasSubmitted && phase.myAnswer.kind === 'contrast' ? phase.myAnswer : null

  const displaySelected1 = myAnswer ? myAnswer.selected1 : selected1
  const displaySelected2 = myAnswer ? myAnswer.selected2 : selected2

  // Time's up: lock in whichever gaps were already picked — a half-finished answer isn't lost.
  useEffect(() => {
    if (phase.type === 'active' && secondsLeft <= 0 && !autoSubmittedRef.current && phrase) {
      const needsGap2 = phraseGapCount(phrase) === 2
      if (selected1 !== null && (!needsGap2 || selected2 !== null)) {
        autoSubmittedRef.current = true
        onAnswer({ kind: 'contrast', selected1, selected2: needsGap2 ? selected2 : null })
      }
    }
  }, [phase, secondsLeft, onAnswer, phrase, selected1, selected2])

  if (!phrase) return null

  const gapCount = phraseGapCount(phrase)
  const icons = CONTRAST_ICON[phrase.battle_id]
  const timedOut = secondsLeft <= 0
  const canSubmit = selected1 !== null && (gapCount === 1 || selected2 !== null) && !timedOut

  // The answer key only exists client-side once the round is over, and it arrives with the
  // results payload rather than with the phrase itself. GET /api/rounds/[id]/results always
  // includes correct_1 for a contrast round, so a missing value means the results fetch
  // failed — in that case the result card is skipped rather than guessing an answer.
  const correct1 = phase.type === 'results' ? phase.results.correct_1 ?? null : null
  const correct2 = phase.type === 'results' ? phase.results.correct_2 ?? null : null

  const handleSubmit = () => {
    if (phase.type !== 'active' || !canSubmit) return
    onAnswer({ kind: 'contrast', selected1, selected2: gapCount === 2 ? selected2 : null })
  }

  const sentenceParts = splitContrastSentence(phrase.sentence, gapCount)

  // Once the round is revealed the blanks show the correct word on a white box with a green
  // outline, whatever the player picked — the sentence they are left reading should be the right
  // one. Which option they chose is still marked on the cards below.
  const revealed = phase.type === 'results' && correct1 !== null
  // Neutral outline, not green: the sentence is showing the right answer either way, so colouring
  // it as a verdict would read as "you got this right" to someone who did not.
  const revealStyle = { borderColor: '#111827', backgroundColor: '#FFFFFF', color: '#111827' }
  const gapWord1 = revealed
    ? (correct1 === 1 ? phrase.option_a_1 : phrase.option_b_1)
    : displaySelected1 === 1 ? phrase.option_a_1 : displaySelected1 === 2 ? phrase.option_b_1 : null
  const gapWord2 = revealed && correct2 !== null
    ? (correct2 === 1 ? phrase.option_a_2 : phrase.option_b_2)
    : displaySelected2 === 1 ? phrase.option_a_2 : displaySelected2 === 2 ? phrase.option_b_2 : null

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex flex-col items-center pt-10 pb-6 px-5 gap-2">
        {/* leading-[2.6]: the verb label above each blank is absolutely positioned and takes up no
            line height, so a tighter leading lets it print over the line above when the sentence
            wraps. */}
        <div className="flex flex-col gap-3 text-center text-base text-gray-800 leading-[2.6]">
          <p className="[text-wrap:balance]">
            {sentenceParts[0]}
            <span className="relative inline-block align-middle mx-1">
              <span className="absolute left-1/2 -top-[19px] -translate-x-1/2 text-[10px] font-black tracking-widest text-gray-400 uppercase whitespace-nowrap">
                {gapVerbOnly(phrase.infinitive_1)}
              </span>
              <span
                className="inline-flex min-w-[70px] min-h-[36px] px-3 items-center justify-center rounded-lg border-2 text-center font-bold whitespace-nowrap"
                style={revealed ? revealStyle : { borderColor: GAP_COLORS[1].border, color: '#111827' }}
              >
                {gapWord1}
              </span>
            </span>
            {sentenceParts[1]}
          </p>
          {gapCount === 2 && phrase.option_a_2 && phrase.option_b_2 && (
            <p className="[text-wrap:balance]">
              <span className="relative inline-block align-middle mx-1">
                <span className="absolute left-1/2 -top-[19px] -translate-x-1/2 text-[10px] font-black tracking-widest text-gray-400 uppercase whitespace-nowrap">
                  {gapVerbOnly(phrase.infinitive_2 ?? '')}
                </span>
                <span
                  className="inline-flex min-w-[70px] min-h-[36px] px-3 items-center justify-center rounded-lg border-2 text-center font-bold whitespace-nowrap"
                  style={revealed && correct2 !== null ? revealStyle : { borderColor: GAP_COLORS[2].border, color: '#111827' }}
                >
                  {gapWord2}
                </span>
              </span>
              {sentenceParts[2]}
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-36">
        {phase.type === 'active' && (
          <div className={gapCount === 2 ? 'grid grid-cols-2 gap-4' : ''}>
            <ContrastGap
              optionA={phrase.option_a_1}
              optionB={phrase.option_b_1}
              // Round is live: the answer key is not on the client at all.
              correctOption={null}
              selected={selected1}
              submitted={false}
              showHints={false}
              iconA={icons.a}
              iconB={icons.b}
              bgColor={gapCount === 2 ? GAP_COLORS[1].bg : 'transparent'}
              onSelect={timedOut ? () => {} : setSelected1}
            />
            {gapCount === 2 && phrase.option_a_2 && phrase.option_b_2 && (
              <ContrastGap
                optionA={phrase.option_a_2}
                optionB={phrase.option_b_2}
                correctOption={null}
                selected={selected2}
                submitted={false}
                showHints={false}
                iconA={icons.a}
                iconB={icons.b}
                bgColor={GAP_COLORS[2].bg}
                onSelect={timedOut ? () => {} : setSelected2}
              />
            )}
          </div>
        )}

        <AnimatePresence mode="wait">
          {phase.type === 'collecting' && (
            <motion.div
              key="cat"
              className="flex flex-col items-center justify-center gap-3 pt-4"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24, delay: 0.05 } }}
              exit={{ opacity: 0, y: -12, transition: { duration: 0.2 } }}
            >
              <motion.div animate={{ y: [0, -14, 0] }} transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}>
                <Image src="/images/escribiendo/mimo.png" width={110} height={110} alt="" draggable={false} />
              </motion.div>
              <div className="text-center">
                <p className="text-base font-bold text-gray-800">Collecting answers...</p>
                <p className="text-sm text-gray-400 mt-1 font-medium">{phase.answeredCount}/{phase.totalCount}</p>
                {isHost && (
                  <p className="text-xs text-gray-400 mt-3 max-w-[260px] mx-auto leading-snug">
                    All players will move on to the next question now, even if not everyone has answered yet.
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {phase.type === 'results' && (
            <motion.div
              key="results-card"
              className="flex flex-col pt-2 gap-4"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <ContrastResultCard
                gap1={correct1 ? {
                  answer: correct1 === 1 ? phrase.option_a_1 : phrase.option_b_1,
                  // Per-gap class tallies aren't tracked server-side yet — falls back to the round's
                  // overall correct/incorrect count until RoundResults exposes a per-gap breakdown.
                  correctCount: phase.results.correct_count,
                  incorrectCount: phase.results.total_count - phase.results.correct_count,
                  icon: icons.a,
                  userWasCorrect: displaySelected1 === correct1,
                } : null}
                gap2={gapCount === 2 && correct2 && phrase.option_a_2 && phrase.option_b_2 ? {
                  answer: correct2 === 1 ? phrase.option_a_2 : phrase.option_b_2,
                  correctCount: phase.results.correct_count,
                  incorrectCount: phase.results.total_count - phase.results.correct_count,
                  icon: icons.b,
                  userWasCorrect: displaySelected2 === correct2,
                } : null}
              />

              <ResultsFooter results={phase.results} myStreak={myStreak} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <RoundActionBar
        phase={phase}
        isHost={isHost}
        canSubmit={canSubmit}
        onSubmit={handleSubmit}
        onSkip={onSkip}
        onNext={onNext}
        kbLift={kbLift}
      />
    </div>
  )
}

// TEMP: exported for the /dev-scoreboard preview route — revert to unexported when that route is deleted.
export function RoundView(props: {
  phase: RoundPhase
  secondsLeft: number
  isHost: boolean
  myStreak: number
  onAnswer: (ans: MyAnswer) => void
  onSkip: () => void
  onNext: () => void
}) {
  if (props.phase.round.contrast_phrase_id) {
    return <ContrastRoundView {...props} />
  }
  return <TextRoundView {...props} />
}

// ─── Scoreboard phase ─────────────────────────────────────────────────────────

/** Leave-the-game confirmation — copy and mascot differ for host (ends it for everyone) vs. player. */
function LeaveConfirmModal({
  open, isHost, leaving, onStay, onLeave,
}: {
  open: boolean
  isHost: boolean
  leaving: boolean
  onStay: () => void
  onLeave: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50" onClick={onStay} />
          <motion.div
            className="relative w-full max-w-[300px] bg-white rounded-3xl overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            <div className="flex flex-col items-center gap-3 px-6 pt-7 pb-6 text-center">
              {isHost && (
                <p className="text-sm text-gray-500">Tss host,</p>
              )}
              <Image
                src="/images/multiplayer/catleave.png"
                alt=""
                width={130}
                height={140}
                className="object-contain"
              />
              <p className="text-sm text-gray-700 leading-relaxed">
                You&apos;re about to leave the game.
                {isHost && <> If you do, the game will <strong className="font-bold">end for everyone</strong>.</>}
              </p>
              <p className="text-sm text-gray-700">Are you sure?</p>
            </div>
            <div className="flex">
              <button
                onClick={onStay}
                className="flex-1 py-4 font-bold text-sm text-white"
                style={{ backgroundColor: '#1E2875' }}
              >
                Stay
              </button>
              <button
                onClick={onLeave}
                disabled={leaving}
                className="flex-1 py-4 font-bold text-sm text-white disabled:opacity-60"
                style={{ backgroundColor: '#4A5BB5' }}
              >
                {leaving ? '...' : 'Leave'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** How many players the scoreboard lists before cutting off. */
const SCOREBOARD_VISIBLE_COUNT = 5

/** One row of the scoreboard. Shared so the pinned "your position" row below the top-5 cut is
 *  rendered by the same code as the rows above it, rather than a copy that can drift. */
function StandingRow({ standing: s, isMe }: { standing: Standing; isMe: boolean }) {
  const isFirst = s.rank === 1

  return (
    <div
      className="flex items-center gap-3 px-3 py-3 rounded-2xl"
      style={{
        backgroundColor: isFirst ? '#FFF0DC' : 'transparent',
        border: isFirst ? '1.5px solid #FFD599' : '1.5px solid transparent',
      }}
    >
      {/* Rank pill */}
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: isFirst ? '#FF8716' : '#E5E7EB' }}
      >
        <span className="text-xs font-black" style={{ color: isFirst ? 'white' : '#9CA3AF' }}>
          {s.rank}
        </span>
      </div>

      {/* Avatar */}
      <div className="relative w-[42px] h-[42px] shrink-0">
        <Image src={s.avatar} alt={s.username} fill sizes="42px" className="object-contain p-0.5" />
      </div>

      {/* Username + streak */}
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <span className="font-bold text-[15px] text-gray-900 truncate">
          {s.username}
          {isMe && <span className="text-gray-400 font-normal text-xs ml-1">(tú)</span>}
        </span>
        {s.streak >= 2 && (
          <span className="flex items-center gap-0.5 bg-orange-50 rounded-full px-1.5 py-0.5 shrink-0">
            <Image src="/images/home/fxemoji_fire.svg" alt="Racha" width={12} height={12} />
            <span className="text-[11px] font-black text-orange-500">{s.streak}</span>
          </span>
        )}
      </div>

      {/* Movement indicator + total points. Keyed on places gained, not points scored — every
          correct answer used to show an up arrow, even when the player was falling down the table.
          Only climbs are marked: dropping is visible from the position itself, and calling it out
          in front of the class is discouraging without adding information. */}
      <div className="flex items-center gap-2 shrink-0">
        {s.rank_change > 0 && <span className="text-blue-600 text-xs font-black">▲</span>}
        <span className="font-black text-base" style={{ color: isFirst ? '#FF8716' : '#1F2937' }}>
          {s.total_points}
        </span>
      </div>
    </div>
  )
}

function ScoreboardView({
  roundNumber, totalRounds, standings, isHost, currentUserId, leaving, onNext, onLeave,
}: {
  roundNumber: number
  totalRounds: number
  standings: Standing[]
  isHost: boolean
  currentUserId: string
  leaving: boolean
  onNext: () => void
  /** Shared with the rest of the game so leaving always goes through one code path. */
  onLeave: () => void
}) {
  const roundsLeft = totalRounds - roundNumber
  const [nexting, setNexting] = useState(false)
  const [confirmingLeave, setConfirmingLeave] = useState(false)

  const visibleStandings = standings.slice(0, SCOREBOARD_VISIBLE_COUNT)
  const ownStandingBelowCut =
    standings.find(s => s.user_id === currentUserId && s.rank > SCOREBOARD_VISIBLE_COUNT) ?? null

  return (
    <div className="flex-1 flex flex-col" style={{ backgroundColor: '#F5F3EF' }}>
      {/* Orange header — tall, dark text */}
      <div
        className="relative px-5 pt-12 pb-24 overflow-hidden"
        style={{ backgroundColor: '#FF8716' }}
      >
        <Image
          src="/images/multiplayer/bg-star.png"
          alt="" width={280} height={280}
          className="absolute -top-8 -right-8 opacity-25 pointer-events-none select-none"
          draggable={false}
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setConfirmingLeave(true)}
          className="absolute top-5 right-5 z-10 w-8 h-8 rounded-full bg-black/10 flex items-center justify-center"
        >
          <X className="w-4 h-4 text-gray-900 stroke-[3]" />
        </motion.button>
        <p className="relative text-gray-900 text-[11px] font-semibold tracking-widest uppercase">
          Round {roundNumber} · {roundsLeft} left
        </p>
        <p className="relative text-gray-900 text-3xl font-bold tracking-tight mt-0.5">SCOREBOARD</p>
      </div>

      <LeaveConfirmModal
        open={confirmingLeave}
        isHost={isHost}
        leaving={leaving}
        onStay={() => setConfirmingLeave(false)}
        onLeave={onLeave}
      />

      {/* Wave */}
      <div style={{ backgroundColor: '#FF8716' }} className="-mb-px">
        <svg viewBox="0 0 402 48" preserveAspectRatio="none" className="w-full block h-12">
          <path d="M0,0 C67,48 134,0 201,24 C268,48 335,0 402,24 L402,48 L0,48 Z" style={{ fill: '#F5F3EF' }} />
        </svg>
      </div>

      {/* Standings list */}
      <div className="flex-1 px-4 pt-3 flex flex-col overflow-y-auto" style={{ paddingBottom: isHost ? 96 : 24 }}>
        {visibleStandings.map((s, index) => (
          <div key={s.user_id}>
            <StandingRow standing={s} isMe={s.user_id === currentUserId} />

            {/* Divider — between non-first rows */}
            {s.rank !== 1 && index < visibleStandings.length - 1 && visibleStandings[index + 1]?.rank !== 1 && (
              <div className="h-px bg-gray-100 mx-3" />
            )}
          </div>
        ))}

        {/* Players outside the top 5 still need to see where they stand, so their own row is
            pinned below the cut with its real rank. */}
        {ownStandingBelowCut && (
          <>
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[10px] font-bold text-gray-400 tracking-widest">···</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <StandingRow standing={ownStandingBelowCut} isMe />
          </>
        )}
      </div>

      {isHost && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3" style={{ backgroundColor: '#F5F3EF' }}>
          <motion.button
            whileTap={nexting ? {} : { scale: 0.97 }}
            onClick={async () => {
              if (nexting) return
              setNexting(true)
              onNext()
            }}
            disabled={nexting}
            className="w-full py-4 rounded-2xl font-black text-white text-sm tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: '#FF8716' }}
          >
            {nexting ? 'Loading...' : (
              // After the last round the next screen is the podium, not another question.
              <>{roundsLeft <= 0 ? 'Show final board' : 'Next question'} <ChevronRight className="w-4 h-4 stroke-[3]" /></>
            )}
          </motion.button>
        </div>
      )}
    </div>
  )
}

// ─── Final scoreboard ─────────────────────────────────────────────────────────

// TEMP: exported for the /dev-scoreboard preview route — revert to unexported when that route is deleted.
export function FinishedView({
  standings, isHost, currentUserId, onFinish, onLeave,
}: {
  standings: Standing[]
  isHost: boolean
  currentUserId: string
  onFinish: () => void
  /** Non-hosts bailing out from the final scoreboard. Removes the room_players row rather than
   *  just navigating away, so the room does not keep counting players who already left. */
  onLeave: () => void
}) {
  const [revealed, setRevealed] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const router = useRouter()

  // Mirrors the server formula in /api/rooms/[code]/finish — Battle XP = round(points / 30) + 10.
  const myPoints = standings.find(s => s.user_id === currentUserId)?.total_points ?? 0
  const myXp = Math.round(myPoints / 30) + 10

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 1200)
    return () => clearTimeout(t)
  }, [])

  const top3 = standings.slice(0, 3)
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean)

  const BAR_HEIGHTS = [210, 280, 150]
  const BAR_GRADIENTS = [
    'linear-gradient(180deg, #818CF8 0%, #4F46E5 100%)',
    'linear-gradient(180deg, #FFA94D 0%, #E8720C 100%)',
    'linear-gradient(180deg, #F472B6 0%, #DB2777 100%)',
  ]

  // Thin, evenly-spaced sunburst rays — a fixed angular width reads as a wide
  // wedge near the horizontal axis, so each ray is only ~1.2deg with 24 rays
  // spread evenly around the circle instead of hand-picked 10deg blocks.
  const SUNBURST_RAY_COUNT = 16
  const SUNBURST_RAY_WIDTH_DEG = 5
  const sunburstGradient = `conic-gradient(from 0deg, ${Array.from({ length: SUNBURST_RAY_COUNT }, (_, i) => {
    const start = (360 / SUNBURST_RAY_COUNT) * i
    const end = start + SUNBURST_RAY_WIDTH_DEG
    return `#FFC08A ${start}deg ${end}deg, transparent ${end}deg ${start + 360 / SUNBURST_RAY_COUNT}deg`
  }).join(', ')})`

  return (
    <div className="h-dvh flex flex-col relative overflow-hidden" style={{ backgroundColor: '#FDF0E2' }}>
      {/* Sunburst — bursts out from behind the podium on reveal, spilling past the screen edges.
          Sits at z-0, below the header (z-10, solid orange) — the header's own wave/star art
          covers it up top, the rays only show in the cream body beneath the wave curve. */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.3, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.7, ease: 'backOut' }}
            className="absolute left-1/2 top-[38dvh] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0"
            style={{ width: '220vw', height: '220vw' }}
          >
            <div
              className="w-full h-full opacity-60"
              style={{ background: sunburstGradient, borderRadius: '50%' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* pb-24 rather than pb-40: the orange band was eating enough height to push the podium and
          the CTA down the screen, leaving the bars cramped against the bottom edge. */}
      <div className="relative z-10 isolate px-5 pt-8 pb-24 overflow-hidden shrink-0" style={{ backgroundColor: '#FF8716' }}>
        <Image
          src="/images/multiplayer/bg-star.png"
          alt="" width={180} height={180}
          className="absolute -top-2 right-2 opacity-25 pointer-events-none select-none"
          draggable={false}
        />
        {/* Non-hosts can't trigger finish (that also finalizes XP/stats, host-only) — this X is a quicker way out than the CTA below. */}
        {!isHost && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onLeave}
            className="absolute top-5 right-5 z-10 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white stroke-[3]" />
          </motion.button>
        )}
        <p className="relative text-white/80 text-[10px] font-black tracking-widest uppercase">Final</p>
        <p className="relative text-white text-2xl font-black tracking-tight">SCOREBOARD</p>
      </div>

      {/* ── Wave — the curve itself is header-orange (continues the header's fill), the area below it is transparent so the cream sunburst shows through ── */}
      <div className="relative z-10 -mt-px shrink-0">
        <svg viewBox="0 0 402 36" preserveAspectRatio="none" className="w-full block h-9">
          <path d="M0,0 C67,36 134,0 201,18 C268,36 335,0 402,18 L402,0 Z" fill="#FF8716" />
        </svg>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-end px-5 pb-2 min-h-0">
        {!revealed && (
          <div className="flex-1 flex items-center justify-center gap-4">
            {[1, 2].map(n => (
              <motion.div
                key={n}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: n * 0.3 }}
                className="w-32 h-32 rounded-full bg-white/20"
              />
            ))}
          </div>
        )}

        <AnimatePresence>
          {revealed && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative z-10 flex items-end justify-center gap-3 w-full"
            >
              {podium.map((s, i) => {
                if (!s) return <div key={i} className="w-24" />
                const isFirst = s.rank === 1
                const avatarSize = isFirst ? 56 : 44
                return (
                  <div key={s.user_id} className="flex flex-col items-center gap-1 flex-1 max-w-[120px]">
                    <div
                      className="relative shrink-0 rounded-full bg-white shadow-md overflow-hidden"
                      style={{ width: avatarSize, height: avatarSize }}
                    >
                      <Image
                        src={s.avatar}
                        alt={s.username}
                        fill
                        sizes={`${avatarSize}px`}
                        className="object-contain p-1"
                      />
                    </div>
                    <span className="text-xs font-black text-black text-center max-w-full truncate">
                      {s.username}
                    </span>
                    <span className="text-[10px] text-black/70 font-medium">{s.total_points}pt</span>
                    <div
                      className="w-full rounded-t-2xl flex items-end justify-center pb-3 shadow-md"
                      style={{ height: BAR_HEIGHTS[i], background: BAR_GRADIENTS[i] }}
                    >
                      <span className="text-white/40 font-black text-3xl">{s.rank}</span>
                    </div>
                  </div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {revealed && (
        <div className="relative z-10 shrink-0 px-5 pb-6 pt-3">
          <motion.button
            whileTap={finishing ? {} : { scale: 0.97 }}
            onClick={() => {
              if (finishing) return
              if (isHost) {
                setFinishing(true)
                onFinish()
              } else {
                router.push('/')
              }
            }}
            disabled={finishing}
            className="w-full py-4 rounded-2xl font-black text-white text-sm tracking-widest uppercase disabled:opacity-60"
            style={{ backgroundColor: '#FF8716' }}
          >
            {finishing ? 'Finishing...' : `Get ${myXp} XP`}
          </motion.button>
        </div>
      )}
    </div>
  )
}

// ─── Ordinal helper ───────────────────────────────────────────────────────────

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const router = useRouter()

  const [phase, setPhase] = useState<GamePhase>({ type: 'loading' })
  const [isHost, setIsHost] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [totalRounds, setTotalRounds] = useState(8)
  const [secondsLeft, setSecondsLeft] = useState(30)
  const [leftPlayerToast, setLeftPlayerToast] = useState<{ username: string; avatar: string } | null>(null)
  const [myStreak, setMyStreak] = useState(0)
  const [confirmingLeave, setConfirmingLeave] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const streakRoundIdRef = useRef<string | null>(null)
  const playerCountRef = useRef(0)
  const myAnswerRef = useRef<MyAnswer>(EMPTY_TEXT_ANSWER)
  /**
   * The round this player has already submitted an answer for.
   *
   * `rounds.status` is per round, not per player: it stays 'active' until the last answer lands
   * (or the host advances), so nothing in the row says "this player is done". Without this flag,
   * every re-read of a still-active round — the reconcile poll, a Realtime event, a retry — put
   * an already-answered player back into the question.
   */
  const answeredRoundIdRef = useRef<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const presenceChannelRef = useRef<any>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentRoundIdRef = useRef<string | null>(null)
  const timedOutRoundIdRef = useRef<string | null>(null)
  const currentRoundNumberRef = useRef(0)
  const hostIdRef = useRef<string | null>(null)
  const roomIdRef = useRef<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * Leave the room for real.
   *
   * The header X used to call router.back() and the final scoreboard's X router.push('/'),
   * so a player vanished from the screen while their room_players row stayed behind. No DELETE
   * meant no Realtime event, which is why nobody ever saw the "X has left" toast or the
   * host-ended modal: the trigger simply never fired.
   */
  const leaveRoom = useCallback(async () => {
    if (leaving) return
    setLeaving(true)
    await fetch(`/api/rooms/${code}/leave`, { method: 'POST' }).catch(() => {})
    router.push('/')
  }, [code, leaving, router])

  const showPlayerLeftToast = useCallback((username: string, avatar: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setLeftPlayerToast({ username, avatar })
    toastTimerRef.current = setTimeout(() => setLeftPlayerToast(null), 3500)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // In-memory streak of consecutive correct rounds — resets on page reload, no server tracking yet.
  useEffect(() => {
    if (phase.type !== 'results') return
    if (streakRoundIdRef.current === phase.round.id) return
    streakRoundIdRef.current = phase.round.id
    setMyStreak(prev => (phase.results.is_correct ? prev + 1 : 0))
  }, [phase])

  const startTimer = useCallback((round: Round) => {
    stopTimer()
    const startedAt = round.started_at ? new Date(round.started_at).getTime() : Date.now()
    const duration = round.duration_seconds

    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000
      const left = Math.max(0, duration - elapsed)
      setSecondsLeft(left)
    }

    tick()
    timerRef.current = setInterval(tick, 250)
  }, [stopTimer])

  const fetchCurrentRound = useCallback(async (rId: string): Promise<Round | null> => {
    const supabase = createClient()
    const { data } = await supabase
      .from('rounds')
      .select(`
        id, room_id, round_number, status, started_at, duration_seconds, phrase_id, contrast_phrase_id,
        phrases(id, verb, sentence),
        contrast_phrases(id, battle_id, sentence, infinitive_1, option_a_1, option_b_1, infinitive_2, option_a_2, option_b_2)
      `)
      .eq('room_id', rId)
      .not('status', 'in', '(pending,done)')
      .order('round_number', { ascending: false })
      .limit(1)
      .single()

    return data as unknown as Round | null
  }, [])

  const fetchResults = useCallback(async (roundId: string): Promise<RoundResults | null> => {
    const res = await fetch(`/api/rounds/${roundId}/results`)
    if (!res.ok) return null
    return res.json()
  }, [])

  /**
   * How many players have answered, straight from the server.
   *
   * `round_answers` is no longer readable row-by-row from the browser while a round is live
   * (migration 0026) — another player's submitted answer is itself a hint — so the counter
   * comes from an endpoint that returns totals only.
   */
  const fetchAnswerCount = useCallback(
    async (roundId: string): Promise<{ answered: number; total: number } | null> => {
      const res = await fetch(`/api/rounds/${roundId}/answer-count`)
      if (!res.ok) return null
      const json = await res.json()
      return { answered: json.answered_count ?? 0, total: json.total_count ?? 0 }
    },
    [],
  )

  const applyRound = useCallback(async (round: Round) => {
    currentRoundIdRef.current = round.id
    currentRoundNumberRef.current = round.round_number

    if (round.status === 'active') {
      startTimer(round)

      // An 'active' round the player has already answered means everyone else is still typing —
      // they belong on the collecting screen, not back in the question. Rebuilding the phase here
      // used to wipe `myAnswerRef`, which is why the submitted word also vanished from the
      // results card once the round finally closed.
      if (answeredRoundIdRef.current === round.id) {
        const counts = await fetchAnswerCount(round.id)
        setPhase(prev => {
          if (prev.type === 'collecting' && prev.round.id === round.id) {
            return counts ? { ...prev, answeredCount: counts.answered, totalCount: counts.total } : prev
          }
          return {
            type: 'collecting',
            round,
            myAnswer: myAnswerRef.current,
            answeredCount: counts?.answered ?? 1,
            totalCount: counts?.total ?? playerCountRef.current,
          }
        })
        return
      }

      myAnswerRef.current = EMPTY_TEXT_ANSWER
      setPhase({ type: 'active', round })
    } else if (round.status === 'collecting') {
      // Timer keeps running so it stays visible during collecting phase
      const counts = await fetchAnswerCount(round.id)

      setPhase(prev => {
        if (prev.type === 'collecting') {
          return counts ? { ...prev, answeredCount: counts.answered, totalCount: counts.total } : prev
        }
        return {
          type: 'collecting',
          round,
          myAnswer: myAnswerRef.current,
          answeredCount: counts?.answered ?? 0,
          totalCount: counts?.total ?? playerCountRef.current,
        }
      })
    } else if (round.status === 'results') {
      stopTimer()
      const results = await fetchResults(round.id)
      if (results) {
        setPhase({ type: 'results', round, myAnswer: myAnswerRef.current, results })
      } else {
        // A null here means /results refused or failed. Bailing out silently is what left players
        // staring at "Collecting answers..." for the rest of the game, so the phase still advances
        // and the reconcile poll below retries the fetch.
        setPhase({ type: 'results', round, myAnswer: myAnswerRef.current, results: PLACEHOLDER_RESULTS })
      }
    } else if (round.status === 'scoreboard') {
      stopTimer()
      const results = await fetchResults(round.id)
      setPhase({
        type: 'scoreboard',
        roundNumber: round.round_number,
        totalRounds,
        standings: results?.standings ?? [],
      })
    }
  }, [startTimer, stopTimer, fetchResults, fetchAnswerCount, totalRounds])

  useEffect(() => {
    const supabase = createClient()

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      const { data: room } = await supabase
        .from('rooms')
        .select('id, host_id, status, total_rounds')
        .eq('code', code)
        .single()

      if (!room) { router.push('/'); return }
      const amHost = room.host_id === user.id
      roomIdRef.current = room.id
      setTotalRounds(room.total_rounds)
      setIsHost(amHost)
      hostIdRef.current = room.host_id

      const { count: pCount } = await supabase
        .from('room_players')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id)
      playerCountRef.current = pCount ?? 0

      // Own profile, published to Presence below so the other players know who left.
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('username, total_xp, avatar_id')
        .eq('id', user.id)
        .single()

      if (room.status === 'finished') {
        // currentRoundIdRef is still null on a fresh load, so this fetch always failed and the
        // page rendered an empty podium. Read the last completed round instead, and if there is
        // genuinely nothing to show, go home rather than to a blank scoreboard.
        const { data: lastRound } = await supabase
          .from('rounds')
          .select('id')
          .eq('room_id', room.id)
          .in('status', ['done', 'scoreboard', 'results'])
          .order('round_number', { ascending: false })
          .limit(1)
          .maybeSingle()

        const results = lastRound ? await fetchResults(lastRound.id) : null
        if (!results || results.standings.length === 0) {
          router.push('/')
          return
        }
        setPhase({ type: 'finished', standings: results.standings })
        return
      }

      const round = await fetchCurrentRound(room.id)
      if (round) {
        // A reload mid-round loses the in-memory "already answered" flag, so it is read back from
        // the row this player is allowed to see (0026: your own answer, at any time). Without it a
        // returning player gets the question again with an empty box and their answer missing from
        // the results card.
        if (round.status === 'active') {
          const { data: mine } = await supabase
            .from('round_answers')
            .select('answer, selected_1, selected_2')
            .eq('round_id', round.id)
            .eq('user_id', user.id)
            .maybeSingle()

          if (mine) {
            answeredRoundIdRef.current = round.id
            myAnswerRef.current = round.contrast_phrase_id
              ? { kind: 'contrast', selected1: toGapChoice(mine.selected_1), selected2: toGapChoice(mine.selected_2) }
              : { kind: 'text', value: mine.answer ?? '' }
          }
        }
        await applyRound(round)
      }

      const channel = supabase
        .channel(`play:${room.id}:${Math.random()}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'rounds',
          filter: `room_id=eq.${room.id}`,
        }, async (payload) => {
          const updated = payload.new as Round
          if (['active', 'collecting', 'results', 'scoreboard'].includes(updated.status)) {
            const { data: fullRound } = await supabase
              .from('rounds')
              .select(`
                id, room_id, round_number, status, started_at, duration_seconds, phrase_id, contrast_phrase_id,
                phrases(id, verb, sentence),
                contrast_phrases(id, battle_id, sentence, infinitive_1, option_a_1, option_b_1, infinitive_2, option_a_2, option_b_2)
              `)
              .eq('id', updated.id)
              .single()

            if (fullRound) {
              await applyRound(fullRound as unknown as Round)
            }
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${room.id}`,
        }, async (payload) => {
          const updatedRoom = payload.new as { status: string; total_rounds: number }
          if (updatedRoom.status === 'finished') {
            stopTimer()
            // A finish reached before the last round means the host bailed out mid-game, not a natural finish —
            // kick the remaining players straight to home with a modal explaining why, instead of the final scoreboard.
            // Read the count off the event: `room` was captured when this player loaded the page,
            // which for anyone who waited in the lobby predates the host pressing start (that is
            // where total_rounds is actually written).
            const roundCount = updatedRoom.total_rounds ?? room.total_rounds
            // The `> 0` half of this test used to exclude the very players who most needed it:
            // anyone frozen before a round was applied still had the ref at 0, so they fell through
            // to the final-scoreboard branch and got an empty podium with a "Get XP" button. Any
            // finish before the last round is the host bailing out, whatever this client managed to
            // render.
            const endedEarly = currentRoundNumberRef.current < roundCount
            if (endedEarly && !amHost) {
              sessionStorage.setItem('bsp_host_ended_game', '1')
              router.push('/')
              return
            }
            const { data: lastRound } = await supabase
              .from('rounds')
              .select('id')
              .eq('room_id', room.id)
              .eq('status', 'done')
              .order('round_number', { ascending: false })
              .limit(1)
              .single()

            const results = lastRound ? await fetchResults(lastRound.id) : null
            // No standings means there is no podium to show and no XP legitimately earned — send
            // them home with the host-ended modal instead of a blank final scoreboard.
            if (!results || results.standings.length === 0) {
              if (!amHost) sessionStorage.setItem('bsp_host_ended_game', '1')
              router.push('/')
              return
            }
            setPhase({ type: 'finished', standings: results.standings })
          }
        })
        // No round_answers subscription: Realtime applies RLS to postgres_changes, and after
        // migration 0026 a player only sees their own answer row while the round is live, so
        // INSERTs from other players would never arrive. The collecting-phase counter is
        // polled from /answer-count instead (see the effect below).
        .subscribe()

      channelRef.current = channel

      // ── Who left, via Presence ──
      // Not postgres_changes: Realtime cannot evaluate RLS against a row that no longer exists,
      // so it trims DELETE payloads down to the primary key. Verified against this project —
      // `old` arrives as { id } only, with no user_id, even though room_players is REPLICA
      // IDENTITY FULL. Presence carries whatever the client published, so the leave event still
      // knows who it was. Same approach the lobby already uses for its player list.
      const myInfo = getLevelInfo(myProfile?.total_xp ?? 0)
      const presence = supabase.channel(`play-presence:${room.id}`, {
        config: { presence: { key: user.id } },
      })

      presence
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          for (const left of leftPresences as unknown as PlayPresence[]) {
            // Our own exit, and the host's — the host leaving already routes everyone home with
            // its own modal, so a toast on the way out would just flash past.
            if (!left.user_id || left.user_id === user.id || left.user_id === hostIdRef.current) continue

            // The round shouldn't keep waiting on an answer that's never coming.
            playerCountRef.current = Math.max(0, playerCountRef.current - 1)
            setPhase(prev => (prev.type === 'collecting' ? { ...prev, totalCount: playerCountRef.current } : prev))

            showPlayerLeftToast(left.username, left.avatar)
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presence.track({
              user_id: user.id,
              username: myProfile?.username ?? 'Alguien',
              avatar: resolveAvatarPath(myProfile?.avatar_id ?? null, catImagePath(myInfo.cat)),
            } satisfies PlayPresence)
          }
        })

      presenceChannelRef.current = presence
    }

    init()

    return () => {
      stopTimer()
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
      // Removing the channel untracks this player, which is what fires the 'leave' event on
      // everyone else's client — so closing the tab or navigating away notifies the room too,
      // not just pressing the X.
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current)
      }
    }
  }, [code]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnswer = useCallback(async (ans: MyAnswer) => {
    const roundId = currentRoundIdRef.current
    if (!roundId) return

    myAnswerRef.current = ans
    answeredRoundIdRef.current = roundId

    setPhase(prev => {
      if (prev.type !== 'active') return prev
      return {
        type: 'collecting',
        round: prev.round,
        myAnswer: ans,
        answeredCount: 1,
        totalCount: playerCountRef.current,
      }
    })
    // Keep timer running so it stays visible during collecting phase

    const body = ans.kind === 'text'
      ? { answer: ans.value }
      : { selected_1: ans.selected1, selected_2: ans.selected2 ?? undefined }

    // The response used to be dropped on the floor. A rejected submit (403 when the player is
    // missing from room_players, 409 when the round already closed) then looked identical to a
    // successful one, and the player waited on a round that had moved on without them. The
    // reconcile poll pulls the real state instead of leaving the screen wrong.
    const res = await fetch(`/api/rounds/${roundId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null)

    if (!res || !res.ok) {
      // 409 means the server already holds an answer for this player, or the round closed before
      // the request landed — either way the answer is in, so the collecting screen stays. Any
      // other failure did not record anything, so the question has to come back.
      if (res?.status !== 409) answeredRoundIdRef.current = null
      const round = await fetchCurrentRound(roomIdRef.current ?? '')
      if (round) await applyRound(round)
    }
  }, [fetchCurrentRound, applyRound])

  const handleTimerEnd = useCallback(async () => {
    if (!isHost) return
    const roundId = currentRoundIdRef.current
    if (!roundId) return
    await fetch(`/api/rounds/${roundId}/advance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: 'results' }),
    })
  }, [isHost])

  // Real time limit: once it hits 0 the host force-advances the round (active or still
  // collecting answers from other players), regardless of who has or hasn't answered yet.
  useEffect(() => {
    if (!isHost) return
    if (phase.type !== 'active' && phase.type !== 'collecting') return
    if (secondsLeft > 0) return
    if (timedOutRoundIdRef.current === phase.round.id) return
    timedOutRoundIdRef.current = phase.round.id
    handleTimerEnd()
  }, [isHost, phase, secondsLeft, handleTimerEnd])

  // "3/5 answered" while waiting on the rest of the room. Polled rather than pushed: the
  // round_answers Realtime feed only carries this player's own rows now (see 0026). Purely
  // cosmetic — the round still advances via the rounds subscription, either when the server
  // sees the last answer land or when the host's timer runs out.
  const collectingRoundId = phase.type === 'collecting' ? phase.round.id : null
  useEffect(() => {
    if (!collectingRoundId) return

    let cancelled = false
    const poll = async () => {
      const counts = await fetchAnswerCount(collectingRoundId)
      if (cancelled || !counts) return
      setPhase(prev =>
        prev.type === 'collecting'
          ? { ...prev, answeredCount: counts.answered, totalCount: counts.total }
          : prev,
      )
    }

    const interval = setInterval(poll, 2000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [collectingRoundId, fetchAnswerCount])

  /**
   * Safety net against a frozen screen.
   *
   * The whole game timeline is driven by `postgres_changes` on `rounds`. That subscription is a
   * single point of failure: a websocket that drops during the start burst, a phone that locks, a
   * backgrounded Safari tab, or one refused fetch inside `applyRound`, and the client never hears
   * about another round. Several players hit exactly this at IESE and sat on "Collecting
   * answers..." until the game ended.
   *
   * So the server state is re-read on a slow interval regardless of Realtime. When the round in
   * the database no longer matches what is on screen, the phase is rebuilt from the database — the
   * missed event stops mattering. Also catches a room that finished while this client was deaf.
   */
  const reconcileRef = useRef(false)
  // Read through a ref so the interval is created once for the whole game. Keying the effect on
  // `phase` itself would restart the 5s timer on every transition, and a client that has just
  // gone quiet is exactly the one that must not have its next check pushed back.
  const phaseRef = useRef(phase)
  useEffect(() => { phaseRef.current = phase }, [phase])

  useEffect(() => {
    const supabase = createClient()

    const reconcile = async () => {
      const phase = phaseRef.current
      if (phase.type === 'loading' || phase.type === 'finished') return
      if (reconcileRef.current) return
      reconcileRef.current = true
      try {
        const { data: room } = await supabase
          .from('rooms')
          .select('id, status, total_rounds')
          .eq('code', code)
          .single()
        if (!room) return

        if (room.status === 'finished') {
          // No `> 0` guard, same reasoning as the rooms subscription: a player frozen before any
          // round was applied is precisely who needs sending home with the explanation.
          const endedEarly = currentRoundNumberRef.current < (room.total_rounds ?? totalRounds)
          if (endedEarly && hostIdRef.current !== currentUserId) {
            stopTimer()
            sessionStorage.setItem('bsp_host_ended_game', '1')
            router.push('/')
          }
          return
        }

        const fresh = await fetchCurrentRound(room.id)
        if (!fresh) return

        // Only act when the server has genuinely moved on, so a healthy client is untouched.
        // 'collecting' is a per-player screen with no counterpart in the row — the round stays
        // 'active' until the last player answers — so a waiting player matched against
        // `status !== 'collecting'` looked stale on every single pass and was dropped back into
        // the question five seconds after answering.
        const stale =
          fresh.id !== currentRoundIdRef.current ||
          (phase.type === 'active' && fresh.status !== 'active') ||
          (phase.type === 'collecting' && fresh.status !== 'collecting' && fresh.status !== 'active') ||
          (phase.type === 'results' && fresh.status !== 'results') ||
          (phase.type === 'results' && phase.results === PLACEHOLDER_RESULTS)

        if (stale) await applyRound(fresh)
      } finally {
        reconcileRef.current = false
      }
    }

    const interval = setInterval(reconcile, 5000)
    return () => clearInterval(interval)
  }, [code, applyRound, fetchCurrentRound, stopTimer, router, totalRounds, currentUserId])

  const handleSkip = useCallback(async () => {
    const roundId = currentRoundIdRef.current
    if (!roundId) return
    await fetch(`/api/rounds/${roundId}/advance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: 'results' }),
    })
  }, [])

  const handleNextFromResults = useCallback(async () => {
    const roundId = currentRoundIdRef.current
    if (!roundId) return
    await fetch(`/api/rounds/${roundId}/advance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: 'scoreboard' }),
    })
  }, [])

  const handleNextRound = useCallback(async () => {
    const roundId = currentRoundIdRef.current
    if (!roundId) return
    await fetch(`/api/rounds/${roundId}/advance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: 'next_round' }),
    })
  }, [])

  const handleFinish = useCallback(async () => {
    const res = await fetch(`/api/rooms/${code}/finish`, { method: 'POST' })
    const json = await res.json().catch(() => null)
    if (json?.newAchievements?.length > 0 || json?.leveledUp) {
      sessionStorage.setItem('bsp_session_result', JSON.stringify({
        newAchievements: json.newAchievements ?? [],
        leveledUp: json.leveledUp ?? false,
        newLevel: json.newLevel ?? 1,
      }))
    }
    router.push('/')
  }, [code, router])

  const currentRoundNumber =
    phase.type === 'active' ? phase.round.round_number
    : phase.type === 'collecting' ? phase.round.round_number
    : phase.type === 'results' ? phase.round.round_number
    : phase.type === 'scoreboard' ? phase.roundNumber
    : 0

  const showGameHeader =
    phase.type === 'active' || phase.type === 'collecting' || phase.type === 'results'

  // Stable round ID key — RoundView remounts only on a new round, not phase transitions
  const roundKey =
    phase.type === 'active' || phase.type === 'collecting' || phase.type === 'results'
      ? phase.round.id
      : null

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Toast — a non-host player left; the round keeps going without them */}
      <AnimatePresence>
        {leftPlayerToast && (
          <motion.div
            className="fixed top-3 inset-x-4 z-40 flex justify-center"
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            <div
              className="flex items-center gap-2 pl-2 pr-3 py-2 rounded-full shadow-lg"
              style={{ backgroundColor: '#D9DFFA' }}
            >
              <div className="relative w-7 h-7 shrink-0">
                <Image
                  src={leftPlayerToast.avatar}
                  alt={leftPlayerToast.username}
                  fill
                  sizes="28px"
                  className="object-contain"
                />
              </div>
              <p className="text-[13px] text-gray-800 leading-tight">
                <span className="font-black">{leftPlayerToast.username}</span> has left the game
              </p>
              <button onClick={() => setLeftPlayerToast(null)} className="shrink-0 ml-1">
                <X className="w-3.5 h-3.5 text-gray-500 stroke-[2.5]" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Outside the phase AnimatePresence so it survives a round change mid-confirmation. */}
      <LeaveConfirmModal
        open={confirmingLeave}
        isHost={isHost}
        leaving={leaving}
        onStay={() => setConfirmingLeave(false)}
        onLeave={leaveRoom}
      />

      {/* Header */}
      {showGameHeader && (
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setConfirmingLeave(true)}>
            <X className="w-5 h-5 text-gray-400 stroke-[2.5]" />
          </motion.button>

          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${((currentRoundNumber - 1) / totalRounds) * 100}%` }}
            />
          </div>

          {(phase.type === 'active' || phase.type === 'collecting') ? (
            <CountdownCircle seconds={secondsLeft} total={phase.round.duration_seconds} />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-white text-xs font-black">{currentRoundNumber}</span>
            </div>
          )}
        </div>
      )}

      {/* Phase content */}
      <AnimatePresence mode="wait">
        {phase.type === 'loading' && (
          <motion.div
            key="loading"
            className="flex-1 flex items-center justify-center"
            exit={{ opacity: 0 }}
          >
            <div className="flex gap-4">
              {[1, 2, 3].map(n => (
                <motion.div
                  key={n}
                  animate={{ y: [0, -16, 0] }}
                  transition={{ duration: 0.45, delay: n * 0.12, repeat: Infinity }}
                >
                  <Image src={`/images/loading/small-loading${n}.png`} width={48} height={48} alt="" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* active / collecting / results — single stable wrapper, key changes only on new round */}
        {roundKey && (phase.type === 'active' || phase.type === 'collecting' || phase.type === 'results') && (
          <motion.div
            key={`round-${roundKey}`}
            className="flex-1 flex flex-col"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <RoundView
              phase={phase}
              secondsLeft={secondsLeft}
              isHost={isHost}
              myStreak={myStreak}
              onAnswer={handleAnswer}
              onSkip={handleSkip}
              onNext={handleNextFromResults}
            />
          </motion.div>
        )}

        {phase.type === 'scoreboard' && (
          <motion.div
            key={`scoreboard-${phase.roundNumber}`}
            className="flex-1 flex flex-col"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <ScoreboardView
              roundNumber={phase.roundNumber}
              totalRounds={phase.totalRounds}
              standings={phase.standings}
              isHost={isHost}
              currentUserId={currentUserId ?? ''}
              leaving={leaving}
              onNext={handleNextRound}
              onLeave={leaveRoom}
            />
          </motion.div>
        )}

        {phase.type === 'finished' && (
          <motion.div
            key="finished"
            className="flex-1 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <FinishedView
              standings={phase.standings}
              isHost={isHost}
              currentUserId={currentUserId ?? ''}
              onFinish={handleFinish}
              onLeave={leaveRoom}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
