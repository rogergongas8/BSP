'use client'

import { use, useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { X, ChevronRight, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
  correct_answer: string
  my_answer: string | null
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

type Round = {
  id: string
  room_id: string
  round_number: number
  status: 'pending' | 'active' | 'collecting' | 'results' | 'scoreboard' | 'done'
  started_at: string | null
  duration_seconds: number
  phrase_id: string
  phrases: {
    id: string
    verb: string
    sentence: string
    answer: string
  }
}

type GamePhase =
  | { type: 'loading' }
  | { type: 'active'; round: Round; secondsLeft: number }
  | { type: 'collecting'; round: Round; answeredCount: number; totalCount: number }
  | { type: 'results'; round: Round; results: RoundResults }
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

// ─── Active phase ─────────────────────────────────────────────────────────────

function ActiveView({
  round, secondsLeft, onAnswer, onTimerEnd,
}: {
  round: Round
  secondsLeft: number
  onAnswer: (ans: string) => void
  onTimerEnd: () => void
}) {
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerEndedRef = useRef(false)

  useEffect(() => {
    if (secondsLeft <= 0 && !timerEndedRef.current) {
      timerEndedRef.current = true
      onTimerEnd()
    }
  }, [secondsLeft, onTimerEnd])

  const handleSubmit = () => {
    if (!input.trim() || submitted) return
    setSubmitted(true)
    onAnswer(input.trim())
  }

  const [before, after] = round.phrases.sentence.split('___')
  const beforeWords = (before ?? '').trim().split(/\s+/).filter(Boolean)
  const afterWords = (after ?? '').trim().split(/\s+/).filter(Boolean)

  return (
    <div className="flex-1 flex flex-col">
      {/* Phrase */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        <div className="flex flex-wrap items-end justify-center gap-x-2 gap-y-3">
          {beforeWords.map((w, i) => (
            <span key={`b${i}`} className="text-gray-700 font-medium text-sm">{w}</span>
          ))}
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] font-black tracking-widest uppercase text-blue-600">
              {round.phrases.verb}
            </span>
            <input
              ref={inputRef}
              autoFocus
              value={submitted ? '' : input}
              onChange={e => !submitted && setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              disabled={submitted}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-form-type="other"
              inputMode="text"
              placeholder=""
              className="border-2 rounded-xl px-3 py-1.5 text-center font-medium outline-none text-base transition-all duration-200 disabled:opacity-50"
              style={{
                minWidth: 80,
                width: Math.max(80, Math.max(input.length, 8) * 11 + 36),
                borderColor: submitted ? '#22C55E' : '#3B82F6',
                color: '#3B82F6',
              }}
            />
          </div>
          {afterWords.map((w, i) => (
            <span key={`a${i}`} className="text-gray-700 font-medium text-sm">{w}</span>
          ))}
        </div>
      </div>

      {/* Go button */}
      {!submitted && input.trim().length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-5 pb-4"
        >
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleSubmit}
            className="w-full py-3.5 rounded-2xl font-black text-white text-sm tracking-wider uppercase"
            style={{ backgroundColor: '#3B82F6' }}
          >
            go
          </motion.button>
        </motion.div>
      )}

      {submitted && (
        <div className="px-5 pb-4">
          <div className="w-full py-3.5 rounded-2xl text-center text-sm font-bold text-green-600 bg-green-50 border border-green-200">
            Answer submitted — waiting for others
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Collecting phase ─────────────────────────────────────────────────────────

function CollectingView({
  answeredCount, totalCount, isHost, onSkip,
}: {
  answeredCount: number
  totalCount: number
  isHost: boolean
  onSkip: () => void
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Image src="/images/loading/small-loading2.png" width={80} height={80} alt="" draggable={false} />
      </motion.div>
      <div className="text-center">
        <p className="text-sm font-bold text-gray-700">Collecting answers...</p>
        <p className="text-xs text-gray-400 mt-1">{answeredCount}/{totalCount}</p>
      </div>
      {isHost && (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onSkip}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl border-2 border-gray-200 text-sm font-bold text-gray-700"
        >
          Skip to next question
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  )
}

// ─── Results phase ────────────────────────────────────────────────────────────

function ResultsView({
  results, isHost, onNext,
}: {
  results: RoundResults
  isHost: boolean
  onNext: () => void
}) {
  const checks = validationToChecks(results.my_validation_status)
  const correctRatio = results.total_count > 0 ? results.correct_count / results.total_count : 0

  return (
    <div className="flex-1 flex flex-col px-5 pt-4 pb-6 gap-4 overflow-y-auto">
      {/* Correct answer card */}
      <div className="bg-white rounded-2xl p-4 border-2 border-green-200">
        <p className="text-[10px] font-black tracking-widest uppercase text-green-600 mb-3">
          Correct Answer
        </p>
        <div className="flex items-start gap-4">
          {/* The word */}
          <div
            className="flex-1 rounded-xl py-3 px-4 text-center text-lg font-black border-2"
            style={{ borderColor: '#22C55E', color: '#16A34A', backgroundColor: '#F0FDF4' }}
          >
            {results.correct_answer}
          </div>
          {/* Checkmarks */}
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
            <div
              className="bg-red-300 rounded-r-lg flex-1 transition-all duration-700"
            />
          )}
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-gray-400 font-medium">
          <span>{results.correct_count} correct</span>
          <span>{results.total_count - results.correct_count} incorrect</span>
        </div>
      </div>

      {/* Position info */}
      <div className="text-center text-sm text-gray-600 font-medium px-2">
        {results.my_rank === 1
          ? 'You are in the lead!'
          : `You are on the ${ordinal(results.my_rank)} position, ${results.points_behind} points behind ${results.player_ahead_name}`
        }
      </div>

      {/* Points earned pill */}
      {results.my_points > 0 && (
        <div className="flex justify-center">
          <div className="bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-sm font-bold">
            +{results.my_points} pts
          </div>
        </div>
      )}

      {isHost && (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onNext}
          className="mt-auto flex items-center justify-center gap-2 w-full py-4 rounded-2xl border-2 border-gray-200 font-black text-sm text-gray-800 tracking-wider uppercase"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  )
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

  return (
    <div className="flex-1 flex flex-col">
      {/* Orange scoreboard header */}
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
        <p className="relative text-white/80 text-[10px] font-black tracking-widest uppercase">
          Round {roundNumber}: {roundsLeft} left
        </p>
        <p className="relative text-white text-2xl font-black tracking-tight">SCOREBOARD</p>
      </div>

      {/* Wave */}
      <div style={{ backgroundColor: '#FF8716' }} className="-mb-px">
        <svg viewBox="0 0 402 36" preserveAspectRatio="none" className="w-full block h-9">
          <path d="M0,0 C67,36 134,0 201,18 C268,36 335,0 402,18 L402,36 L0,36 Z" fill="white" />
        </svg>
      </div>

      {/* Player list */}
      <div className="flex-1 bg-white px-5 pt-4 pb-6 flex flex-col gap-2 overflow-y-auto">
        {standings.map((s) => {
          const isMe = s.user_id === currentUserId
          return (
            <div
              key={s.user_id}
              className="flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors"
              style={{ backgroundColor: isMe ? '#FFF4E8' : 'white' }}
            >
              <span className="text-sm font-black text-gray-400 w-5 text-center">{s.rank}</span>
              <Image src={s.avatar} alt={s.username} width={36} height={36} className="rounded-full object-contain shrink-0" />
              <span className="flex-1 font-bold text-sm text-gray-800 truncate">{s.username}</span>
              {s.delta > 0 && (
                <span className="text-[10px] font-bold text-green-600">+{s.delta}</span>
              )}
              <span className="font-black text-sm" style={{ color: '#FF8716' }}>{s.total_points}</span>
            </div>
          )
        })}
      </div>

      {isHost && (
        <div className="px-5 pb-6 pt-3 bg-white border-t border-gray-100">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onNext}
            className="w-full py-4 rounded-2xl font-black text-white text-sm tracking-widest uppercase flex items-center justify-center gap-2"
            style={{ backgroundColor: '#FF8716' }}
          >
            Next question
            <ChevronRight className="w-4 h-4 stroke-[3]" />
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
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean) // 2nd, 1st, 3rd order

  const BAR_HEIGHTS = [160, 210, 120]
  const BAR_COLORS = ['#6366F1', '#FF8716', '#EC4899']

  return (
    <div className="flex-1 flex flex-col">
      {/* Orange header */}
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

      {/* Wave */}
      <div style={{ backgroundColor: '#FF8716' }} className="-mb-px">
        <svg viewBox="0 0 402 36" preserveAspectRatio="none" className="w-full block h-9">
          <path d="M0,0 C67,36 134,0 201,18 C268,36 335,0 402,18 L402,36 L0,36 Z" fill="white" />
        </svg>
      </div>

      <div className="flex-1 bg-white flex flex-col items-center justify-center px-5 pb-6 overflow-hidden relative">
        {/* Sunburst background */}
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

        {/* Podium */}
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
                      style={{
                        height: BAR_HEIGHTS[i],
                        backgroundColor: BAR_COLORS[i],
                      }}
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
      .select('id, room_id, round_number, status, started_at, duration_seconds, phrase_id, phrases(id, verb, sentence, answer)')
      .eq('room_id', rId)
      .not('status', 'in', '(pending,done)')
      .order('round_number', { ascending: false })
      .limit(1)
      .single()

    return data as Round | null
  }, [])

  const fetchResults = useCallback(async (roundId: string): Promise<RoundResults | null> => {
    const res = await fetch(`/api/rounds/${roundId}/results`)
    if (!res.ok) return null
    return res.json()
  }, [])

  const applyRound = useCallback(async (round: Round) => {
    currentRoundIdRef.current = round.id

    if (round.status === 'active') {
      startTimer(round)
      setPhase({ type: 'active', round, secondsLeft: round.duration_seconds })
    } else if (round.status === 'collecting') {
      stopTimer()
      // Fetch answer count
      const supabase = createClient()
      const { count: answered } = await supabase
        .from('round_answers')
        .select('*', { count: 'exact', head: true })
        .eq('round_id', round.id)

      const { count: total } = await supabase
        .from('room_players')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', round.room_id)

      setPhase({ type: 'collecting', round, answeredCount: answered ?? 0, totalCount: total ?? 0 })
    } else if (round.status === 'results') {
      stopTimer()
      const results = await fetchResults(round.id)
      if (results) {
        setPhase({ type: 'results', round, results })
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

      if (room.status === 'finished') {
        const results = await fetchResults(currentRoundIdRef.current ?? '')
        setPhase({ type: 'finished', standings: results?.standings ?? [] })
        return
      }

      const round = await fetchCurrentRound(room.id)
      if (round) {
        await applyRound(round)
      }

      // Subscribe to round changes
      const channel = supabase
        .channel(`play:${room.id}:${Math.random()}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'rounds',
          filter: `room_id=eq.${room.id}`,
        }, async (payload) => {
          const updated = payload.new as Round
          // Only react to the round that becomes active/collecting/results/scoreboard
          if (['active', 'collecting', 'results', 'scoreboard'].includes(updated.status)) {
            // Re-fetch full round with phrase
            const { data: fullRound } = await supabase
              .from('rounds')
              .select('id, room_id, round_number, status, started_at, duration_seconds, phrase_id, phrases(id, verb, sentence, answer)')
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
            // Fetch final standings from last completed round
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
          // Update answer count during collecting phase
          setPhase(prev => {
            if (prev.type !== 'collecting') return prev
            const newCount = Math.min(prev.answeredCount + 1, prev.totalCount)
            return { ...prev, answeredCount: newCount }
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

  const handleAnswer = useCallback(async (ans: string) => {
    const roundId = currentRoundIdRef.current
    if (!roundId) return
    await fetch(`/api/rounds/${roundId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer: ans }),
    })
  }, [])

  const handleTimerEnd = useCallback(async () => {
    if (!isHost) return
    const roundId = currentRoundIdRef.current
    if (!roundId) return
    await fetch(`/api/rounds/${roundId}/advance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: 'collecting' }),
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

  // Derive current round number for header
  const currentRoundNumber = phase.type === 'active' ? phase.round.round_number
    : phase.type === 'collecting' ? phase.round.round_number
    : phase.type === 'results' ? phase.round.round_number
    : phase.type === 'scoreboard' ? phase.roundNumber
    : 0

  const showGameHeader = phase.type === 'active' || phase.type === 'collecting' || phase.type === 'results'

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      {showGameHeader && (
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.back()}>
            <X className="w-5 h-5 text-gray-400 stroke-[2.5]" />
          </motion.button>

          {/* Progress bar */}
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${((currentRoundNumber - 1) / totalRounds) * 100}%` }}
            />
          </div>

          {/* Round badge + countdown */}
          {phase.type === 'active' ? (
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

        {phase.type === 'active' && (
          <motion.div
            key={`active-${phase.round.id}`}
            className="flex-1 flex flex-col"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <ActiveView
              round={phase.round}
              secondsLeft={secondsLeft}
              onAnswer={handleAnswer}
              onTimerEnd={handleTimerEnd}
            />
          </motion.div>
        )}

        {phase.type === 'collecting' && (
          <motion.div
            key="collecting"
            className="flex-1 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <CollectingView
              answeredCount={phase.answeredCount}
              totalCount={phase.totalCount}
              isHost={isHost}
              onSkip={handleSkip}
            />
          </motion.div>
        )}

        {phase.type === 'results' && (
          <motion.div
            key="results"
            className="flex-1 flex flex-col"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <ResultsView
              results={phase.results}
              isHost={isHost}
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
