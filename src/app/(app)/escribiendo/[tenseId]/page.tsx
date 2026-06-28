'use client'

import { use, useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { X, ChevronRight, SkipForward, Info } from 'lucide-react'
import { validate, TENSE_META, type Phrase, type ValidationStatus } from '@/lib/game-logic'

const SESSION_TOTAL = 10

function renderHint(hint: string) {
  return hint.split(/\*\*(.+?)\*\*/g).map((p, i) =>
    i % 2 === 1 ? <strong key={i}>{p}</strong> : <span key={i}>{p}</span>
  )
}

function InlineSentence({
  sentence, input, onChange, onKeyDown, status, inputRef, color,
}: {
  sentence: string
  input: string
  onChange: (v: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  status: ValidationStatus
  inputRef: React.RefObject<HTMLInputElement | null>
  color: string
}) {
  const [before, after] = sentence.split('___')
  const borderColor =
    status === 'correct' ? '#22c55e' :
    status !== 'idle' ? '#ef4444' :
    color

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 px-4 text-lg leading-relaxed">
      <span className="text-gray-700 font-medium">{before}</span>
      <input
        ref={inputRef}
        value={input}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className="inline-block border-2 rounded-xl px-3 py-1 text-center font-black outline-none transition-colors duration-200"
        style={{
          minWidth: 80,
          width: Math.max(80, input.length * 14 + 40),
          borderColor,
          color,
          fontSize: '1.1rem',
        }}
      />
      <span className="text-gray-700 font-medium">{after}</span>
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
  const [showHint, setShowHint] = useState(false)
  const [progress, setProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchPhrase = useCallback(async () => {
    setLoading(true)
    setInput('')
    setStatus('idle')
    setHint(null)
    setShowHint(false)
    try {
      const res = await fetch(`/api/phrases/random?tense=${encodeURIComponent(meta.tense)}`)
      const json = await res.json()
      if (json.data) setPhrase(json.data)
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [meta.tense])

  useEffect(() => { fetchPhrase() }, [fetchPhrase])

  const handleSubmit = useCallback(() => {
    if (!phrase || !input.trim()) return
    const result = validate(input, phrase)
    setStatus(result.status)
    if (result.hint) setHint(result.hint)
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
    if (status !== 'idle') setStatus('idle')
  }

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

      {/* No BottomNav here — layout renders it, so we override via a portal-like empty slot */}
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
        <div className="flex-1 flex flex-col px-5 pt-6 pb-8 gap-5">

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
              <motion.div key={phrase.id} className="flex-1 flex flex-col gap-5"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              >
                {/* Verb */}
                <p className="text-center text-xs font-black tracking-widest uppercase" style={{ color: meta.color }}>
                  {phrase.verb}
                </p>

                {/* Sentence with inline input */}
                <div className="flex-1 flex flex-col items-center justify-center gap-6">
                  <InlineSentence
                    sentence={phrase.sentence}
                    input={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    status={status}
                    inputRef={inputRef}
                    color={meta.color}
                  />

                  {/* Feedback */}
                  <AnimatePresence mode="wait">
                    {status === 'correct' && (
                      <motion.div key="correct" className="flex flex-col items-center gap-3"
                        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      >
                        <Image src={`/images/escribiendo/${meta.character}.png`} width={110} height={110} alt="" className="drop-shadow-lg" />
                        <p className="text-base font-black text-green-500">¡Correcto! 🎉</p>
                      </motion.div>
                    )}
                    {status === 'invalid_form' && (
                      <motion.p key="invalid"
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="text-sm font-semibold text-red-500 text-center"
                      >
                        Try again
                      </motion.p>
                    )}
                    {status === 'wrong_person' && (
                      <motion.p key="wp"
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="text-sm font-semibold text-red-500 text-center"
                      >
                        Close! Check the subject
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {/* Hint box */}
                  <AnimatePresence>
                    {showHint && hint && status !== 'correct' && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                        className="flex items-start gap-2 bg-amber-50 rounded-xl px-4 py-3 border border-amber-200 mx-2"
                      >
                        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800 leading-relaxed">{renderHint(hint)}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </motion.div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-400 text-sm">No phrases available for this tense yet.</p>
              </div>
            )}
          </AnimatePresence>

          {/* Buttons */}
          <div className="flex gap-3">
            {status !== 'correct' ? (
              <>
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleSkip}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-bold text-gray-400 bg-gray-100"
                >
                  <SkipForward className="w-4 h-4" /> Skip
                </motion.button>

                {hint && !showHint && (
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowHint(true)}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-bold border-2"
                    style={{ borderColor: meta.color, color: meta.color }}
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  >
                    <Info className="w-4 h-4" /> Hint
                  </motion.button>
                )}

                <motion.button
                  whileTap={input.trim() ? { scale: 0.95 } : {}}
                  onClick={handleSubmit}
                  disabled={!input.trim() || loading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-black text-white transition-colors duration-200"
                  style={{ backgroundColor: input.trim() ? meta.color : '#D1D5DB' }}
                >
                  <ChevronRight className="w-4 h-4 stroke-[3]" /> Submit
                </motion.button>
              </>
            ) : (
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleNext}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="w-full py-4 rounded-2xl text-base font-black text-white"
                style={{ backgroundColor: meta.color }}
              >
                {progress + 1 >= SESSION_TOTAL ? 'Finish' : 'Next →'}
              </motion.button>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
