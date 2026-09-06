'use client'

import { useState, useEffect, useRef, type RefObject } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, ChevronRight, RotateCw, BookOpen, CircleCheck } from 'lucide-react'
import { TENSE_META, subcategoryFor } from '@/lib/game-logic'
import { createClient } from '@/lib/supabase/client'
import { getLevelInfo, catImagePath } from '@/lib/levels'
import { resolveAvatarPath } from '@/lib/avatars'
import type { ContrastBattleId } from '@/lib/contrast-game-logic'
import OverscrollColor from '@/components/overscroll-color'

type Subcategory = { label: string; count: number; lessonId?: string }
type TenseReview = { tenseId: string; count: number; lessonId?: string; subcategories: Subcategory[] }
type ComboReview = { comboId: ContrastBattleId; label: string; characters: string[]; count: number }

// Static lesson-content mapping: which theory page backs each tense/subcategory.
// Also defines the fixed set of tenses/subcategories always shown, even with 0 mistakes,
// so the "Ver teoría" link never disappears just because there's nothing to redo.
const LESSON_ID_BY_TENSE: Record<string, string | undefined> = {
  'pretérito-perfecto': 'pretérito-perfecto',
}

// Small round character-head icons (Figma "loading" set) — one per tense character.
const HEAD_ICON_BY_CHARACTER: Record<string, string> = {
  'zas':          '/images/loading/small-loading1.png',
  'mimo':         '/images/loading/small-loading2.png',
  'javi-tostado': '/images/loading/small-loading3.png',
}
const SUBCATEGORIES_BY_TENSE: Record<string, { label: string; lessonId?: string }[]> = {
  'imperfecto': [
    { label: 'Regular', lessonId: 'imperfecto-regular' },
    { label: 'Irregular', lessonId: 'imperfecto-irregular' },
  ],
  'indefinido': [
    { label: 'Regular', lessonId: 'indefinido-regular' },
    { label: 'Semi-irregular', lessonId: 'indefinido-semi-irregular' },
    { label: 'Fully irregular', lessonId: 'indefinido-fully-irregular' },
  ],
}

type MistakeRow = { phrase_id: string; tense: string; phrase_type: string }

function groupMistakes(rows: MistakeRow[]): TenseReview[] {
  const byTense = new Map<string, Map<string, number>>()
  for (const row of rows) {
    const sub = subcategoryFor(row.tense, row.phrase_type)
    if (!byTense.has(row.tense)) byTense.set(row.tense, new Map())
    const bySub = byTense.get(row.tense)!
    bySub.set(sub, (bySub.get(sub) ?? 0) + 1)
  }

  const tenseIds = new Set([...Object.keys(TENSE_META), ...byTense.keys()])

  return [...tenseIds].map(tenseId => {
    const bySub = byTense.get(tenseId) ?? new Map<string, number>()
    const fixedSubs = SUBCATEGORIES_BY_TENSE[tenseId]
    const subcategories = fixedSubs
      ? fixedSubs.map(({ label, lessonId }) => ({ label, lessonId, count: bySub.get(label) ?? 0 }))
      : [...bySub.entries()].map(([label, count]) => ({ label, count }))

    return {
      tenseId,
      count: [...bySub.values()].reduce((s, n) => s + n, 0),
      lessonId: LESSON_ID_BY_TENSE[tenseId],
      subcategories,
    }
  })
}

const COMBO_META: Record<ContrastBattleId, { label: string; characters: string[] }> = {
  'javi-zas':      { label: 'P.Perfecto - Indefinido', characters: ['javi-tostado', 'zas'] },
  'mimo-zas':      { label: 'Imperfecto - Indefinido', characters: ['mimo', 'zas'] },
  'javi-mimo-zas': { label: 'P.Perfecto - Imperfecto - Indefinido', characters: ['javi-tostado', 'mimo', 'zas'] },
}

// Which theory lesson backs each Lío de tiempos combo — comboId itself isn't a lessonId.
const LESSON_ID_BY_COMBO: Record<ContrastBattleId, string> = {
  'javi-zas':      'perfecto-indefinido',
  'mimo-zas':      'imperfecto-indefinido',
  'javi-mimo-zas': 'perfecto-imperfecto-indefinido',
}

type ContrastMistakeRow = { contrast_phrase_id: string; battle_id: ContrastBattleId }

function groupContrastMistakes(rows: ContrastMistakeRow[]): ComboReview[] {
  const byBattle = new Map<ContrastBattleId, number>()
  for (const row of rows) {
    byBattle.set(row.battle_id, (byBattle.get(row.battle_id) ?? 0) + 1)
  }

  return (Object.keys(COMBO_META) as ContrastBattleId[]).map(comboId => ({
    comboId,
    label: COMBO_META[comboId].label,
    characters: COMBO_META[comboId].characters,
    count: byBattle.get(comboId) ?? 0,
  }))
}

function TenseReviewCard({ tense, open, onToggle }: { tense: TenseReview; open: boolean; onToggle: () => void }) {
  const meta = TENSE_META[tense.tenseId]
  const name = tense.tenseId === 'pretérito-perfecto' ? 'Pretérito Perfecto'
    : tense.tenseId.charAt(0).toUpperCase() + tense.tenseId.slice(1)

  return (
    <div className="rounded-2xl bg-white overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3.5 py-3"
      >
        <Image src={HEAD_ICON_BY_CHARACTER[meta.character]} alt="" width={28} height={28} className="object-contain shrink-0" />
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-gray-900">{name}</p>
          <p className="text-xs text-gray-400">{tense.count} mistakes</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                {tense.count > 0 ? (
                  <Link
                    href={`/escribiendo/${encodeURIComponent(tense.tenseId)}?mode=redo`}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white text-center"
                    style={{ backgroundColor: 'var(--bsp-blue)' }}
                  >
                    Redo all
                  </Link>
                ) : (
                  <span className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white text-center bg-gray-300">
                    No mistakes
                  </span>
                )}
                {tense.lessonId && (
                  <Link
                    href={`/learn/${tense.lessonId}`}
                    title="Ver teoría"
                    className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-bsp-orange text-white"
                  >
                    <BookOpen className="w-4 h-4" />
                  </Link>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                {tense.subcategories.map(sub => (
                  <div key={sub.label} className="flex items-center justify-between gap-2 rounded-xl bg-blue-50/60 px-3 py-2">
                    <span className="flex items-center gap-1.5 text-xs text-gray-600 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
                      <span className="truncate">{sub.label}</span> <span className="text-gray-400 shrink-0">· {sub.count} mistakes</span>
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {sub.count > 0 && (
                        <Link
                          href={`/escribiendo/${encodeURIComponent(tense.tenseId)}?mode=redo&subcategory=${encodeURIComponent(sub.label)}`}
                          className="flex items-center gap-1.5 rounded-full border border-blue-200 px-3.5 py-1.5 text-sm font-bold text-blue-500"
                        >
                          <RotateCw className="w-4 h-4" /> Redo
                        </Link>
                      )}
                      {sub.lessonId && (
                        <Link
                          href={`/learn/${sub.lessonId}`}
                          title="Ver teoría"
                          className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-bsp-orange text-white"
                        >
                          <BookOpen className="w-[1.125rem] h-[1.125rem]" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ComboReviewCard({ combo, open, onToggle }: { combo: ComboReview; open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-2xl bg-white overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3.5 py-3"
      >
        <div className="flex -space-x-1.5 shrink-0">
          {combo.characters.map(c => (
            <Image key={c} src={HEAD_ICON_BY_CHARACTER[c]} alt="" width={24} height={24} className="object-contain" />
          ))}
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-gray-900">{combo.label}</p>
          <p className="text-xs text-gray-400">{combo.count} mistakes</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 flex items-center gap-2">
              {combo.count > 0 ? (
                <Link
                  href={`/practice/${combo.comboId}?mode=redo`}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white text-center bg-rose-600"
                >
                  Redo all
                </Link>
              ) : (
                <span className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white text-center bg-gray-300">
                  No mistakes
                </span>
              )}
              <Link
                href={`/learn/${LESSON_ID_BY_COMBO[combo.comboId]}`}
                title="Ver teoría"
                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-bsp-orange text-white"
              >
                <BookOpen className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

type ModeMistakeStats = { total: number; cleared: number; pct: number }
type MistakeStats = { escribiendo: ModeMistakeStats; lio: ModeMistakeStats }

const EMPTY_MODE_STATS: ModeMistakeStats = { total: 0, cleared: 0, pct: 0 }

// Singleplayer only — Battle never records phrase/contrast mistakes, so it has no row here.
const MISTAKE_STAT_MODES = [
  { key: 'escribiendo', label: 'Escribiendo...', icon: '/images/profile/escribiendo.png', bar: 'bg-bsp-blue' },
  { key: 'lio',         label: 'Lío de tiempos', icon: '/images/profile/lio.png',         bar: 'bg-rose-500' },
] as const

// Both modes as one figure. Summed from the raw counts rather than averaging the two
// percentages: a mode with 2 mistakes must not weigh the same as one with 200.
function combinedStats(stats: MistakeStats): ModeMistakeStats {
  const total   = stats.escribiendo.total   + stats.lio.total
  const cleared = stats.escribiendo.cleared + stats.lio.cleared
  return { total, cleared, pct: total === 0 ? 0 : Math.round((cleared / total) * 100) }
}

// `highlight` marks the combined total: no mode icon, and a border instead of the flat fill
// so it reads as a summary of the rows above rather than a third mode.
function ModeStatsRow({ label, icon, bar, stats, highlight = false }: {
  label: string
  icon?: string
  bar: string
  stats: ModeMistakeStats
  highlight?: boolean
}) {
  return (
    <div className={`flex flex-col gap-2 rounded-2xl px-3.5 py-3 ${highlight ? 'border border-gray-200' : 'bg-gray-50'}`}>
      <div className="flex items-center gap-2">
        {icon
          ? <Image src={icon} alt="" width={20} height={20} className="object-contain shrink-0" />
          : <CircleCheck className="w-5 h-5 text-gray-400 shrink-0" />}
        <span className="flex-1 text-sm font-bold text-gray-900">{label}</span>
        <span className="text-sm font-black text-gray-900">{stats.pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${stats.pct}%` }} />
      </div>
      <div className="flex items-center gap-3 text-[11px] text-gray-500">
        <span><span className="font-bold text-gray-700">{stats.total}</span> total mistakes</span>
        <span className="text-gray-300">·</span>
        <span><span className="font-bold text-gray-700">{stats.cleared}</span> cleared</span>
      </div>
    </div>
  )
}

function MistakesClearedPanel({ stats, open, onToggle }: {
  stats: MistakeStats | null
  open: boolean
  onToggle: () => void
}) {
  // Same figure drives the collapsed button and the "Both modes" row below, so they can
  // never disagree.
  const combined = stats ? combinedStats(stats) : EMPTY_MODE_STATS

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-2.5 px-3.5 py-3">
        <CircleCheck className="w-4 h-4 text-gray-400 shrink-0" />
        <span className="flex-1 text-left text-sm font-semibold text-gray-600">Mistakes cleared</span>
        {stats && <span className="text-xs text-gray-400">{combined.pct}%</span>}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 flex flex-col gap-2">
              {MISTAKE_STAT_MODES.map(mode => (
                <ModeStatsRow
                  key={mode.key}
                  label={mode.label}
                  icon={mode.icon}
                  bar={mode.bar}
                  stats={stats?.[mode.key] ?? EMPTY_MODE_STATS}
                />
              ))}
              <ModeStatsRow label="Total" bar="bg-gray-700" stats={combined} highlight />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const OPEN_REVIEW_CARD_KEY = 'bsp:review:openCard'

export default function LearnLandingPage() {
  const [streak, setStreak] = useState(0)
  const [level, setLevel] = useState(1)
  const [avatar, setAvatar] = useState('/images/nav/user-image.svg')

  // Which single Review card (Escribiendo tense or Lío combo) is expanded.
  // Persisted so it survives navigating away to redo mistakes / a lesson and back.
  //
  // Seeded lazily from sessionStorage instead of in an effect: the initialiser runs once, on
  // the client only, so the restored card is present in the very first client render — no
  // setState-in-effect and no extra render pass. `typeof window` guards the server render,
  // where sessionStorage does not exist.
  const [openCard, setOpenCard] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : sessionStorage.getItem(OPEN_REVIEW_CARD_KEY)
  )
  const toggleCard = (id: string) => {
    setOpenCard(prev => {
      const next = prev === id ? null : id
      if (next) sessionStorage.setItem(OPEN_REVIEW_CARD_KEY, next)
      else sessionStorage.removeItem(OPEN_REVIEW_CARD_KEY)
      return next
    })
  }
  const escribiendoSectionRef = useRef<HTMLDivElement>(null)
  const lioSectionRef = useRef<HTMLDivElement>(null)
  const pendingScrollRef = useRef<RefObject<HTMLDivElement | null> | null>(null)

  const openCardAndScrollTo = (id: string, sectionRef: RefObject<HTMLDivElement | null>) => {
    setOpenCard(id)
    sessionStorage.setItem(OPEN_REVIEW_CARD_KEY, id)
    // If another card is currently open, it needs to finish collapsing (motion
    // exit animation, ~200ms) before the target section's position settles —
    // scrolling immediately would aim at a spot that's still shifting.
    pendingScrollRef.current = sectionRef
  }
  useEffect(() => {
    const sectionRef = pendingScrollRef.current
    if (!sectionRef) return
    pendingScrollRef.current = null
    const timer = setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 220)
    return () => clearTimeout(timer)
  }, [openCard])

  const [escribiendoReview, setEscribiendoReview] = useState<TenseReview[]>([])
  const [lioReview, setLioReview] = useState<ComboReview[]>(
    (Object.keys(COMBO_META) as ContrastBattleId[]).map(comboId => ({
      comboId, label: COMBO_META[comboId].label, characters: COMBO_META[comboId].characters, count: 0,
    }))
  )

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('streak, total_xp, avatar_id').eq('id', user.id).single()
        .then(({ data }) => {
          if (!data) return
          setStreak(data.streak)
          const info = getLevelInfo(data.total_xp)
          setLevel(info.level)
          setAvatar(resolveAvatarPath(data.avatar_id, catImagePath(info.cat)))
        })
    })
  }, [])

  useEffect(() => {
    fetch('/api/mistakes')
      .then(r => r.json())
      .then((json: { data?: MistakeRow[] }) => setEscribiendoReview(groupMistakes(json.data ?? [])))
      .catch(() => {})
  }, [])

  const [mistakeStats, setMistakeStats] = useState<MistakeStats | null>(null)
  const [statsOpen, setStatsOpen] = useState(false)

  useEffect(() => {
    fetch('/api/mistakes/stats')
      .then(r => r.json())
      .then((json: { data?: MistakeStats }) => setMistakeStats(json.data ?? null))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/contrast-mistakes')
      .then(r => r.json())
      .then((json: { data?: ContrastMistakeRow[] }) => setLioReview(groupContrastMistakes(json.data ?? [])))
      .catch(() => {})
  }, [])

  const escribiendoTotal = escribiendoReview.reduce((s, t) => s + t.count, 0)
  const lioTotal = lioReview.reduce((s, c) => s + c.count, 0)

  const goToTopEscribiendoMistake = () => {
    if (escribiendoTotal === 0) return
    const top = escribiendoReview.reduce((a, b) => (b.count > a.count ? b : a))
    openCardAndScrollTo(`escribiendo:${top.tenseId}`, escribiendoSectionRef)
  }
  const goToTopLioMistake = () => {
    if (lioTotal === 0) return
    const top = lioReview.reduce((a, b) => (b.count > a.count ? b : a))
    openCardAndScrollTo(`lio:${top.comboId}`, lioSectionRef)
  }

  return (
    <div className="flex flex-col flex-1">
      <OverscrollColor top="#2F54BA" bottom="#ffffff" />

      {/* Header */}
      <div className="bg-bsp-blue px-5 sm:px-[26%] pt-8 pb-12">
        <div className="flex items-center justify-between mb-3">
          <Link href="/profile" className="relative w-9 h-9 shrink-0">
            <Image src={avatar} alt="Avatar" fill sizes="36px" className="object-contain" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1">
              <Image src="/images/home/fxemoji_fire.svg" alt="Racha" width={16} height={16} />
              <span className="text-white text-xs font-semibold">{streak}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1">
              <Image src="/images/home/streamline-plump-color_star-circle-flat.svg" alt="Nivel" width={16} height={16} />
              <span className="text-white text-xs font-semibold">Lvl {level}.</span>
            </div>
          </div>
        </div>
        <h1 className="text-center text-3xl font-black text-white tracking-tight">Review</h1>
        <p className="text-center text-sm text-white/70 mt-1">Redo your mistakes to clear them!</p>
      </div>

      {/* Wave */}
      <div className="bg-bsp-blue -mb-px">
        <svg viewBox="0 0 402 36" preserveAspectRatio="none" className="w-full block h-9">
          <path d="M0,0 C67,36 134,0 201,18 C268,36 335,0 402,18 L402,36 L0,36 Z" fill="#FFFFFF" />
        </svg>
      </div>

      {/* Content */}
      <div className="bg-white flex-1 pt-4 pb-2 px-5 sm:px-[26%] flex flex-col gap-8">

        {/* Stat pills */}
        <div className="flex gap-3 -mt-14">
          <motion.button
            whileTap={{ scale: escribiendoTotal > 0 ? 0.97 : 1 }}
            onClick={goToTopEscribiendoMistake}
            disabled={escribiendoTotal === 0}
            className="flex-1 flex items-center gap-2.5 rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3.5 text-left disabled:cursor-default"
          >
            <Image src="/images/profile/escribiendo.png" alt="" width={32} height={32} className="object-contain" />
            <div>
              <p className="text-xl font-black text-bsp-blue leading-none">{escribiendoTotal}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">review items</p>
            </div>
          </motion.button>
          <motion.button
            whileTap={{ scale: lioTotal > 0 ? 0.97 : 1 }}
            onClick={goToTopLioMistake}
            disabled={lioTotal === 0}
            className="flex-1 flex items-center gap-2.5 rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3.5 text-left disabled:cursor-default"
          >
            <Image src="/images/profile/lio.png" alt="" width={32} height={32} className="object-contain" />
            <div>
              <p className="text-xl font-black text-rose-500 leading-none">{lioTotal}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">review items</p>
            </div>
          </motion.button>
        </div>

        {/* Escribiendo section */}
        <div ref={escribiendoSectionRef} className="flex flex-col gap-4 scroll-mt-6">
          <div className="flex items-center justify-center gap-2">
            <Image src="/images/profile/escribiendo.png" alt="" width={22} height={22} className="object-contain" />
            <h2 className="text-base font-black text-gray-900">Escribiendo...</h2>
          </div>
          <div className="rounded-3xl p-4 flex flex-col gap-6" style={{ backgroundColor: '#E4E9FA' }}>
            <div className="flex flex-col gap-6">
              {escribiendoReview.map(t => (
                <TenseReviewCard
                  key={t.tenseId}
                  tense={t}
                  open={openCard === `escribiendo:${t.tenseId}`}
                  onToggle={() => toggleCard(`escribiendo:${t.tenseId}`)}
                />
              ))}
            </div>
            {escribiendoTotal > 0 ? (
              <Link
                href="/escribiendo/mixed?mode=redo"
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-white"
                style={{ backgroundColor: 'var(--bsp-blue)' }}
              >
                <span className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <RotateCw className="w-4 h-4" />
                  </span>
                  <span className="text-left">
                    <span className="block text-sm font-black">Redo all mistakes</span>
                    <span className="block text-xs text-white/70">{escribiendoTotal} mistakes · mixed session</span>
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 shrink-0" />
              </Link>
            ) : (
              <div className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-white bg-gray-300">
                <span className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <RotateCw className="w-4 h-4" />
                  </span>
                  <span className="text-left">
                    <span className="block text-sm font-black">Redo all mistakes</span>
                    <span className="block text-xs text-white/70">No mistakes yet</span>
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Lío de tiempos section */}
        <div ref={lioSectionRef} className="flex flex-col gap-4 scroll-mt-6">
          <div className="flex items-center justify-center gap-2">
            <Image src="/images/profile/lio.png" alt="" width={22} height={22} className="object-contain" />
            <h2 className="text-base font-black text-gray-900">Lío de tiempos</h2>
          </div>
          <div className="rounded-3xl p-4 flex flex-col gap-6" style={{ backgroundColor: '#F4DCE1' }}>
            <div className="flex flex-col gap-6">
              {lioReview.map(c => (
                <ComboReviewCard
                  key={c.comboId}
                  combo={c}
                  open={openCard === `lio:${c.comboId}`}
                  onToggle={() => toggleCard(`lio:${c.comboId}`)}
                />
              ))}
            </div>
            {lioTotal > 0 ? (
              <Link href="/practice/mixed?mode=redo" className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-white bg-rose-600">
                <span className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <RotateCw className="w-4 h-4" />
                  </span>
                  <span className="text-left">
                    <span className="block text-sm font-black">Redo all mistakes</span>
                    <span className="block text-xs text-white/70">{lioTotal} mistakes · mixed session</span>
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 shrink-0" />
              </Link>
            ) : (
              <div className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-white bg-gray-300">
                <span className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <RotateCw className="w-4 h-4" />
                  </span>
                  <span className="text-left">
                    <span className="block text-sm font-black">Redo all mistakes</span>
                    <span className="block text-xs text-white/70">No mistakes yet</span>
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Mistakes cleared — cumulative clear rate per singleplayer mode, plus both combined */}
        <MistakesClearedPanel
          stats={mistakeStats}
          open={statsOpen}
          onToggle={() => setStatsOpen(v => !v)}
        />
      </div>
    </div>
  )
}
