'use client'

import { use, useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { X, ChevronRight, Check, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ContrastGap from '@/components/game/ContrastGap'
import { CONTRAST_ICON, GAP_COLORS, phraseGapCount, type ContrastPhrase } from '@/lib/contrast-game-logic'

// ─── Keyboard-aware bottom offset ────────────────────────────────────────────
// On iOS Safari, `fixed bottom-0` is anchored to the layout viewport (full page height),
// so the virtual keyboard slides over it. We use visualViewport to track the real
// visible bottom and shift the button up to stay above the keyboard.

function useKeyboardBottom() {
  const [bottom, setBottom] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      const gap = window.innerHeight - (vv.height + vv.offsetTop)
      setBottom(Math.max(0, gap))
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])
  return bottom
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Standing = {
  user_id: string
  username: string
  avatar: string
  total_points: number
  delta: number
  rank: number
}

type RoundResults = {
  is_contraste: boolean
  correct_answer?: string
  my_answer?: string | null
  correct_1?: 1 | 2
  correct_2?: 1 | 2 | null
  my_selected_1?: 1 | 2 | null
  my_selected_2?: 1 | 2 | null
  my_validation_status: string
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
type MyAnswer =
  | { kind: 'text'; value: string }
  | { kind: 'contrast'; selected1: 1 | 2 | null; selected2: 1 | 2 | null }

const EMPTY_TEXT_ANSWER: MyAnswer = { kind: 'text', value: '' }

type Round = {
  id: string
  room_id: string
  round_number: number
  status: 'pending' | 'active' | 'collecting' | 'results' | 'scoreboard' | 'done'
  started_at: string | null
  duration_seconds: number
  phrase_id: string | null
  contrast_phrase_id: string | null
  phrases: { id: string; verb: string; sentence: string } | null
  contrast_phrases: ContrastPhrase | null
}

type GamePhase =
  | { type: 'loading' }
  | { type: 'active'; round: Round; secondsLeft: number }
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

// ─── Validation status → checkmarks ──────────────────────────────────────────

function validationToChecks(status: string): { stem: boolean; ending: boolean; person: boolean } {
  switch (status) {
    case 'correct':      return { stem: true,  ending: true,  person: true }
    case 'wrong_person': return { stem: true,  ending: true,  person: false }
    case 'wrong_ending': return { stem: true,  ending: false, person: false }
    case 'wrong_stem':   return { stem: false, ending: true,  person: true }
    default:             return { stem: false, ending: false, person: false }
  }
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
      <div className="flex flex-col items-center gap-[2px]">
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

type RoundPhase =
  | { type: 'active'; round: Round; secondsLeft: number }
  | { type: 'collecting'; round: Round; myAnswer: MyAnswer; answeredCount: number; totalCount: number }
  | { type: 'results'; round: Round; myAnswer: MyAnswer; results: RoundResults }

/** Bottom action bar shared by both round types: Submit (active) / Skip (host, collecting) / Next (host, results). */
function RoundActionBar({
  phase, isHost, canSubmit, onSubmit, onSkip, onNext, kbBottom,
}: {
  phase: RoundPhase
  isHost: boolean
  canSubmit: boolean
  onSubmit: () => void
  onSkip: () => void
  onNext: () => void
  kbBottom: number
}) {
  const [skipping, setSkipping] = useState(false)
  const [nexting, setNexting] = useState(false)

  const hasButton =
    phase.type === 'active' ||
    (isHost && (phase.type === 'collecting' || phase.type === 'results'))

  return (
    <motion.div
      className="fixed left-0 right-0 px-5 pb-6 pt-3 transition-[bottom] duration-100"
      style={{ bottom: kbBottom }}
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
  )
}

/** Position/points footer shared by both results cards. */
function ResultsFooter({ results }: { results: RoundResults }) {
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
    </>
  )
}

function TextRoundView({
  phase, isHost, onAnswer, onTimerEnd, onSkip, onNext,
}: {
  phase: RoundPhase
  isHost: boolean
  onAnswer: (ans: MyAnswer) => void
  onTimerEnd: () => void
  onSkip: () => void
  onNext: () => void
}) {
  const [typedInput, setTypedInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const timerEndedRef = useRef(false)
  const kbBottom = useKeyboardBottom()

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

  useEffect(() => {
    if (phase.type === 'active' && phase.secondsLeft <= 0 && !timerEndedRef.current) {
      timerEndedRef.current = true
      onTimerEnd()
    }
  }, [phase, onTimerEnd])

  const handleSubmit = () => {
    if (phase.type !== 'active' || !typedInput.trim()) return
    inputRef.current?.blur()
    onAnswer({ kind: 'text', value: typedInput.trim() })
  }

  const checks = phase.type === 'results' ? validationToChecks(phase.results.my_validation_status) : null
  const correctRatio = phase.type === 'results' && phase.results.total_count > 0
    ? phase.results.correct_count / phase.results.total_count
    : 0

  if (!round.phrases) return null

  return (
    <div className="flex-1 flex flex-col">
      {/* Sentence + input — always at top, never remounts across phases */}
      <div className="flex flex-col items-center pt-10 pb-6">
        <PhraseSentence
          sentence={round.phrases.sentence}
          verb={round.phrases.verb}
          value={displayValue}
          editable={phase.type === 'active'}
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
              <div className="bg-white rounded-2xl p-4 border-2 border-green-200">
                <p className="text-[10px] font-black tracking-widest uppercase text-green-600 mb-3">
                  Correct Answer
                </p>
                <div className="flex items-start gap-4">
                  <div
                    className="flex-1 rounded-xl py-3 px-4 text-center text-lg font-black border-2"
                    style={{ borderColor: '#22C55E', color: '#16A34A', backgroundColor: '#F0FDF4' }}
                  >
                    {phase.results.correct_answer}
                  </div>
                  {checks && (
                    <div className="flex flex-col gap-1.5 text-xs font-semibold shrink-0">
                      <div className="flex items-center gap-1.5">
                        {checks.ending
                          ? <Check className="w-3.5 h-3.5 text-green-500 stroke-[3]" />
                          : <X className="w-3.5 h-3.5 text-red-400 stroke-[3]" />}
                        <span className="text-gray-600">Tense ending</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {checks.person
                          ? <Check className="w-3.5 h-3.5 text-green-500 stroke-[3]" />
                          : <X className="w-3.5 h-3.5 text-red-400 stroke-[3]" />}
                        <span className="text-gray-600">Person/Number</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {checks.stem
                          ? <Check className="w-3.5 h-3.5 text-green-500 stroke-[3]" />
                          : <X className="w-3.5 h-3.5 text-red-400 stroke-[3]" />}
                        <span className="text-gray-600">Stem</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bar chart */}
                <div className="mt-4 flex gap-1 h-6 rounded-lg overflow-hidden">
                  {correctRatio > 0 && (
                    <div
                      className="bg-green-400 rounded-l-lg transition-all duration-700"
                      style={{ width: `${correctRatio * 100}%` }}
                    />
                  )}
                  {correctRatio < 1 && (
                    <div className="bg-red-300 rounded-r-lg flex-1 transition-all duration-700" />
                  )}
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-gray-400 font-medium">
                  <span>{phase.results.correct_count} correct</span>
                  <span>{phase.results.total_count - phase.results.correct_count} incorrect</span>
                </div>
              </div>

              <ResultsFooter results={phase.results} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <RoundActionBar
        phase={phase}
        isHost={isHost}
        canSubmit={!!typedInput.trim()}
        onSubmit={handleSubmit}
        onSkip={onSkip}
        onNext={onNext}
        kbBottom={kbBottom}
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
  phase, isHost, onAnswer, onTimerEnd, onSkip, onNext,
}: {
  phase: RoundPhase
  isHost: boolean
  onAnswer: (ans: MyAnswer) => void
  onTimerEnd: () => void
  onSkip: () => void
  onNext: () => void
}) {
  const [selected1, setSelected1] = useState<1 | 2 | null>(null)
  const [selected2, setSelected2] = useState<1 | 2 | null>(null)
  const timerEndedRef = useRef(false)
  const kbBottom = useKeyboardBottom()

  const round = phase.round
  const phrase = round.contrast_phrases
  const hasSubmitted = phase.type === 'collecting' || phase.type === 'results'
  const myAnswer = hasSubmitted && phase.myAnswer.kind === 'contrast' ? phase.myAnswer : null

  const displaySelected1 = myAnswer ? myAnswer.selected1 : selected1
  const displaySelected2 = myAnswer ? myAnswer.selected2 : selected2

  useEffect(() => {
    if (phase.type === 'active' && phase.secondsLeft <= 0 && !timerEndedRef.current) {
      timerEndedRef.current = true
      onTimerEnd()
    }
  }, [phase, onTimerEnd])

  if (!phrase) return null

  const gapCount = phraseGapCount(phrase)
  const icons = CONTRAST_ICON[phrase.battle_id]
  const canSubmit = selected1 !== null && (gapCount === 1 || selected2 !== null)

  const handleSubmit = () => {
    if (phase.type !== 'active' || !canSubmit) return
    onAnswer({ kind: 'contrast', selected1, selected2: gapCount === 2 ? selected2 : null })
  }

  const submitted = phase.type === 'results'
  const correctRatio = phase.type === 'results' && phase.results.total_count > 0
    ? phase.results.correct_count / phase.results.total_count
    : 0

  const sentenceParts = splitContrastSentence(phrase.sentence, gapCount)

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex flex-col items-center pt-10 pb-6 px-5 gap-2">
        <div className="flex flex-col gap-3 text-center text-base text-gray-800 leading-relaxed">
          <div>
            <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase mb-1">{phrase.infinitive_1}</p>
            <p className="[text-wrap:balance]">
              {sentenceParts[0]}
              <span
                className="inline-flex min-w-[70px] min-h-[36px] mx-1 px-3 items-center justify-center rounded-lg border-2 align-middle text-center font-bold text-gray-900 whitespace-nowrap"
                style={{ borderColor: GAP_COLORS[1].border }}
              >
                {displaySelected1 === 1 ? phrase.option_a_1 : displaySelected1 === 2 ? phrase.option_b_1 : null}
              </span>
              {sentenceParts[1]}
            </p>
          </div>
          {gapCount === 2 && phrase.option_a_2 && phrase.option_b_2 && (
            <div>
              <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase mb-1">{phrase.infinitive_2}</p>
              <p className="[text-wrap:balance]">
                <span
                  className="inline-flex min-w-[70px] min-h-[36px] mx-1 px-3 items-center justify-center rounded-lg border-2 align-middle text-center font-bold text-gray-900 whitespace-nowrap"
                  style={{ borderColor: GAP_COLORS[2].border }}
                >
                  {displaySelected2 === 1 ? phrase.option_a_2 : displaySelected2 === 2 ? phrase.option_b_2 : null}
                </span>
                {sentenceParts[2]}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-36">
        {phase.type === 'active' && (
          <div className={gapCount === 2 ? 'grid grid-cols-2 gap-4' : ''}>
            <ContrastGap
              optionA={phrase.option_a_1}
              optionB={phrase.option_b_1}
              correctOption={phrase.correct_1}
              selected={selected1}
              submitted={false}
              showHints={false}
              iconA={icons.a}
              iconB={icons.b}
              bgColor={GAP_COLORS[1].bg}
              onSelect={setSelected1}
            />
            {gapCount === 2 && phrase.option_a_2 && phrase.option_b_2 && phrase.correct_2 && (
              <ContrastGap
                optionA={phrase.option_a_2}
                optionB={phrase.option_b_2}
                correctOption={phrase.correct_2}
                selected={selected2}
                submitted={false}
                showHints={false}
                iconA={icons.a}
                iconB={icons.b}
                bgColor={GAP_COLORS[2].bg}
                onSelect={setSelected2}
              />
            )}
          </div>
        )}

        <AnimatePresence mode="wait">
          {phase.type === 'collecting' && (
            <motion.div
              key="cat"
              className="flex flex-col items-center justify-center gap-4 pt-8"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24, delay: 0.05 } }}
              exit={{ opacity: 0, y: -12, transition: { duration: 0.2 } }}
            >
              <motion.div animate={{ y: [0, -14, 0] }} transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}>
                <Image src="/images/escribiendo/mimo.png" width={160} height={160} alt="" draggable={false} />
              </motion.div>
              <div className="text-center">
                <p className="text-base font-bold text-gray-800">Collecting answers...</p>
                <p className="text-sm text-gray-400 mt-1 font-medium">{phase.answeredCount}/{phase.totalCount}</p>
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
              <div className={gapCount === 2 ? 'grid grid-cols-2 gap-4' : ''}>
                <ContrastGap
                  optionA={phrase.option_a_1}
                  optionB={phrase.option_b_1}
                  correctOption={phrase.correct_1}
                  selected={displaySelected1}
                  submitted={submitted}
                  showHints={false}
                  iconA={icons.a}
                  iconB={icons.b}
                  bgColor={GAP_COLORS[1].bg}
                  onSelect={() => {}}
                />
                {gapCount === 2 && phrase.option_a_2 && phrase.option_b_2 && phrase.correct_2 && (
                  <ContrastGap
                    optionA={phrase.option_a_2}
                    optionB={phrase.option_b_2}
                    correctOption={phrase.correct_2}
                    selected={displaySelected2}
                    submitted={submitted}
                    showHints={false}
                    iconA={icons.a}
                    iconB={icons.b}
                    bgColor={GAP_COLORS[2].bg}
                    onSelect={() => {}}
                  />
                )}
              </div>

              <div className="bg-white rounded-2xl p-4 border-2 border-green-200">
                <div className="flex gap-1 h-6 rounded-lg overflow-hidden">
                  {correctRatio > 0 && (
                    <div className="bg-green-400 rounded-l-lg transition-all duration-700" style={{ width: `${correctRatio * 100}%` }} />
                  )}
                  {correctRatio < 1 && <div className="bg-red-300 rounded-r-lg flex-1 transition-all duration-700" />}
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-gray-400 font-medium">
                  <span>{phase.results.correct_count} correct</span>
                  <span>{phase.results.total_count - phase.results.correct_count} incorrect</span>
                </div>
              </div>

              <ResultsFooter results={phase.results} />
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
        kbBottom={kbBottom}
      />
    </div>
  )
}

function RoundView(props: {
  phase: RoundPhase
  isHost: boolean
  onAnswer: (ans: MyAnswer) => void
  onTimerEnd: () => void
  onSkip: () => void
  onNext: () => void
}) {
  if (props.phase.round.contrast_phrase_id) {
    return <ContrastRoundView {...props} />
  }
  return <TextRoundView {...props} />
}

// ─── Scoreboard phase ─────────────────────────────────────────────────────────

function ScoreboardView({
  roundNumber, totalRounds, standings, isHost, currentUserId, onNext,
}: {
  roundNumber: number
  totalRounds: number
  standings: Standing[]
  isHost: boolean
  currentUserId: string
  onNext: () => void
}) {
  const roundsLeft = totalRounds - roundNumber
  const [nexting, setNexting] = useState(false)

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
        <p className="relative text-gray-900 text-[11px] font-semibold tracking-widest uppercase">
          Round {roundNumber} · {roundsLeft} left
        </p>
        <p className="relative text-gray-900 text-3xl font-bold tracking-tight mt-0.5">SCOREBOARD</p>
      </div>

      {/* Wave */}
      <div style={{ backgroundColor: '#FF8716' }} className="-mb-px">
        <svg viewBox="0 0 402 48" preserveAspectRatio="none" className="w-full block h-12">
          <path d="M0,0 C67,48 134,0 201,24 C268,48 335,0 402,24 L402,48 L0,48 Z" style={{ fill: '#F5F3EF' }} />
        </svg>
      </div>

      {/* Standings list */}
      <div className="flex-1 px-4 pt-3 flex flex-col overflow-y-auto" style={{ paddingBottom: isHost ? 96 : 24 }}>
        {standings.map((s, index) => {
          const isFirst = s.rank === 1
          const isMe = s.user_id === currentUserId

          return (
            <div key={s.user_id}>
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
                  <span
                    className="text-xs font-black"
                    style={{ color: isFirst ? 'white' : '#9CA3AF' }}
                  >
                    {s.rank}
                  </span>
                </div>

                {/* Avatar */}
                <Image
                  src={s.avatar}
                  alt={s.username}
                  width={42}
                  height={42}
                  className="rounded-full object-contain shrink-0"
                />

                {/* Username */}
                <span className="flex-1 font-bold text-[15px] text-gray-900 truncate">
                  {s.username}
                  {isMe && <span className="text-gray-400 font-normal text-xs ml-1">(tú)</span>}
                </span>

                {/* Delta + total points */}
                <div className="flex items-center gap-2 shrink-0">
                  {s.delta > 0 && (
                    <span className="text-[11px] font-black text-blue-600 flex items-center gap-0.5">
                      ▲ {s.delta}
                    </span>
                  )}
                  <span
                    className="font-black text-base"
                    style={{ color: isFirst ? '#FF8716' : '#1F2937' }}
                  >
                    {s.total_points}
                  </span>
                </div>
              </div>

              {/* Divider — between non-first rows */}
              {!isFirst && index < standings.length - 1 && standings[index + 1]?.rank !== 1 && (
                <div className="h-px bg-gray-100 mx-3" />
              )}
            </div>
          )
        })}
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
              <>Next question <ChevronRight className="w-4 h-4 stroke-[3]" /></>
            )}
          </motion.button>
        </div>
      )}
    </div>
  )
}

// ─── Final scoreboard ─────────────────────────────────────────────────────────

function FinishedView({
  standings, isHost, onFinish,
}: {
  standings: Standing[]
  isHost: boolean
  onFinish: () => void
}) {
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 1200)
    return () => clearTimeout(t)
  }, [])

  const top3 = standings.slice(0, 3)
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean)

  const BAR_HEIGHTS = [160, 210, 120]
  const BAR_COLORS = ['#6366F1', '#FF8716', '#EC4899']

  return (
    <div className="flex-1 flex flex-col">
      <div
        className="relative px-5 pt-5 pb-8 overflow-hidden"
        style={{ backgroundColor: '#FF8716' }}
      >
        <Image
          src="/images/multiplayer/bg-star.png"
          alt="" width={180} height={180}
          className="absolute -top-4 -right-4 opacity-20 pointer-events-none select-none"
          draggable={false}
        />
        <p className="relative text-white/80 text-[10px] font-black tracking-widest uppercase">Final</p>
        <p className="relative text-white text-2xl font-black tracking-tight">SCOREBOARD</p>
      </div>

      <div style={{ backgroundColor: '#FF8716' }} className="-mb-px">
        <svg viewBox="0 0 402 36" preserveAspectRatio="none" className="w-full block h-9">
          <path d="M0,0 C67,36 134,0 201,18 C268,36 335,0 402,18 L402,36 L0,36 Z" fill="white" />
        </svg>
      </div>

      <div className="flex-1 bg-white flex flex-col items-center justify-center px-5 pb-6 overflow-hidden relative">
        <AnimatePresence>
          {revealed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: 'backOut' }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div
                className="w-80 h-80 opacity-10"
                style={{
                  background: 'conic-gradient(from 0deg, #FF8716 0deg 10deg, transparent 10deg 30deg, #FF8716 30deg 40deg, transparent 40deg 60deg, #FF8716 60deg 70deg, transparent 70deg 90deg, #FF8716 90deg 100deg, transparent 100deg 120deg, #FF8716 120deg 130deg, transparent 130deg 150deg, #FF8716 150deg 160deg, transparent 160deg 180deg, #FF8716 180deg 190deg, transparent 190deg 210deg, #FF8716 210deg 220deg, transparent 220deg 240deg, #FF8716 240deg 250deg, transparent 250deg 270deg, #FF8716 270deg 280deg, transparent 280deg 300deg, #FF8716 300deg 310deg, transparent 310deg 330deg, #FF8716 330deg 340deg, transparent 340deg 360deg)',
                  borderRadius: '50%',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {revealed && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative flex items-end justify-center gap-3 mb-6 z-10"
            >
              {podium.map((s, i) => {
                if (!s) return <div key={i} className="w-20" />
                const isFirst = s.rank === 1
                return (
                  <div key={s.user_id} className="flex flex-col items-center gap-1">
                    <Image
                      src={s.avatar}
                      alt={s.username}
                      width={isFirst ? 52 : 40}
                      height={isFirst ? 52 : 40}
                      className="rounded-full object-contain"
                    />
                    <span className="text-[10px] font-black text-gray-700 text-center max-w-[70px] truncate">
                      {s.username}
                    </span>
                    <span className="text-[9px] text-gray-400 font-medium">{s.total_points}pt</span>
                    <div
                      className="w-20 rounded-t-xl flex items-end justify-center pb-2"
                      style={{ height: BAR_HEIGHTS[i], backgroundColor: BAR_COLORS[i] }}
                    >
                      <span className="text-white font-black text-xl">{s.rank}</span>
                    </div>
                  </div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {!revealed && (
          <div className="flex gap-4">
            {[1, 2].map(n => (
              <motion.div
                key={n}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: n * 0.3 }}
                className="w-32 h-32 rounded-full bg-gray-100"
              />
            ))}
          </div>
        )}
      </div>

      {isHost && revealed && (
        <div className="px-5 pb-6 pt-3 bg-white border-t border-gray-100">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onFinish}
            className="w-full py-4 rounded-2xl font-black text-white text-sm tracking-widest uppercase"
            style={{ backgroundColor: '#FF8716' }}
          >
            Finish battle
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
  const playerCountRef = useRef(0)
  const myAnswerRef = useRef<MyAnswer>(EMPTY_TEXT_ANSWER)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentRoundIdRef = useRef<string | null>(null)

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

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
        contrast_phrases(id, battle_id, sentence, infinitive_1, option_a_1, option_b_1, correct_1, infinitive_2, option_a_2, option_b_2, correct_2)
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

  const applyRound = useCallback(async (round: Round) => {
    currentRoundIdRef.current = round.id

    if (round.status === 'active') {
      myAnswerRef.current = EMPTY_TEXT_ANSWER
      startTimer(round)
      setPhase({ type: 'active', round, secondsLeft: round.duration_seconds })
    } else if (round.status === 'collecting') {
      // Timer keeps running so it stays visible during collecting phase
      const supabase = createClient()
      const { count: answered } = await supabase
        .from('round_answers')
        .select('*', { count: 'exact', head: true })
        .eq('round_id', round.id)

      setPhase(prev => {
        if (prev.type === 'collecting') return { ...prev, answeredCount: answered ?? prev.answeredCount }
        return {
          type: 'collecting',
          round,
          myAnswer: myAnswerRef.current,
          answeredCount: answered ?? 0,
          totalCount: playerCountRef.current,
        }
      })
    } else if (round.status === 'results') {
      stopTimer()
      const results = await fetchResults(round.id)
      if (results) {
        setPhase({ type: 'results', round, myAnswer: myAnswerRef.current, results })
      }
    } else if (round.status === 'scoreboard') {
      stopTimer()
      const results = await fetchResults(round.id)
      if (results) {
        setPhase({
          type: 'scoreboard',
          roundNumber: round.round_number,
          totalRounds,
          standings: results.standings,
        })
      }
    }
  }, [startTimer, stopTimer, fetchResults, totalRounds])

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
      setTotalRounds(room.total_rounds)
      setIsHost(room.host_id === user.id)

      const { count: pCount } = await supabase
        .from('room_players')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id)
      playerCountRef.current = pCount ?? 0

      if (room.status === 'finished') {
        const results = await fetchResults(currentRoundIdRef.current ?? '')
        setPhase({ type: 'finished', standings: results?.standings ?? [] })
        return
      }

      const round = await fetchCurrentRound(room.id)
      if (round) {
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
                contrast_phrases(id, battle_id, sentence, infinitive_1, option_a_1, option_b_1, correct_1, infinitive_2, option_a_2, option_b_2, correct_2)
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
            const { data: lastRound } = await supabase
              .from('rounds')
              .select('id')
              .eq('room_id', room.id)
              .eq('status', 'done')
              .order('round_number', { ascending: false })
              .limit(1)
              .single()

            const results = lastRound ? await fetchResults(lastRound.id) : null
            setPhase({ type: 'finished', standings: results?.standings ?? [] })
          }
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'round_answers',
        }, async () => {
          const roundId = currentRoundIdRef.current
          if (!roundId) return
          // Re-fetch ground truth count to avoid double-counting the local optimistic update
          const { count } = await supabase
            .from('round_answers')
            .select('*', { count: 'exact', head: true })
            .eq('round_id', roundId)
          setPhase(prev => {
            if (prev.type !== 'collecting') return prev
            return { ...prev, answeredCount: count ?? prev.answeredCount }
          })
        })
        .subscribe()

      channelRef.current = channel
    }

    init()

    return () => {
      stopTimer()
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [code]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnswer = useCallback(async (ans: MyAnswer) => {
    const roundId = currentRoundIdRef.current
    if (!roundId) return

    myAnswerRef.current = ans

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

    fetch(`/api/rounds/${roundId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }, [])

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
    await fetch(`/api/rooms/${code}/finish`, { method: 'POST' })
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
      {/* Header */}
      {showGameHeader && (
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.back()}>
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
              isHost={isHost}
              onAnswer={handleAnswer}
              onTimerEnd={handleTimerEnd}
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
              onNext={handleNextRound}
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
              onFinish={handleFinish}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
