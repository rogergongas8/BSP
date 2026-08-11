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
import { CONTRAST_ICON, CONTRAST_META, GAP_COLORS, isContrastBattle, phraseGapCount, type ContrastBattleId, type ContrastPhrase } from '@/lib/contrast-game-logic'

const SESSION_TOTAL = 10

function PlaceholderComingSoon({ battle }: { battle: BattleItem }) {
  const router = useRouter()
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
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

/** Infinitive label, centered above its whole sentence line (not just the box), per Figma. */
function GapLabel({ verb }: { verb: string }) {
  return (
    <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1 inline-block border-b border-dotted border-gray-300 pb-0.5">
      {verb}
    </p>
  )
}

/** Inline bordered input-style box for a blank, filled in once an option is selected. */
function GapBox({ value, color }: { value: string | null; color: string }) {
  return (
    <span
      className="inline-flex min-w-[70px] min-h-[36px] mx-1 px-3 items-center justify-center rounded-lg border-2 align-middle text-center font-bold text-gray-900 whitespace-nowrap"
      style={{ borderColor: color }}
    >
      {value}
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

  return (
    <div className="min-h-screen bg-white flex flex-col pb-0">
      <OverscrollColor top="#ffffff" bottom="#ffffff" />

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-10 pb-4">
        <motion.div whileTap={{ scale: 0.88 }} className="p-2 -m-2">
          <Link href="/practice">
            <ChevronRight className="w-5 h-5 text-gray-400 rotate-180" />
          </Link>
        </motion.div>
        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: meta.color }}
            animate={{ width: `${((progress + 1) / SESSION_TOTAL) * 100}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          />
        </div>
        <span className="text-xs font-bold text-gray-400">{progress + 1}/{SESSION_TOTAL}</span>
        <HintToggle checked={showHints} onChange={setShowHints} />
      </div>

      {/* Game */}
      <div className="flex-1 flex flex-col px-5 pt-8 pb-28 gap-8">
        {!loading && phrase ? (
          <>
            {/* Sentence with blank(s) as real input-style boxes */}
            <div className="flex flex-col gap-3 text-center text-base text-gray-800 leading-relaxed">
              {gapCount === 1 ? (
                <div>
                  <GapLabel verb={phrase.infinitive_1} />
                  <p className="[text-wrap:balance]">
                    {sentenceParts[0]}
                    <GapBox
                      value={selected1 === 1 ? phrase.option_a_1 : selected1 === 2 ? phrase.option_b_1 : null}
                      color={GAP_COLORS[1].border}
                    />
                    {sentenceParts[1]}
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <GapLabel verb={phrase.infinitive_1} />
                    <p className="[text-wrap:balance]">
                      {sentenceParts[0]}
                      <GapBox
                        value={selected1 === 1 ? phrase.option_a_1 : selected1 === 2 ? phrase.option_b_1 : null}
                        color={GAP_COLORS[1].border}
                      />
                      {sentenceParts[1]}
                    </p>
                  </div>
                  <div>
                    <GapLabel verb={phrase.infinitive_2 ?? ''} />
                    <p className="[text-wrap:balance]">
                      <GapBox
                        value={selected2 === 1 ? phrase.option_a_2 : selected2 === 2 ? phrase.option_b_2 : null}
                        color={GAP_COLORS[2].border}
                      />
                      {sentenceParts[2]}
                    </p>
                  </div>
                </>
              )}
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
                bgColor={GAP_COLORS[1].bg}
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
          <div className="h-[200px]" />
        )}
      </div>

      {/* Buttons */}
      <div className="fixed bottom-0 left-0 right-0 flex flex-col px-5 pb-6 pt-3 bg-white gap-2">
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
              {outcome === 'full' ? (progress + 1 >= SESSION_TOTAL ? 'Finish' : 'Next!') : 'Ok, next'}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
