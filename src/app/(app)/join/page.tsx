'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronRight, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getLevelInfo, catImagePath } from '@/lib/levels'
import { resolveAvatarPath } from '@/lib/avatars'
import OverscrollColor from '@/components/overscroll-color'

const ORANGE = '#FF8716'
const CODE_LENGTH = 4

type JoinState = 'input' | 'error' | 'joining'

export default function JoinPage() {
  const router = useRouter()
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [joinState, setJoinState] = useState<JoinState>('input')
  const [errorMsg, setErrorMsg] = useState('Looks like no host has started a session with this code. Make sure you entered the correct code.')
  const [streak, setStreak] = useState(0)
  const [level, setLevel] = useState(1)
  const [avatar, setAvatar] = useState('/images/nav/user-image.svg')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

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

  const isFilled = digits.every(d => d !== '')

  const firstInputRef = useCallback((el: HTMLInputElement | null) => {
    inputRefs.current[0] = el
    if (el) el.focus()
  }, [])

  const handleChange = useCallback((index: number, value: string) => {
    const char = value.slice(-1)
    if (!/^[0-9]$/.test(char) && char !== '') return

    const next = [...digits]
    next[index] = char
    setDigits(next)
    setJoinState('input')

    if (char && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }, [digits])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const chars = e.clipboardData.getData('text')
      .replace(/[^0-9]/g, '')
      .slice(0, CODE_LENGTH)
      .split('')
    if (chars.length === 0) return
    const next = Array(CODE_LENGTH).fill('')
    chars.forEach((char, i) => { next[i] = char })
    setDigits(next)
    setJoinState('input')
    inputRefs.current[Math.min(chars.length, CODE_LENGTH - 1)]?.focus()
  }, [])

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits]
        next[index] = ''
        setDigits(next)
        setJoinState('input')
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
    }
  }, [digits])

  const handleJoin = async () => {
    const code = digits.join('')
    setJoinState('joining')
    const res = await fetch('/api/rooms/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const json = await res.json().catch(() => null)
    if (json?.data?.code) {
      // A member reconnecting to a game already in progress goes straight to the board, not the
      // lobby — the lobby only ever advances on a `waiting -> playing` event that already fired.
      router.push(json.data.status === 'playing' ? `/play/${json.data.code}` : `/room/${json.data.code}`)
    } else {
      setErrorMsg(
        json?.error === 'Room is full' ? 'This room is already full.' :
        json?.error === 'Game already started' ? 'This session has already started, so you can no longer join it.' :
        'Looks like no host has started a session with this code. Make sure you entered the correct code.',
      )
      setJoinState('error')
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <OverscrollColor top={ORANGE} bottom="#F3F4F6" />
      {/* ── Orange header ── */}
      <div className="relative px-5 pt-8 pb-12 overflow-hidden" style={{ backgroundColor: ORANGE }}>
        <Image src="/images/multiplayer/bg-star.png" alt="" width={220} height={220} className="absolute -top-6 -right-6 opacity-25 pointer-events-none select-none" draggable={false} />
        <div className="relative flex items-center justify-between mb-3">
          <div className="relative w-9 h-9 shrink-0">
            <Image src={avatar} alt="Avatar" fill sizes="36px" className="object-contain" />
          </div>
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
        <motion.div whileTap={{ scale: 0.9 }} className="relative mb-2 w-fit">
          <Link href="/room" className="flex items-center gap-1 text-white/80 text-xs font-semibold">
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            Back
          </Link>
        </motion.div>
        <h1 className="relative text-center text-3xl font-black text-gray-900 tracking-tight">Batalla Súper Pasada</h1>
      </div>

      {/* ── Wave ── */}
      <div className="-mb-px" style={{ backgroundColor: ORANGE }}>
        <svg viewBox="0 0 402 36" preserveAspectRatio="none" className="w-full block h-9">
          <path d="M0,0 C67,36 134,0 201,18 C268,36 335,0 402,18 L402,36 L0,36 Z" fill="#F3F4F6" />
        </svg>
      </div>

      {/* ── Content ── */}
      <div className="bg-gray-100 flex-1 px-5 sm:px-[26%] pt-6 pb-8 flex flex-col gap-4">

        {/* Session Code card */}
        <div
          className="w-full bg-white rounded-2xl p-4 flex flex-col gap-4"
          style={{ border: `2px solid ${joinState === 'error' ? '#F55379' : ORANGE}` }}
        >
          <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Session Code</p>

          {/* Input row: BSP- + 4 boxes */}
          <div className="flex items-center justify-center gap-1.5">
            {/* Static prefix */}
            {['B', 'S', 'P'].map((char) => (
              <div key={char} className="w-10 h-11 rounded-xl flex items-center justify-center bg-gray-100">
                <span className="text-base font-black text-gray-400">{char}</span>
              </div>
            ))}
            <span className="text-base font-black text-gray-400">-</span>

            {/* 4 digit inputs */}
            {Array.from({ length: CODE_LENGTH }).map((_, i) => {
              const filled = digits[i] !== ''
              const isError = joinState === 'error'
              return (
                <input
                  key={i}
                  ref={i === 0 ? firstInputRef : (el => { inputRefs.current[i] = el })}
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={digits[i]}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  className="w-10 h-11 rounded-xl text-center text-base font-black outline-none transition-all duration-200"
                  style={{
                    backgroundColor: filled ? (isError ? '#FFF0F3' : '#FFF4E8') : '#F3F4F6',
                    border: `2px solid ${filled ? (isError ? '#F55379' : ORANGE) : 'transparent'}`,
                    color: isError ? '#F55379' : ORANGE,
                  }}
                />
              )
            })}
          </div>

          {/* Hint — always inside the card */}
          <p className="text-xs text-gray-400 text-center">
            Introduce the host&apos;s code to join the session
          </p>
        </div>

        {/* Error — outside the card */}
        <AnimatePresence>
          {joinState === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-start gap-2"
            >
              <Info className="w-3 h-3 shrink-0 mt-0.5 text-gray-500" />
              <p className="text-[11px] leading-relaxed text-gray-500">{errorMsg}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* JOIN button */}
        <motion.button
          whileTap={isFilled ? { scale: 0.97 } : {}}
          onClick={isFilled && joinState !== 'joining' ? handleJoin : undefined}
          className="w-full py-4 rounded-2xl font-black text-white text-base tracking-widest uppercase transition-all duration-300"
          style={{ backgroundColor: isFilled && joinState !== 'error' ? ORANGE : '#D1D5DB' }}
          disabled={!isFilled || joinState === 'joining'}
        >
          {joinState === 'joining' ? 'Joining...' : 'Join'}
        </motion.button>

      </div>
    </div>
  )
}
