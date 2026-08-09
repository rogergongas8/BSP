'use client'

import { use, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'motion/react'
import { CheckCircle2 } from 'lucide-react'
import { TENSE_META, resolveTenseId } from '@/lib/game-logic'

const XP_AT_100: Record<string, number> = {
  'indefinido':          30,
  'imperfecto':          25,
  'pretérito-perfecto':  25,
}

const SCORE_WEIGHTS = { firstTry: 10, fixed: 8, withHints: 6, skipped: 0 }

const CONFETTI_PIECES = [
  { x: 12, y: 18, r: -20, color: '#F5A623', w: 14, h: 8 },
  { x: 72, y: 10, r: 15,  color: '#E8922A', w: 10, h: 6 },
  { x: 88, y: 25, r: -35, color: '#FBBF24', w: 12, h: 7 },
  { x: 5,  y: 40, r: 10,  color: '#C85C6E', w: 8,  h: 8 },
  { x: 60, y: 5,  r: 25,  color: '#F5A623', w: 16, h: 6 },
  { x: 30, y: 8,  r: -10, color: '#FBBF24', w: 10, h: 5 },
  { x: 80, y: 50, r: 40,  color: '#E8922A', w: 8,  h: 10 },
  { x: 20, y: 55, r: -30, color: '#C85C6E', w: 6,  h: 6 },
]

function CircleProgress({ pct, color, character }: { pct: number; color: string; character: string }) {
  const R = 75
  const C = 2 * Math.PI * R
  const pathRef = useRef<SVGCircleElement>(null)

  useEffect(() => {
    if (!pathRef.current) return
    pathRef.current.style.strokeDashoffset = String(C * (1 - pct / 100))
  }, [pct, C])

  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
      <svg width="180" height="180" className="-rotate-90">
        <circle cx="90" cy="90" r={R} fill="none" stroke="#E5E7EB" strokeWidth="13" />
        <circle
          ref={pathRef}
          cx="90" cy="90" r={R}
          fill="none"
          stroke={color}
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-tight">
        <span className="text-4xl font-black text-gray-900">{pct}<span className="text-xl">%</span></span>
        <span className="text-sm font-semibold text-gray-400">
          {Math.round((pct / 100) * (XP_AT_100[character] ?? 25))} XP
        </span>
      </div>
      {/* Character overlapping ring */}
      <div className="absolute -right-10 -bottom-3 pointer-events-none">
        <Image src={`/images/escribiendo/${character}.png`} width={110} height={110} alt="" className="drop-shadow-lg" />
      </div>
    </div>
  )
}

const STAT_ROWS = [
  { key: 'firstTry',  label: 'First try',    color: '#22C55E' },
  { key: 'fixed',     label: 'Fixed',         color: '#F5A623' },
  { key: 'withHints', label: 'With hints',    color: '#4A5BB5' },
  { key: 'skipped',   label: 'Skipped',       color: '#F87171' },
] as const

export default function ResultsPage({ params }: { params: Promise<{ tenseId: string }> }) {
  const { tenseId: rawTenseId } = use(params)
  const tenseId = resolveTenseId(rawTenseId) ?? rawTenseId
  const router = useRouter()
  const searchParams = useSearchParams()
  const meta = TENSE_META[tenseId] ?? TENSE_META['indefinido']

  const firstTry  = Number(searchParams.get('firstTry')  ?? 0)
  const fixed     = Number(searchParams.get('fixed')     ?? 0)
  const withHints = Number(searchParams.get('withHints') ?? 0)
  const skipped   = Number(searchParams.get('skipped')   ?? 0)
  const duration  = Number(searchParams.get('duration')  ?? 0)
  const total     = firstTry + fixed + withHints + skipped

  const savedRef = useRef(false)
  useEffect(() => {
    if (savedRef.current || total === 0) return
    savedRef.current = true
    fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tense: meta.tense, total, first_try: firstTry, with_hints: withHints, skipped, duration_seconds: duration }),
    })
      .then(r => r.json())
      .then(json => {
        if (json.newAchievements?.length > 0 || json.leveledUp) {
          sessionStorage.setItem('bsp_session_result', JSON.stringify({
            newAchievements: json.newAchievements ?? [],
            leveledUp:       json.leveledUp ?? false,
            newLevel:        json.newLevel ?? 1,
          }))
        }
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const rawScore = total > 0
    ? (firstTry * SCORE_WEIGHTS.firstTry + fixed * SCORE_WEIGHTS.fixed + withHints * SCORE_WEIGHTS.withHints) / (total * 10) * 100
    : 0
  const scorePct = Math.round(rawScore)


  const stats = { firstTry, fixed, withHints, skipped }

  const tenseLabel: Record<string, string> = {
    'indefinido': 'Escribiendo...',
    'imperfecto': 'Escribiendo...',
    'pretérito-perfecto': 'Escribiendo...',
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* Blue header */}
      <div className="relative overflow-hidden" style={{ backgroundColor: meta.color, paddingBottom: 32 }}>
        {/* Confetti */}
        {CONFETTI_PIECES.map((p, i) => {
          const duration = 2.2 + (i % 4) * 0.45
          return (
            <motion.div
              key={i}
              className="absolute rounded-sm"
              style={{ left: `${p.x}%`, top: p.y, width: p.w, height: p.h, backgroundColor: p.color }}
              initial={{ opacity: 0, y: -20, rotate: p.r }}
              animate={{
                opacity: [0, 1, 1, 0.85, 0],
                y: [-20, 0, 20, 50, 85],
                rotate: [p.r - 10, p.r, p.r + 90, p.r + 220, p.r + 360],
              }}
              transition={{
                delay: i * 0.12,
                duration,
                repeat: Infinity,
                ease: 'easeIn',
              }}
            />
          )
        })}

        <div className="pt-10 pb-2 flex flex-col items-center">
          <motion.h1
            className="text-2xl font-black text-white"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          >
            {tenseLabel[tenseId] ?? 'Escribiendo...'}
          </motion.h1>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 402 32" preserveAspectRatio="none" className="w-full block h-8" style={{ color: '#F9FAFB' }}>
            <path d="M0,16 C67,32 134,0 201,16 C268,32 335,0 402,16 L402,32 L0,32 Z" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-6 pt-4 pb-28 gap-4">

        {/* Circle + XP */}
        <div className="flex justify-center pt-1 pb-3">
          <CircleProgress pct={scorePct} color={meta.color} character={meta.character} />
        </div>

        {/* Stats list */}
        <div className="flex flex-col divide-y divide-gray-100">
          {STAT_ROWS.map(({ key, label, color }) => (
            <motion.div
              key={key}
              className="flex items-center gap-3 py-2.5"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + STAT_ROWS.findIndex(r => r.key === key) * 0.08 }}
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="flex-1 text-sm text-gray-700">{label}</span>
              <span className="text-sm font-bold text-gray-900">{stats[key]}</span>
            </motion.div>
          ))}
        </div>

        {/* Review banner */}
        <motion.div
          className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        >
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
          <p className="text-sm text-green-800">
            Review your mistakes in the <strong>Review</strong> section!
          </p>
        </motion.div>

      </div>

      {/* Fin button — fixed above keyboard */}
      <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-3 bg-gray-50">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push('/')}
          className="w-full py-4 rounded-2xl text-base font-black text-white"
          style={{ backgroundColor: meta.color }}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
        >
          ¡Fin!
        </motion.button>
      </div>
    </div>
  )
}
