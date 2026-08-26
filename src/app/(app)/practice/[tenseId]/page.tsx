'use client'

import { use, useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronRight, Sparkles, SkipForward } from 'lucide-react'
import OverscrollColor from '@/components/overscroll-color'
import { BATTLES, type BattleItem } from '@/components/game/BattleCarousel'
import ContrastGap from '@/components/game/ContrastGap'
import HintToggle from '@/components/game/HintToggle'
import { CONTRAST_ICON, CONTRAST_META, GAP_COLORS, gapVerbOnly, isContrastBattle, phraseGapCount, type ContrastBattleId, type ContrastPhrase } from '@/lib/contrast-game-logic'

const SESSION_TOTAL = 10

function PlaceholderComingSoon({ battle }: { battle: BattleItem }) {
  const router = useRouter()
  return (
    <div className="flex flex-col flex-1 bg-gray-50">
      <OverscrollColor top="#2F54BA" bottom="#ffffff" />

      {/* Header */}
      <div className="relative bg-bsp-blue px-5 pt-8 pb-10 overflow-hidden">
        <motion.div whileTap={{ scale: 0.9 }} className="relative mb-3 w-fit">
          <Link href="/practice" className="flex items-center gap-1 text-white/80 text-xs font-semibold">
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            Lío de tiempos
          </Link>
        </motion.div>
        <h1 className="text-2xl font-black text-white text-center tracking-tight">{battle.catName}</h1>
        <p className="text-[11px] font-medium tracking-widest text-center text-white/70 mt-1">{battle.tense}</p>
      </div>

      {/* Wave */}
      <div className="bg-bsp-blue -mb-px">
        <svg viewBox="0 0 402 36" preserveAspectRatio="none" className="w-full block h-9">
          <path d="M0,0 C67,36 134,0 201,18 C268,36 335,0 402,18 L402,36 L0,36 Z" fill="#F9FAFB" />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center gap-5">
        <div className="relative w-48 h-48">
          <Image
            src={battle.image}
            alt={battle.catName}
            fill
            className="object-contain drop-shadow-xl"
            priority
          />
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>¡Próximamente!</span>
        </div>

        <p className="text-base font-bold text-gray-800 max-w-xs">
          Estamos preparando las frases para esta batalla de tiempos verbales.
        </p>
        <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
          Muy pronto podrás poner a prueba la diferencia entre estos tiempos con retos interactivos.
        </p>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => router.push('/practice')}
          className="mt-4 px-8 py-3.5 rounded-2xl bg-bsp-blue text-white text-sm font-bold shadow-md shadow-blue-500/20"
        >
          Volver a Lío de tiempos
        </motion.button>
      </div>
    </div>
  )
}

/** Splits a sentence on its blank(s) (___), returning text segments to render around each gap. */
function splitSentence(sentence: string, gapCount: 1 | 2): string[] {
  const parts = sentence.split('___')
  // parts.length should be gapCount + 1; pad defensively if the data is malformed
  while (parts.length < gapCount + 1) parts.push('')
  return parts
}

/**
 * One blank inside the sentence, with its verb label stacked directly above it.
 *
 * Once the answer is in, the blank always shows the *correct* word on white with a neutral dark
 * outline — including when the player got it wrong. Echoing their wrong pick back in red left the
 * sentence reading incorrectly, which is the opposite of what a learner should be left looking at.
 * The outline stays neutral rather than green so it reads as "this is the answer", not as a verdict;
 * which option they chose is marked on the cards below.
 */
/** One blank in the sentence. Once `revealed`, it holds the right word — not the player's pick —
 *  in the green-bordered "correct answer" box the rest of the app uses, matching the multiplayer
 *  round. Which option they actually chose is marked on the cards below. */
function GapWithLabel({ verb, value, color, revealed }: { verb: string; value: string | null; color: string; revealed?: boolean }) {
  const resultStyle = revealed
    ? { borderColor: '#1D841D', backgroundColor: '#F3F4F6', color: '#111827' }
    : { borderColor: color, color: '#111827' }

  return (
    <span className="relative inline-block align-middle mx-1">
      {/* -top-5 (20px): moved closer to the gap box to associate them visually. */}
      <span
        className="absolute left-1/2 -top-5 -translate-x-1/2 text-[10px] font-bold tracking-widest uppercase whitespace-nowrap"
        style={{ color: revealed ? '#1D841D' : '#9CA3AF' }}
      >
        {gapVerbOnly(verb)}
      </span>
      <span
        className="inline-flex min-w-[4.375rem] min-h-[2.25rem] px-3 items-center justify-center rounded-lg border-2 text-center font-bold whitespace-nowrap leading-none"
        style={resultStyle}
      >
        {value || '\u200B'}
      </span>
    </span>
  )
}

export default function BattlePracticePage({ params }: { params: Promise<{ tenseId: string }> }) {
  const { tenseId } = use(params)
  const battle = BATTLES.find(b => b.id === tenseId) ?? BATTLES[0]

  if (tenseId === 'mixed') {
    return <ContrastGame battleId="mixed" />
  }

  if (!isContrastBattle(tenseId)) {
    return <PlaceholderComingSoon battle={battle} />
  }

  return <ContrastGame battleId={tenseId} />
}

function ContrastGame({ battleId }: { battleId: ContrastBattleId | 'mixed' }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMixed = battleId === 'mixed'
  const staticMeta = CONTRAST_META[isMixed ? 'javi-mimo-zas' : battleId]
  const isRedo = searchParams.get('mode') === 'redo'

  const [phrase, setPhrase] = useState<ContrastPhrase | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected1, setSelected1] = useState<1 | 2 | null>(null)
  const [selected2, setSelected2] = useState<1 | 2 | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [showHints, setShowHints] = useState(false)
  const [progress, setProgress] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(SESSION_TOTAL)
  const [stats, setStats] = useState({ firstTry: 0, halfCorrect: 0, missed: 0 })
  // Whether each gap's two options are shown swapped (top/bottom), re-rolled per phrase so the
  // correct tense isn't always in the same visual slot.
  const [swap1, setSwap1] = useState(false)
  const [swap2, setSwap2] = useState(false)

  const usedIdsRef = useRef<Set<string>>(new Set())
  const prefetchRef = useRef<ContrastPhrase | null>(null)
  const redoQueueRef = useRef<ContrastPhrase[] | null>(null)
  const sessionStart = useRef<number | null>(null)
  const fetchSeqRef = useRef(0)
  const hasInitRef = useRef(false)

  // In mixed mode, each phrase carries its own battle_id — recompute meta per-phrase.
  const meta = isMixed && phrase ? CONTRAST_META[phrase.battle_id] : staticMeta

  const prefetchNext = useCallback(async (currentIds: Set<string>) => {
    if (isRedo || isMixed) return
    try {
      const exclude = [...currentIds].join(',')
      const url = `/api/contrast-phrases/random?battle_id=${battleId}${exclude ? `&exclude=${exclude}` : ''}`
      const res = await fetch(url)
      const json = await res.json()
      if (json.data) prefetchRef.current = json.data
    } catch { /* silent */ }
  }, [battleId, isRedo, isMixed])

  const fetchPhrase = useCallback(async () => {
    const seq = ++fetchSeqRef.current
    setSelected1(null)
    setSelected2(null)
    setSubmitted(false)
    setSwap1(Math.random() < 0.5)
    setSwap2(Math.random() < 0.5)

    if (isRedo) {
      if (redoQueueRef.current === null) {
        setLoading(true)
        const url = isMixed
          ? '/api/contrast-phrases/mistakes/all'
          : `/api/contrast-phrases/mistakes?battle_id=${battleId}`
        const res = await fetch(url)
        const json = await res.json()
        if (seq !== fetchSeqRef.current) return
        const list: ContrastPhrase[] = json.data ?? []
        redoQueueRef.current = list
        setSessionTotal(list.length)
      }
      const next = redoQueueRef.current ? (redoQueueRef.current.shift() ?? null) : null
      setPhrase(next)
      setLoading(false)
      return
    }

    if (prefetchRef.current) {
      const p = prefetchRef.current
      prefetchRef.current = null
      usedIdsRef.current.add(p.id)
      setPhrase(p)
      setLoading(false)
      prefetchNext(new Set(usedIdsRef.current))
      return
    }

    setLoading(true)
    const exclude = [...usedIdsRef.current].join(',')
    const url = `/api/contrast-phrases/random?battle_id=${battleId}${exclude ? `&exclude=${exclude}` : ''}`
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
      if (seq === fetchSeqRef.current) setLoading(false)
    }
  }, [battleId, prefetchNext, isRedo, isMixed])

  useEffect(() => {
    if (!hasInitRef.current) {
      hasInitRef.current = true
      sessionStart.current = Date.now()
      fetchPhrase()
    }
  }, [fetchPhrase])

  useEffect(() => {
    if (isRedo && !loading && !phrase) router.replace('/learn')
  }, [isRedo, loading, phrase, router])

  const gapCount = phrase ? phraseGapCount(phrase) : 1
  const icons = phrase ? CONTRAST_ICON[phrase.battle_id] : CONTRAST_ICON['javi-zas']
  const canCheck = selected1 !== null && (gapCount === 1 || selected2 !== null)

  const handleCheck = () => {
    if (!canCheck) setSubmitted(true) // no-op guard, canCheck already gates the button
    setSubmitted(true)

    if (!phrase) return
    const correct1 = selected1 === phrase.correct_1
    const correct2 = gapCount === 2 ? selected2 === phrase.correct_2 : true
    const isFull = correct1 && correct2

    if (isFull) {
      fetch('/api/contrast-mistakes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contrast_phrase_id: phrase.id }),
      }).catch(() => {})
    } else {
      fetch('/api/contrast-mistakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contrast_phrase_id: phrase.id, battle_id: phrase.battle_id }),
      }).catch(() => {})
    }
  }

  const outcome = (() => {
    if (!phrase || !submitted) return null
    const correct1 = selected1 === phrase.correct_1
    if (gapCount === 1) return correct1 ? 'full' : 'missed'
    const correct2 = selected2 === phrase.correct_2
    if (correct1 && correct2) return 'full'
    if (correct1 || correct2) return 'half'
    return 'missed'
  })()

  const handleNext = () => {
    if (!phrase) return
    const next = progress + 1
    const newStats = { ...stats }
    if (outcome === 'full') newStats.firstTry++
    else if (outcome === 'half') newStats.halfCorrect++
    else newStats.missed++
    setStats(newStats)

    if (next >= sessionTotal) {
      const start = sessionStart.current ?? Date.now()
      const duration = Math.round((Date.now() - start) / 1000)
      const p = new URLSearchParams({
        firstTry: String(newStats.firstTry),
        halfCorrect: String(newStats.halfCorrect),
        missed: String(newStats.missed),
        duration: String(duration),
      })
      router.push(`/practice/${phrase.battle_id}/results?${p.toString()}`)
      return
    }
    setProgress(next)
    fetchPhrase()
  }

  const sentenceParts = phrase ? splitSentence(phrase.sentence, gapCount) : []

  // What each blank reads while answering (whatever the player picked) versus after submitting
  // (always the right word, so the finished sentence is one they can learn from).
  const gapValue1 = selected1 === 1 ? phrase?.option_a_1 ?? null : selected1 === 2 ? phrase?.option_b_1 ?? null : null
  const gapValue2 = selected2 === 1 ? phrase?.option_a_2 ?? null : selected2 === 2 ? phrase?.option_b_2 ?? null : null
  const correctWord1 = phrase ? (phrase.correct_1 === 1 ? phrase.option_a_1 : phrase.option_b_1) : null
  const correctWord2 = phrase ? (phrase.correct_2 === 1 ? phrase.option_a_2 : phrase.option_b_2) : null

  return (
    <div className="h-dvh overflow-hidden bg-white flex flex-col pb-0">
      <OverscrollColor top="#ffffff" bottom="#ffffff" />

      {/* Header */}
      <div className="flex flex-col gap-3 px-5 pt-8 pb-1">
        <div className="flex items-center gap-3">
          <motion.div whileTap={{ scale: 0.88 }} className="p-2 -m-2">
            <Link href="/practice">
              <ChevronRight className="w-5 h-5 text-gray-400 rotate-180" />
            </Link>
          </motion.div>
          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: meta.color }}
              animate={{ width: `${((progress + 1) / Math.max(1, sessionTotal)) * 100}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            />
          </div>
          <span className="text-xs font-bold text-gray-400">{progress + 1}/{sessionTotal}</span>
        </div>
        <div className="flex items-center justify-between pl-[1.125rem]">
          <div className="flex-1">
            <AnimatePresence>
              {submitted && (
                <motion.span
                  key="correct-label"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] font-black tracking-widest uppercase"
                  style={{ color: '#1D841D' }}
                >
                  Correct Answer
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          {!submitted && <HintToggle checked={showHints} onChange={setShowHints} />}
        </div>
      </div>

      {/* Game */}
      {/* Scrolls inside itself rather than scrolling the page — the same shape the multiplayer
          round view uses. A long two-gap phrase can outgrow a short phone no matter how far the
          UI scales down, and when the page scrolled instead, the Check button (fixed to the
          bottom) ended up sitting on top of the option cards. */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-none flex flex-col px-5 pt-6 pb-28 gap-6">
        {!loading && phrase ? (
          <>
            {/* In a mixed session each phrase comes from a different battle, so the pair of tenses
                being contrasted is named per phrase — otherwise "todo todo" gives no clue which
                tense the question is actually testing. */}
            {isMixed && (
              <div className="flex justify-center -mb-4">
                <span
                  className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                  style={{
                    backgroundColor: `${CONTRAST_META[phrase.battle_id].color}1A`,
                    color: CONTRAST_META[phrase.battle_id].color,
                  }}
                >
                  {CONTRAST_META[phrase.battle_id].label}
                </span>
              </div>
            )}

            {/* Sentence with blank(s) as real input-style boxes */}
            {/* leading-[3.2] rather than leading-relaxed: the verb label above each blank is
                absolutely positioned, so it takes up no line height of its own and would print
                over the line above whenever a blank lands on a wrapped second line. 2.6 was not
                quite enough headroom — on a two-line phrase the label still grazed the descenders
                of the line above. */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex flex-col gap-3 text-center text-base text-gray-800 leading-[3.2]">
                {gapCount === 1 ? (
                  <p className="[text-wrap:balance]">
                    {sentenceParts[0]}
                    <GapWithLabel
                      verb={phrase.infinitive_1}
                      value={submitted ? correctWord1 : gapValue1}
                      color={GAP_COLORS[1].border}
                      revealed={submitted}
                    />
                    {sentenceParts[1]}
                  </p>
                ) : (
                  <>
                    <p className="[text-wrap:balance]">
                      {sentenceParts[0]}
                      <GapWithLabel
                        verb={phrase.infinitive_1}
                        value={submitted ? correctWord1 : gapValue1}
                        color={GAP_COLORS[1].border}
                        revealed={submitted}
                      />
                      {sentenceParts[1]}
                    </p>
                    <p className="[text-wrap:balance]">
                      <GapWithLabel
                        verb={phrase.infinitive_2 ?? ''}
                        value={submitted ? correctWord2 : gapValue2}
                        color={GAP_COLORS[2].border}
                        revealed={submitted}
                      />
                      {sentenceParts[2]}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Gaps */}
            <div className={gapCount === 2 ? 'grid grid-cols-2 gap-4' : ''}>
              <ContrastGap
                optionA={swap1 ? phrase.option_b_1 : phrase.option_a_1}
                optionB={swap1 ? phrase.option_a_1 : phrase.option_b_1}
                correctOption={swap1 ? (phrase.correct_1 === 1 ? 2 : 1) : phrase.correct_1}
                selected={selected1 === null ? null : (swap1 ? (selected1 === 1 ? 2 : 1) : selected1)}
                submitted={submitted}
                showHints={showHints}
                iconA={swap1 ? icons.b : icons.a}
                iconB={swap1 ? icons.a : icons.b}
                bgColor={gapCount === 2 ? GAP_COLORS[1].bg : 'transparent'}
                accentColor={GAP_COLORS[1].border}
                onSelect={(displayOpt) => {
                  if (submitted) return
                  const real = swap1 ? (displayOpt === 1 ? 2 : 1) : displayOpt
                  setSelected1(real)
                }}
              />
              {gapCount === 2 && phrase.option_a_2 && phrase.option_b_2 && phrase.correct_2 && (
                <ContrastGap
                  optionA={swap2 ? phrase.option_b_2 : phrase.option_a_2}
                  optionB={swap2 ? phrase.option_a_2 : phrase.option_b_2}
                  correctOption={swap2 ? (phrase.correct_2 === 1 ? 2 : 1) : phrase.correct_2}
                  selected={selected2 === null ? null : (swap2 ? (selected2 === 1 ? 2 : 1) : selected2)}
                  submitted={submitted}
                  showHints={showHints}
                  iconA={swap2 ? icons.b : icons.a}
                  iconB={swap2 ? icons.a : icons.b}
                  bgColor={GAP_COLORS[2].bg}
                  accentColor={GAP_COLORS[2].border}
                  onSelect={(displayOpt) => {
                    if (submitted) return
                    const real = swap2 ? (displayOpt === 1 ? 2 : 1) : displayOpt
                    setSelected2(real)
                  }}
                />
              )}
            </div>
          </>
        ) : (
          <div className="h-[12.5rem]" />
        )}
      </div>

      {/* Buttons */}
      <div className="fixed bottom-0 left-0 right-0 flex flex-col px-5 pb-6 pt-3 gap-2">
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.button
              key="check"
              whileTap={canCheck ? { scale: 0.95 } : undefined}
              disabled={!canCheck}
              onClick={handleCheck}
              className="w-full py-4 rounded-2xl text-base font-black text-white disabled:opacity-40"
              style={{ backgroundColor: canCheck ? meta.color : '#9CA3AF' }}
            >
              Check
            </motion.button>
          ) : (
            <motion.button
              key="next"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNext}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-black text-white"
              style={{ backgroundColor: outcome === 'full' ? '#22C55E' : '#F5A623' }}
            >
              <SkipForward className="w-5 h-5 stroke-[2.5]" />
              {outcome === 'full' ? (progress + 1 >= sessionTotal ? 'Finish' : 'Next!') : 'Ok, next'}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
