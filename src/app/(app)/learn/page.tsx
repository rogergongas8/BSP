'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, ChevronRight, RotateCw, BookOpen } from 'lucide-react'
import { TENSE_META } from '@/lib/game-logic'
import { createClient } from '@/lib/supabase/client'
import { getLevelInfo, catImagePath } from '@/lib/levels'
import OverscrollColor from '@/components/overscroll-color'

// TODO: placeholder counts — replace with real mistake-tracking once that
// feature exists (a table recording incorrect answers per session).
type Subcategory = { label: string; count: number; lessonId?: string }
type TenseReview = { tenseId: string; count: number; lessonId?: string; subcategories: Subcategory[] }
type ComboReview = { comboId: string; label: string; characters: string[]; count: number }

const ESCRIBIENDO_REVIEW: TenseReview[] = [
  {
    tenseId: 'pretérito-perfecto', count: 12, lessonId: 'pretérito-perfecto',
    subcategories: [{ label: 'Regular', count: 3 }, { label: 'Irregular', count: 9 }],
  },
  {
    tenseId: 'imperfecto', count: 5,
    subcategories: [
      { label: 'Regular', count: 3, lessonId: 'imperfecto-regular' },
      { label: 'Irregular', count: 2, lessonId: 'imperfecto-irregular' },
    ],
  },
  {
    tenseId: 'indefinido', count: 24,
    subcategories: [
      { label: 'Regular', count: 7, lessonId: 'indefinido-regular' },
      { label: 'Fully irregular', count: 5, lessonId: 'indefinido-fully-irregular' },
      { label: 'Semi-irregular', count: 12, lessonId: 'indefinido-semi-irregular' },
    ],
  },
]

const LIO_REVIEW: ComboReview[] = [
  { comboId: 'perfecto-indefinido', label: 'P.Perfecto - Indefinido', characters: ['javi-tostado', 'zas'], count: 3 },
  { comboId: 'imperfecto-indefinido', label: 'Imperfecto - Indefinido', characters: ['mimo', 'zas'], count: 17 },
  { comboId: 'perfecto-imperfecto-indefinido', label: 'P.Perfecto - Imperfecto - Indefinido', characters: ['javi-tostado', 'mimo', 'zas'], count: 9 },
]

const ESCRIBIENDO_TOTAL = ESCRIBIENDO_REVIEW.reduce((s, t) => s + t.count, 0)
const LIO_TOTAL = LIO_REVIEW.reduce((s, t) => s + t.count, 0)

function TenseReviewCard({ tense }: { tense: TenseReview }) {
  const [open, setOpen] = useState(false)
  const meta = TENSE_META[tense.tenseId]
  const name = tense.tenseId === 'pretérito-perfecto' ? 'Pretérito Perfecto'
    : tense.tenseId.charAt(0).toUpperCase() + tense.tenseId.slice(1)

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-3.5 py-3"
      >
        <Image src={`/images/escribiendo/${meta.character}.png`} alt="" width={32} height={32} className="rounded-full object-contain shrink-0" />
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
                <button
                  title="Próximamente"
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: 'var(--bsp-blue)' }}
                >
                  Redo all
                </button>
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
                  <div key={sub.label} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2">
                    <span className="flex items-center gap-1.5 text-xs text-gray-600 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
                      <span className="truncate">{sub.label}</span> <span className="text-gray-400 shrink-0">· {sub.count} mistakes</span>
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button title="Próximamente" className="flex items-center gap-1 rounded-full border border-blue-200 px-2.5 py-1 text-xs font-bold text-blue-500">
                        <RotateCw className="w-3 h-3" /> Redo
                      </button>
                      {sub.lessonId && (
                        <Link
                          href={`/learn/${sub.lessonId}`}
                          title="Ver teoría"
                          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-bsp-orange text-white"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
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

function ComboReviewCard({ combo }: { combo: ComboReview }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-rose-100 bg-rose-50/60 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-3.5 py-3"
      >
        <div className="flex -space-x-2 shrink-0">
          {combo.characters.map(c => (
            <Image key={c} src={`/images/escribiendo/${c}.png`} alt="" width={28} height={28} className="rounded-full object-contain" />
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
              <button
                title="Próximamente"
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-600"
              >
                Redo all
              </button>
              <Link
                href={`/learn/${combo.comboId}`}
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

export default function LearnLandingPage() {
  const [streak, setStreak] = useState(0)
  const [level, setLevel] = useState(1)
  const [avatar, setAvatar] = useState('/images/nav/user-image.svg')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('streak, total_xp').eq('id', user.id).single()
        .then(({ data }) => {
          if (!data) return
          setStreak(data.streak)
          const info = getLevelInfo(data.total_xp)
          setLevel(info.level)
          setAvatar(catImagePath(info.cat))
        })
    })
  }, [])

  return (
    <div className="flex flex-col min-h-dvh">
      <OverscrollColor top="#2F54BA" bottom="#ffffff" />

      {/* Header */}
      <div className="bg-bsp-blue px-5 pt-8 pb-12">
        <div className="flex items-center justify-between mb-3">
          <Image src={avatar} alt="Avatar" width={36} height={36} className="rounded-full object-contain" />
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
        <motion.div whileTap={{ scale: 0.9 }} className="mb-2 w-fit">
          <Link href="/" className="flex items-center gap-1 text-white/80 text-xs font-semibold">
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            Back
          </Link>
        </motion.div>
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
      <div className="bg-white flex-1 pt-4 pb-24 px-5 flex flex-col gap-8">

        {/* Stat pills */}
        <div className="flex gap-3 -mt-14">
          <div className="flex-1 flex items-center gap-2.5 rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3.5">
            <Image src="/images/profile/escribiendo.png" alt="" width={32} height={32} className="object-contain" />
            <div>
              <p className="text-xl font-black text-bsp-blue leading-none">{ESCRIBIENDO_TOTAL}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">review items</p>
            </div>
          </div>
          <div className="flex-1 flex items-center gap-2.5 rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3.5">
            <Image src="/images/profile/lio.png" alt="" width={32} height={32} className="object-contain" />
            <div>
              <p className="text-xl font-black text-rose-500 leading-none">{LIO_TOTAL}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">review items</p>
            </div>
          </div>
        </div>

        {/* Escribiendo section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Image src="/images/profile/escribiendo.png" alt="" width={22} height={22} className="object-contain" />
            <h2 className="text-base font-black text-gray-900">Escribiendo...</h2>
          </div>
          <div className="flex flex-col gap-2.5">
            {ESCRIBIENDO_REVIEW.map(t => <TenseReviewCard key={t.tenseId} tense={t} />)}
          </div>
          <button title="Próximamente" className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-white" style={{ backgroundColor: 'var(--bsp-blue)' }}>
            <span className="flex items-center gap-2 text-sm font-black">
              <RotateCw className="w-4 h-4" /> Redo all mistakes
            </span>
            <span className="text-xs text-white/70">{ESCRIBIENDO_TOTAL} mistakes · mixed session</span>
          </button>
        </div>

        {/* Lío de tiempos section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Image src="/images/profile/lio.png" alt="" width={22} height={22} className="object-contain" />
            <h2 className="text-base font-black text-gray-900">Lío de tiempos</h2>
          </div>
          <div className="flex flex-col gap-2.5">
            {LIO_REVIEW.map(c => <ComboReviewCard key={c.comboId} combo={c} />)}
          </div>
          <button title="Próximamente" className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-white bg-rose-600">
            <span className="flex items-center gap-2 text-sm font-black">
              <RotateCw className="w-4 h-4" /> Redo all mistakes
            </span>
            <span className="text-xs text-white/70">{LIO_TOTAL} mistakes · mixed session</span>
          </button>
        </div>
      </div>
    </div>
  )
}
