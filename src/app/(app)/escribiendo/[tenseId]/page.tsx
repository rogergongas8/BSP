'use client'

import { use, useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import { X, Check, SkipForward, Lightbulb, Send, BookOpen } from 'lucide-react'
import { validate, TENSE_META, resolveTenseId, type Phrase, type ValidationStatus, type PPHighlightRange } from '@/lib/game-logic'
import OverscrollColor from '@/components/overscroll-color'

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
  idle:                 { bg: '#FFFFFF',  border: '',        color: '' },
  correct:              { bg: '#DCFCE7',  border: '#22C55E', color: '#16A34A' },
  skipped:              { bg: '#FFFFFF',  border: '#22C55E', color: '#16A34A' },
  invalid_form:         { bg: '#FEE2E2',  border: '#EF4444', color: '#DC2626' },
  wrong_stem:           { bg: '#FEE2E2',  border: '#EF4444', color: '#DC2626' },
  wrong_ending:         { bg: '#FFF1F2',  border: '#FECDD3', color: '#E11D48' },
  wrong_person:         { bg: '#FFF1F2',  border: '#FECDD3', color: '#E11D48' },
  structure_incomplete: { bg: '#FEE2E2',  border: '#EF4444', color: '#DC2626' },
  aux_invalid:          { bg: '#FEE2E2',  border: '#EF4444', color: '#DC2626' },
  aux_wrong_person:     { bg: '#FFF1F2',  border: '#FECDD3', color: '#E11D48' },
  part_irreg_invalid:   { bg: '#FEE2E2',  border: '#EF4444', color: '#DC2626' },
  part_ending_invalid:  { bg: '#FEE2E2',  border: '#EF4444', color: '#DC2626' },
  part_stem_invalid:    { bg: '#FFF1F2',  border: '#FECDD3', color: '#E11D48' },
}

/** Resolves a PPHighlightRange (relative to the aux or part token, or the whole input) to an absolute [start, end) range over the full input string. */
function resolvePpHighlight(input: string, range: PPHighlightRange): { start: number; end: number } | null {
  if (range.token === 'all') {
    return { start: Math.min(range.start, input.length), end: Math.min(range.end, input.length) }
  }
  const spaceIdx = input.indexOf(' ')
  if (range.token === 'aux') {
    const auxLen = spaceIdx === -1 ? input.length : spaceIdx
    return { start: Math.min(range.start, auxLen), end: Math.min(range.end, auxLen) }
  }
  // token === 'part': offset by aux token + the space
  if (spaceIdx === -1) return null
  const partStart = spaceIdx + 1
  const partLen = input.length - partStart
  return {
    start: partStart + Math.min(range.start, partLen),
    end: partStart + Math.min(range.end, partLen),
  }
}

function InlineSentence({
  sentence, verb, input, answer, highlight, ppHighlight, onChange, onKeyDown, status, inputRef, color, showHint,
}: {
  sentence: string
  verb: string
  input: string
  answer: string
  highlight: string | null
  ppHighlight: PPHighlightRange | null
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

  // Split color only shown when hint is active (indefinido-style prefix/suffix highlight)
  const showSplit = showHint && (status === 'wrong_person' || status === 'wrong_ending' || status === 'wrong_stem') && highlight
  const correctPrefix = showSplit ? input.slice(0, highlight!.length) : null
  const wrongSuffix   = showSplit ? input.slice(highlight!.length) : null
  // wrong_stem: stem part is wrong → reverse colors (prefix=red, suffix=theme)
  const stemIsWrong = status === 'wrong_stem'

  // Pretérito Perfecto: arbitrary [start,end) range within either token, rendered in red
  const showPpSplit = showHint && ppHighlight
  const ppRange = showPpSplit ? resolvePpHighlight(input, ppHighlight) : null
  const ppBefore = ppRange ? input.slice(0, ppRange.start) : null
  const ppMid    = ppRange ? input.slice(ppRange.start, ppRange.end) : null
  const ppAfter  = ppRange ? input.slice(ppRange.end) : null

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
              backgroundColor: (correctPrefix !== null || ppRange !== null) ? '#FFFFFF' : styles.bg,
              color: (correctPrefix !== null || ppRange !== null) ? 'transparent'
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
          {ppRange !== null && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none font-medium"
              style={{ fontSize: '16px', whiteSpace: 'pre' }}
            >
              <span style={{ color }}>{ppBefore}</span>
              <span style={{ color: 'rgb(239,68,68)' }}>{ppMid}</span>
              <span style={{ color }}>{ppAfter}</span>
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
  const { tenseId: rawTenseId } = use(params)
  const isMixed = rawTenseId === 'mixed'
  const tenseId = resolveTenseId(rawTenseId) ?? rawTenseId
  const router = useRouter()
  const searchParams = useSearchParams()
  const staticMeta = TENSE_META[tenseId] ?? TENSE_META['indefinido']

  const isRedo = searchParams.get('mode') === 'redo'
  const redoSubcategory = searchParams.get('subcategory') ?? undefined

  const [phrase, setPhrase] = useState<Phrase | null>(null)
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<ValidationStatus>('idle')
  const [hint, setHint] = useState<string | null>(null)
  const [highlight, setHighlight] = useState<string | null>(null)
  const [ppHighlight, setPpHighlight] = useState<PPHighlightRange | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [progress, setProgress] = useState(0)
  const [mistakeIndex, setMistakeIndex] = useState(0)
  const [stats, setStats] = useState({ firstTry: 0, fixed: 0, withHints: 0, skipped: 0 })
  const hadErrorRef   = useRef(false)
  const usedHintRef   = useRef(false)
  const usedIdsRef    = useRef<Set<string>>(new Set())
  const sessionStart  = useRef<number | null>(null)
  const inputRef      = useRef<HTMLInputElement>(null)

  // In mixed mode, each phrase carries its own tense — recompute meta per-phrase.
  const meta = isMixed && phrase?.tense ? (TENSE_META[phrase.tense] ?? staticMeta) : staticMeta
  const charName = meta.characterName

  const prefetchRef = useRef<Phrase | null>(null)
  const redoQueueRef = useRef<Phrase[] | null>(null)
  const [sessionTotal, setSessionTotal] = useState(SESSION_TOTAL)
  const fetchSeqRef = useRef(0)
  const hasInitRef = useRef(false)
  const [keyboardInset, setKeyboardInset] = useState(0)

  // Fixed bottom bars stay pinned to the layout viewport, so the on-screen keyboard
  // covers them unless we manually offset by the visual viewport's shrink amount.
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const handleViewportChange = () => {
      setKeyboardInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop))
    }
    vv.addEventListener('resize', handleViewportChange)
    vv.addEventListener('scroll', handleViewportChange)
    handleViewportChange()
    return () => {
      vv.removeEventListener('resize', handleViewportChange)
      vv.removeEventListener('scroll', handleViewportChange)
    }
  }, [])

  const prefetchNext = useCallback(async (currentIds: Set<string>) => {
    if (isRedo || isMixed) return
    try {
      const exclude = [...currentIds].join(',')
      const url = `/api/phrases/random?tense=${encodeURIComponent(staticMeta.tense)}${exclude ? `&exclude=${exclude}` : ''}`
      const res = await fetch(url)
      const json = await res.json()
      if (json.data) prefetchRef.current = json.data
    } catch { /* silent */ }
  }, [staticMeta.tense, isRedo, isMixed])

  const fetchPhrase = useCallback(async () => {
    const seq = ++fetchSeqRef.current

    setInput('')
    setStatus('idle')
    setHint(null)
    setHighlight(null)
    setPpHighlight(null)
    setShowHint(false)
    hadErrorRef.current = false
    usedHintRef.current = false

    if (isRedo) {
      if (redoQueueRef.current === null) {
        setLoading(true)
        const url = isMixed
          ? '/api/phrases/mistakes/all'
          : `/api/phrases/mistakes?tense=${encodeURIComponent(staticMeta.tense)}${redoSubcategory ? `&subcategory=${encodeURIComponent(redoSubcategory)}` : ''}`
        const res = await fetch(url)
        const json = await res.json()
        if (seq !== fetchSeqRef.current) return
        const list: Phrase[] = json.data ?? []
        redoQueueRef.current = list
        setSessionTotal(list.length)
      }
      const next = redoQueueRef.current ? (redoQueueRef.current.shift() ?? null) : null
      setPhrase(next)
      setLoading(false)
      return
    }

    if (prefetchRef.current) {
      const phrase = prefetchRef.current
      prefetchRef.current = null
      usedIdsRef.current.add(phrase.id)
      setPhrase(phrase)
      setLoading(false)
      prefetchNext(new Set(usedIdsRef.current))
      return
    }

    setLoading(true)
    const exclude = [...usedIdsRef.current].join(',')
    const url = `/api/phrases/random?tense=${encodeURIComponent(staticMeta.tense)}${exclude ? `&exclude=${exclude}` : ''}`
    try {
      const res = await fetch(url)
      const json = await res.json()
      if (seq !== fetchSeqRef.current) return
      if (json.data) {
        usedIdsRef.current.add(json.data.id)
        setPhrase(json.data)
        prefetchNext(new Set(usedIdsRef.current))
      }
    } catch {
      // silent
    } finally {
      if (seq === fetchSeqRef.current) {
        setLoading(false)
      }
    }
  }, [staticMeta.tense, prefetchNext, isRedo, isMixed, redoSubcategory])

  useEffect(() => {
    if (!hasInitRef.current) {
      hasInitRef.current = true
      sessionStart.current = Date.now()
      fetchPhrase()
    }
  }, [fetchPhrase])

  useEffect(() => {
    if (phrase && !loading) {
      inputRef.current?.focus()
    }
  }, [phrase, loading])

  useEffect(() => {
    if (isRedo && !loading && !phrase) router.replace('/learn')
  }, [isRedo, loading, phrase, router])

  const handleSubmit = useCallback(() => {
    if (!phrase || !input.trim()) return
    const result = validate(input, phrase)
    setStatus(result.status)
    if (result.hint) setHint(result.hint)
    setHighlight(result.highlight ?? null)
    setPpHighlight(result.ppHighlight ?? null)
    inputRef.current?.blur()
    if (result.status !== 'correct') {
      hadErrorRef.current = true
      setShowHint(false)
      setMistakeIndex(i => (i + 1) % 4)
      fetch('/api/mistakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phrase_id: phrase.id, tense: phrase.tense ?? staticMeta.tense, phrase_type: phrase.type }),
      }).catch(() => {})
    } else {
      fetch('/api/mistakes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phrase_id: phrase.id }),
      }).catch(() => {})
    }
  }, [phrase, input, staticMeta.tense])

  const handleNext = () => {
    inputRef.current?.focus()
    const next = progress + 1
    // Record stat for this question
    const newStats = { ...stats }
    if (!hadErrorRef.current && !usedHintRef.current) newStats.firstTry++
    else if (hadErrorRef.current && !usedHintRef.current) newStats.fixed++
    else newStats.withHints++
    setStats(newStats)

    if (next >= sessionTotal) {
      const start = sessionStart.current ?? Date.now()
      const duration = Math.round((Date.now() - start) / 1000)
      if (isRedo) { router.push('/learn'); return }
      const p = new URLSearchParams({
        firstTry: String(newStats.firstTry),
        fixed: String(newStats.fixed),
        withHints: String(newStats.withHints),
        skipped: String(newStats.skipped),
        duration: String(duration),
      })
      router.push(`/escribiendo/${encodeURIComponent(tenseId)}/results?${p.toString()}`)
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
    if (next >= sessionTotal) {
      if (isRedo) { router.push('/learn'); return }
      const start = sessionStart.current ?? Date.now()
      const duration = Math.round((Date.now() - start) / 1000)
      const p = new URLSearchParams({
        firstTry: String(stats.firstTry),
        fixed: String(stats.fixed),
        withHints: String(stats.withHints),
        skipped: String(stats.skipped),
        duration: String(duration),
      })
      router.push(`/escribiendo/${encodeURIComponent(tenseId)}/results?${p.toString()}`)
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
    if (status !== 'idle') { setStatus('idle'); setHighlight(null); setPpHighlight(null) }
  }

  const isError = status === 'invalid_form' || status === 'wrong_stem' || status === 'wrong_ending' || status === 'wrong_person'
    || status === 'structure_incomplete' || status === 'aux_invalid' || status === 'aux_wrong_person'
    || status === 'part_irreg_invalid' || status === 'part_ending_invalid' || status === 'part_stem_invalid'
  const isStemIrreg = phrase?.type === 'Indef_stem_irreg'
  const isIndefReg  = phrase?.type === 'Indef_reg' || phrase?.type === 'Indef_reg_gustar'
    || phrase?.type === 'Imp_reg' || phrase?.type === 'Imp_reg_gustar'
  const isPP        = phrase?.type === 'PP_irreg' || phrase?.type === 'PP_reg' || phrase?.type === 'PP_reg_gustar'

  return (
    <>
      <OverscrollColor top="#ffffff" bottom="#ffffff" />
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
              animate={{ width: `${((progress + 1) / sessionTotal) * 100}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            />
          </div>
          <span className="text-xs font-bold text-gray-400">{progress + 1}/{sessionTotal}</span>
          <Link href={`/learn/${tenseId}`} className="p-2 -m-2 shrink-0">
            <BookOpen className="w-5 h-5 text-gray-400" />
          </Link>
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
                  ppHighlight={ppHighlight}
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
                      src={`/images/${meta.imageDir}/Mistake ${mistakeIndex + 1} - ${charName}.png`}
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
                        ? `/images/${meta.imageDir}/${meta.character}.png`
                        : `/images/${meta.imageDir}/Success - ${charName}.png`}
                      width={180} height={180} alt="" className="drop-shadow-lg"
                      priority
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Buttons — always fixed at bottom-0; keyboard overlaps Submit/Hint, that's fine (Skip floats separately below) */}
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
                ) : isPP ? (
                  <>
                    <StatusRow label="Structure"     ok={status !== 'structure_incomplete'} />
                    <StatusRow label="Auxiliary"     ok={status !== 'aux_invalid'} />
                    <StatusRow label="Person/Number" ok={status !== 'aux_wrong_person'} />
                    <StatusRow label="Participle"    ok={status !== 'part_irreg_invalid' && status !== 'part_ending_invalid' && status !== 'part_stem_invalid'} />
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
                {progress + 1 >= sessionTotal ? 'Finish' : 'Next!'}
              </motion.button>
            ) : status === 'skipped' ? (
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleSkipNext}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-black text-gray-900"
                style={{ backgroundColor: '#F5B461' }}
              >
                <SkipForward className="w-5 h-5 stroke-[2.5]" />
                {progress + 1 >= sessionTotal ? 'Finish' : 'Ok, next!'}
              </motion.button>
            ) : isError ? (
              <>
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

          {/* Skip floats independently just above the keyboard (only Skip — Submit/Hint stay put, reachable via the keyboard's own return key) */}
          {status !== 'correct' && status !== 'skipped' && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleSkip}
              className="fixed left-5 flex items-center gap-1.5 text-sm font-bold text-gray-900 bg-white px-3 py-2 rounded-xl shadow-md z-10"
              style={{ bottom: 24 + keyboardInset, transition: 'bottom 150ms ease-out' }}
            >
              <SkipForward className="w-4 h-4" /> Skip
            </motion.button>
          )}

        </div>
      </div>
    </>
  )
}
