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
      className="text-gray-700 font-medium text-base cursor-pointer transition-colors duration-150"
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
  invalid_form: { bg: '#FEE2E2',  border: '#EF4444', color: '#DC2626' },
  wrong_person: { bg: '#FFF1F2',  border: '#FECDD3', color: '#E11D48' },
}

function InlineSentence({
  sentence, verb, input, answer, highlight, onChange, onKeyDown, status, inputRef, color,
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
}) {
  const [before, after] = sentence.split('___')
  const beforeWords = before.trim().split(/\s+/).filter(Boolean)
  const afterWords = after.trim().split(/\s+/).filter(Boolean)

  const styles = INPUT_STYLES[status]
  const borderColor = status === 'idle' ? color : styles.border
  const displayValue = status === 'correct' ? answer : input
  const boxW = Math.max(80, displayValue.length * 10 + 36)

  const correctPrefix = status === 'wrong_person' && highlight
    ? input.slice(0, highlight.length) : null
  const wrongSuffix = status === 'wrong_person' && highlight
    ? input.slice(highlight.length) : null

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
            value={displayValue}
            onChange={e => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            readOnly={status === 'correct'}
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
              backgroundColor: status === 'wrong_person' && correctPrefix !== null
                ? '#FFFFFF' : styles.bg,
              color: status === 'wrong_person' && correctPrefix !== null
                ? 'transparent'
                : status === 'idle' ? color : styles.color,
              fontSize: '16px',
            }}
          />
          {status === 'wrong_person' && correctPrefix !== null && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none font-medium"
              style={{ fontSize: '16px' }}
            >
              <span style={{ color }}>{correctPrefix}</span>
              <span className="text-red-500">{wrongSuffix}</span>
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
  const inputRef = useRef<HTMLInputElement>(null)

  const charName = meta.character.charAt(0).toUpperCase() + meta.character.slice(1)

  const fetchPhrase = useCallback(async () => {
    setLoading(true)
    setInput('')
    setStatus('idle')
    setHint(null)
    setHighlight(null)
    setShowHint(false)
    try {
      const res = await fetch(`/api/phrases/random?tense=${encodeURIComponent(meta.tense)}`)
      const json = await res.json()
      if (json.data) setPhrase(json.data)
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [meta.tense])

  useEffect(() => { fetchPhrase() }, [fetchPhrase])

  const handleSubmit = useCallback(() => {
    if (!phrase || !input.trim()) return
    const result = validate(input, phrase)
    setStatus(result.status)
    if (result.hint) setHint(result.hint)
    setHighlight(result.highlight ?? null)
    if (result.status !== 'correct') {
      setMistakeIndex(i => (i + 1) % 4)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [phrase, input])

  const handleNext = () => {
    const next = progress + 1
    if (next >= SESSION_TOTAL) { router.back(); return }
    setProgress(next)
    fetchPhrase()
  }

  const handleSkip = () => {
    setProgress(p => Math.min(p + 1, SESSION_TOTAL - 1))
    fetchPhrase()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (status === 'correct') handleNext()
      else handleSubmit()
    }
  }

  const handleInputChange = (v: string) => {
    setInput(v)
    if (status !== 'idle') { setStatus('idle'); setHighlight(null) }
  }

  const isError = status === 'invalid_form' || status === 'wrong_person'

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
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => router.back()}>
            <X className="w-5 h-5 text-gray-400" />
          </motion.button>
          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: meta.color }}
              animate={{ width: `${(progress / SESSION_TOTAL) * 100}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            />
          </div>
          <span className="text-xs font-bold text-gray-400">{progress}/{SESSION_TOTAL}</span>
        </div>

        {/* Game */}
        <div className="flex-1 flex flex-col px-5 pt-6 pb-28 gap-4">

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" className="flex-1 flex flex-col items-center justify-center gap-4"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                <div className="flex gap-3">
                  {[1, 2, 3].map((n, i) => (
                    <motion.div key={n} animate={{ y: [0, -12, 0] }}
                      transition={{ duration: 0.5, delay: i * 0.15, repeat: Infinity, ease: 'easeInOut' }}>
                      <Image src={`/images/loading/small-loading${n}.png`} width={40} height={40} alt="" />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : phrase ? (
              <motion.div key={phrase.id} className="flex-1 flex flex-col gap-4"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              >
                {/* Sentence */}
                <div className="flex flex-col items-center justify-start gap-5 pt-8">
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
                  />
                </div>

                {/* Correct feedback */}
                <AnimatePresence>
                  {status === 'correct' && (
                    <motion.div key="correct" className="flex-1 flex items-start justify-center pt-8"
                      initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      <Image src={`/images/escribiendo/${meta.character}.png`} width={180} height={180} alt="" className="drop-shadow-lg" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error feedback card */}
                <AnimatePresence>
                  {isError && (
                    <motion.div
                      key={`error-${mistakeIndex}`}
                      className="px-4 py-4 flex flex-col gap-3"
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                      {/* Image + message */}
                      <div className="flex items-center gap-4">
                        <Image
                          src={`/images/${tenseId}/Mistake ${mistakeIndex + 1} - ${charName}.png`}
                          width={170} height={170} alt=""
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

                      {/* Form / Person checkmarks */}
                      <div className="flex flex-col items-end gap-1">
                        <StatusRow label="Form" ok={status === 'wrong_person'} />
                        <StatusRow label="Person/Number" ok={false} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex-1" />
              </motion.div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-400 text-sm">No phrases available for this tense yet.</p>
              </div>
            )}
          </AnimatePresence>

          {/* Buttons — fixed above keyboard */}
          <div className="fixed bottom-0 left-0 right-0 flex items-center gap-4 px-5 pb-6 pt-3 bg-white">
            {status === 'correct' ? (
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleNext}
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
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setShowHint(h => !h); setTimeout(() => inputRef.current?.focus(), 50) }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold border-2 transition-colors duration-200"
                  style={showHint
                    ? { borderColor: '#D1D5DB', color: '#9CA3AF' }
                    : { borderColor: meta.color, color: meta.color }
                  }
                >
                  <Lightbulb className="w-4 h-4" /> Step-by-step hint
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
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-black text-white transition-colors duration-200"
                  style={{ backgroundColor: input.trim() ? meta.color : '#D1D5DB' }}
                >
                  <Send className="w-4 h-4" /> Submit
                </motion.button>
              </>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
