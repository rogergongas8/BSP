'use client'

import { use, useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { X, Check, SkipForward, Lightbulb, Send } from 'lucide-react'
import { validate, TENSE_META, type Phrase, type ValidationStatus } from '@/lib/game-logic'

const SESSION_TOTAL = 10

function renderHint(hint: string) {
  return hint.split(/\*\*(.+?)\*\*/g).map((p, i) =>
    i % 2 === 1 ? <strong key={i}>{p}</strong> : <span key={i}>{p}</span>
  )
}

function DottedWord({ word }: { word: string }) {
  const [hovered, setHovered] = useState(false)
  return (
    <span
      className="text-gray-700 font-medium text-sm cursor-pointer transition-colors duration-150"
      style={{
        textDecoration: 'underline dotted',
        textDecorationColor: hovered ? '#E8922A' : '#CBD5E1',
        textUnderlineOffset: '5px',
        textDecorationThickness: '2px',
        color: hovered ? '#E8922A' : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {word}
    </span>
  )
}

const INPUT_STYLES: Record<ValidationStatus, { bg: string; border: string; color: string }> = {
  idle:         { bg: '#FFFFFF',  border: '',        color: '' },
  correct:      { bg: '#DCFCE7',  border: '#22C55E', color: '#16A34A' },
  skipped:      { bg: '#FFFFFF',  border: '#22C55E', color: '#16A34A' },
  invalid_form: { bg: '#FEE2E2',  border: '#EF4444', color: '#DC2626' },
  wrong_stem:   { bg: '#FEE2E2',  border: '#EF4444', color: '#DC2626' },
  wrong_ending: { bg: '#FFF1F2',  border: '#FECDD3', color: '#E11D48' },
  wrong_person: { bg: '#FFF1F2',  border: '#FECDD3', color: '#E11D48' },
}

function InlineSentence({
  sentence, verb, input, answer, highlight, onChange, onKeyDown, status, inputRef, color, showHint,
}: {
  sentence: string
  verb: string
  input: string
  answer: string
  highlight: string | null
  onChange: (v: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  status: ValidationStatus
  inputRef: React.RefObject<HTMLInputElement | null>
  color: string
  showHint: boolean
}) {
  const [before, after] = sentence.split('___')
  const beforeWords = before.trim().split(/\s+/).filter(Boolean)
  const afterWords = after.trim().split(/\s+/).filter(Boolean)

  const styles = INPUT_STYLES[status]
  const borderColor = status === 'idle' ? color : styles.border
  const displayValue = (status === 'correct' || status === 'skipped') ? answer : input
  const boxW = Math.max(80, Math.max(displayValue.length, answer.length) * 10 + 36)

  // Split color only shown when hint is active
  const showSplit = showHint && (status === 'wrong_person' || status === 'wrong_ending' || status === 'wrong_stem') && highlight
  const correctPrefix = showSplit ? input.slice(0, highlight!.length) : null
  const wrongSuffix   = showSplit ? input.slice(highlight!.length) : null
  // wrong_stem: stem part is wrong → reverse colors (prefix=red, suffix=theme)
  const stemIsWrong = status === 'wrong_stem'

  return (
    <div className="flex flex-wrap items-end justify-center gap-x-2 gap-y-3 px-4">
      {beforeWords.map((word, i) => <DottedWord key={`b${i}`} word={word} />)}

      <div className="flex flex-col items-center gap-[2px]">
        <span className="text-[9px] font-black tracking-widest uppercase" style={{ color }}>
          {verb}
        </span>
        <div className="relative">
          <input
            ref={inputRef}
            autoFocus
            value={displayValue}
            onChange={e => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-form-type="other"
            inputMode="text"
            className="border-2 rounded-xl px-3 py-1.5 text-center font-medium outline-none transition-all duration-200"
            style={{
              minWidth: 80,
              width: boxW,
              borderColor,
              backgroundColor: correctPrefix !== null ? '#FFFFFF' : styles.bg,
              color: correctPrefix !== null ? 'transparent'
                : status === 'idle' ? color : styles.color,
              fontSize: '16px',
            }}
          />
          {showSplit && correctPrefix !== null && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none font-medium"
              style={{ fontSize: '16px' }}
            >
              <span style={{ color: stemIsWrong ? 'rgb(239,68,68)' : color }}>{correctPrefix}</span>
              <span style={{ color: stemIsWrong ? color : 'rgb(239,68,68)' }}>{wrongSuffix}</span>
            </div>
          )}
        </div>
      </div>

      {afterWords.map((word, i) => <DottedWord key={`a${i}`} word={word} />)}
    </div>
  )
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <span className="text-xs text-gray-400">{label}</span>
      {ok
        ? <Check className="w-3.5 h-3.5 text-green-500 stroke-[3]" />
        : <X className="w-3.5 h-3.5 text-red-500 stroke-[3]" />
      }
    </div>
  )
}

export default function PracticePage({ params }: { params: Promise<{ tenseId: string }> }) {
  const { tenseId } = use(params)
  const router = useRouter()
  const meta = TENSE_META[tenseId] ?? TENSE_META['indefinido']

  const [phrase, setPhrase] = useState<Phrase | null>(null)
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<ValidationStatus>('idle')
  const [hint, setHint] = useState<string | null>(null)
  const [highlight, setHighlight] = useState<string | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [progress, setProgress] = useState(0)
  const [mistakeIndex, setMistakeIndex] = useState(0)
  const [stats, setStats] = useState({ firstTry: 0, fixed: 0, withHints: 0, skipped: 0 })
  const hadErrorRef   = useRef(false)
  const usedHintRef   = useRef(false)
  const usedIdsRef    = useRef<Set<string>>(new Set())
  const sessionStart  = useRef(Date.now())
  const inputRef      = useRef<HTMLInputElement>(null)
  const charName = meta.character.charAt(0).toUpperCase() + meta.character.slice(1)

  const prefetchRef = useRef<Phrase | null>(null)

  const prefetchNext = useCallback(async (currentIds: Set<string>) => {
    try {
      const exclude = [...currentIds].join(',')
      const url = `/api/phrases/random?tense=${encodeURIComponent(meta.tense)}${exclude ? `&exclude=${exclude}` : ''}`
      const res = await fetch(url)
      const json = await res.json()
      if (json.data) prefetchRef.current = json.data
    } catch { /* silent */ }
  }, [meta.tense])

  const fetchPhrase = useCallback(async () => {
    setInput('')
    setStatus('idle')
    setHint(null)
    setHighlight(null)
    setShowHint(false)
    hadErrorRef.current = false
    usedHintRef.current = false

    if (prefetchRef.current) {
      const phrase = prefetchRef.current
      prefetchRef.current = null
      usedIdsRef.current.add(phrase.id)
      setPhrase(phrase)
      setLoading(false)
      prefetchNext(new Set(usedIdsRef.current))
      return
    }

    const exclude = [...usedIdsRef.current].join(',')
    const url = `/api/phrases/random?tense=${encodeURIComponent(meta.tense)}${exclude ? `&exclude=${exclude}` : ''}`
    const res = await fetch(url)
    const json = await res.json()
    if (json.data) {
      usedIdsRef.current.add(json.data.id)
      setPhrase(json.data)
    }
    setLoading(false)
    prefetchNext(new Set(usedIdsRef.current))
  }, [meta.tense, prefetchNext])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchPhrase() }, [fetchPhrase])

  useEffect(() => {
    if (phrase && !loading) {
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [phrase, loading])

  const handleSubmit = useCallback(() => {
    if (!phrase || !input.trim()) return
    const result = validate(input, phrase)
    setStatus(result.status)
    if (result.hint) setHint(result.hint)
    setHighlight(result.highlight ?? null)
    inputRef.current?.blur()
    if (result.status !== 'correct') {
      hadErrorRef.current = true
      setShowHint(false)
      setMistakeIndex(i => (i + 1) % 4)
    }
  }, [phrase, input])

  const handleNext = () => {
    inputRef.current?.focus()
    const next = progress + 1
    // Record stat for this question
    const newStats = { ...stats }
    if (!hadErrorRef.current && !usedHintRef.current) newStats.firstTry++
    else if (hadErrorRef.current && !usedHintRef.current) newStats.fixed++
    else newStats.withHints++
    setStats(newStats)

    if (next >= SESSION_TOTAL) {
      const duration = Math.round((Date.now() - sessionStart.current) / 1000)
      const p = new URLSearchParams({
        firstTry: String(newStats.firstTry),
        fixed: String(newStats.fixed),
        withHints: String(newStats.withHints),
        skipped: String(newStats.skipped),
        duration: String(duration),
      })
      router.push(`/escribiendo/${tenseId}/results?${p}`)
      return
    }
    setProgress(next)
    fetchPhrase()
  }

  const handleSkip = () => {
    const newStats = { ...stats, skipped: stats.skipped + 1 }
    setStats(newStats)
    setStatus('skipped')
  }

  const handleSkipNext = () => {
    inputRef.current?.focus()
    const next = progress + 1
    if (next >= SESSION_TOTAL) {
      const duration = Math.round((Date.now() - sessionStart.current) / 1000)
      const p = new URLSearchParams({
        firstTry: String(stats.firstTry),
        fixed: String(stats.fixed),
        withHints: String(stats.withHints),
        skipped: String(stats.skipped),
        duration: String(duration),
      })
      router.push(`/escribiendo/${tenseId}/results?${p}`)
      return
    }
    setProgress(next)
    fetchPhrase()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (status === 'correct') handleNext()
      else if (status === 'skipped') handleSkipNext()
      else handleSubmit()
    }
  }

  const handleInputChange = (v: string) => {
    if (status === 'correct' || status === 'skipped') return
    setInput(v)
    if (status !== 'idle') { setStatus('idle'); setHighlight(null) }
  }

  const isError = status === 'invalid_form' || status === 'wrong_stem' || status === 'wrong_ending' || status === 'wrong_person'
  const isStemIrreg = phrase?.type === 'Indef_stem_irreg'
  const isIndefReg  = phrase?.type === 'Indef_reg' || phrase?.type === 'Indef_reg_gustar'

  return (
    <>
      {/* Curtain up */}
      <motion.div
        className="fixed inset-x-0 top-0 h-screen z-50 pointer-events-none"
        style={{ backgroundColor: meta.color }}
        initial={{ y: '0%' }}
        animate={{ y: 'calc(-100% - 50px)' }}
        transition={{ duration: 0.55, ease: [0.4, 0, 0.6, 1], delay: 0.1 }}
      >
        <div className="absolute left-0 right-0 bottom-0 translate-y-[99%]">
          <svg viewBox="0 0 402 36" preserveAspectRatio="none" className="w-full block h-9 rotate-180" style={{ color: meta.color }}>
            <path d="M0,0 C67,36 134,0 201,18 C268,36 335,0 402,18 L402,36 L0,36 Z" fill="currentColor" />
          </svg>
        </div>
      </motion.div>

      <div className="min-h-screen bg-white flex flex-col pb-0">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-10 pb-4">
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => router.back()} className="p-2 -m-2">
            <X className="w-5 h-5 text-gray-400" />
          </motion.button>
          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: meta.color }}
              animate={{ width: `${((progress + 1) / SESSION_TOTAL) * 100}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            />
          </div>
          <span className="text-xs font-bold text-gray-400">{progress + 1}/{SESSION_TOTAL}</span>
        </div>

        {/* Game */}
        <div className="flex-1 flex flex-col px-5 pt-6 pb-28 gap-4">

          {/* Sentence — always in DOM so input never unmounts and keyboard stays open */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Sentence */}
            <motion.div
              className="flex flex-col items-center justify-start gap-5 pt-8"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {!loading && phrase ? (
                <InlineSentence
                  sentence={phrase.sentence}
                  verb={phrase.verb}
                  input={input}
                  answer={phrase.answer}
                  highlight={highlight}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  status={status}
                  inputRef={inputRef}
                  color={meta.color}
                  showHint={showHint}
                />
              ) : (
                <div className="h-[80px]" />
              )}
            </motion.div>

            {/* Error feedback card */}
            <AnimatePresence>
              {isError && (
                <motion.div
                  key={`error-${mistakeIndex}`}
                  className="px-4 py-4 flex flex-col gap-3"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <div className="flex items-center gap-4">
                    <Image
                      src={`/images/${tenseId}/Mistake ${mistakeIndex + 1} - ${charName}.png`}
                      width={120} height={120} alt=""
                      className="shrink-0"
                    />
                    <div className="flex-1">
                      {showHint && hint ? (
                        <p className="text-sm text-gray-700 leading-relaxed">{renderHint(hint)}</p>
                      ) : (
                        <p className="text-base font-bold text-gray-800">Try again</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Spacer — always in DOM so layout is stable; image animates inside */}
            <div className="flex-1 flex items-center justify-center min-h-0">
              <AnimatePresence>
                {(status === 'correct' || status === 'skipped') && (
                  <motion.div key={status}
                    initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <Image
                      src={status === 'skipped'
                        ? `/images/${tenseId}/Mistake 1 - ${charName}.png`
                        : `/images/escribiendo/${meta.character}.png`}
                      width={180} height={180} alt="" className="drop-shadow-lg"
                      priority
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Buttons — always fixed at bottom-0; keyboard overlaps skip/submit, that's fine */}
          <div className="fixed bottom-0 left-0 right-0 flex flex-col px-5 pb-6 pt-3 bg-white gap-2">
            {isError && (
              <div className="flex flex-col items-end gap-1 pb-1">
                {isStemIrreg ? (
                  <>
                    <StatusRow label="Tense ending" ok={status === 'wrong_person' || (status === 'wrong_stem' && highlight !== null)} />
                    <StatusRow label="Person/Number" ok={status === 'wrong_stem' && highlight !== null} />
                    <StatusRow label="Stem"          ok={status !== 'wrong_stem'} />
                  </>
                ) : isIndefReg ? (
                  <>
                    <StatusRow label="Tense ending" ok={status !== 'wrong_ending'} />
                    <StatusRow label="Person/Number" ok={status === 'wrong_stem'} />
                    <StatusRow label="Stem"          ok={(status === 'wrong_person' || status === 'wrong_ending') && highlight !== null} />
                  </>
                ) : (
                  <>
                    <StatusRow label="Form"          ok={status === 'wrong_person'} />
                    <StatusRow label="Person/Number" ok={false} />
                  </>
                )}
              </div>
            )}
            <div className="flex items-center gap-4">
            {status === 'correct' ? (
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleNext}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-black text-white"
                style={{ backgroundColor: '#22C55E' }}
              >
                <SkipForward className="w-5 h-5 stroke-[2.5]" />
                {progress + 1 >= SESSION_TOTAL ? 'Finish' : 'Next!'}
              </motion.button>
            ) : status === 'skipped' ? (
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleSkipNext}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-black text-gray-900"
                style={{ backgroundColor: '#F5B461' }}
              >
                <SkipForward className="w-5 h-5 stroke-[2.5]" />
                {progress + 1 >= SESSION_TOTAL ? 'Finish' : 'Ok, next!'}
              </motion.button>
            ) : isError ? (
              <>
                <motion.button whileTap={{ scale: 0.9 }} onClick={handleSkip}
                  className="flex items-center gap-1.5 text-sm font-bold text-gray-900 shrink-0"
                >
                  <SkipForward className="w-4 h-4" /> Skip
                </motion.button>
                <motion.button
                  whileTap={showHint ? {} : { scale: 0.95 }}
                  onClick={() => { if (showHint) return; setShowHint(true); usedHintRef.current = true }}
                  className="ml-auto flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white transition-colors duration-200"
                  style={{ backgroundColor: showHint ? '#9CA3AF' : meta.color }}
                >
                  <Lightbulb className="w-4 h-4" /> {showHint ? 'Hint shown' : 'Step-by-step hint'}
                </motion.button>
              </>
            ) : (
              <>
                <motion.button whileTap={{ scale: 0.9 }} onClick={handleSkip}
                  className="flex items-center gap-1.5 text-sm font-bold text-gray-900 shrink-0"
                >
                  <SkipForward className="w-4 h-4" /> Skip
                </motion.button>
                <motion.button
                  whileTap={input.trim() ? { scale: 0.95 } : {}}
                  onClick={handleSubmit}
                  disabled={!input.trim() || loading}
                  className="ml-auto flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black text-white transition-colors duration-200"
                  style={{ backgroundColor: input.trim() ? meta.color : '#D1D5DB' }}
                >
                  <Send className="w-4 h-4" /> Submit
                </motion.button>
              </>
            )}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
