'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronRight, Plus, Info } from 'lucide-react'

const ORANGE = '#FF8716'
const CODE_LENGTH = 4

const PLACEHOLDER_PLAYERS = [
  { id: '1', name: 'Carlos', level: 6, isHost: true, isYou: false },
  { id: '2', name: 'Roger', level: 2, isHost: false, isYou: false },
  { id: '3', name: 'Akane', level: 4, isHost: false, isYou: true },
]

type JoinState = 'input' | 'error' | 'waiting'

export default function JoinPage() {
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [joinState, setJoinState] = useState<JoinState>('input')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const isFilled = digits.every(d => d !== '')

  const firstInputRef = useCallback((el: HTMLInputElement | null) => {
    inputRefs.current[0] = el
    if (el) el.focus()
  }, [])

  const handleChange = useCallback((index: number, value: string) => {
    const char = value.slice(-1).toUpperCase()
    if (!/^[A-Z0-9]$/.test(char) && char !== '') return

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
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()
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

  const handleJoin = () => {
    // Placeholder: simulate error for odd codes, waiting for even
    const code = digits.join('')
    const num = parseInt(code, 10)
    if (!isNaN(num) && num % 2 === 0) {
      setJoinState('waiting')
    } else {
      setJoinState('error')
    }
  }

  if (joinState === 'waiting') {
    return <WaitingRoom />
  }

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Orange header ── */}
      <div className="relative px-5 pt-8 pb-12 overflow-hidden" style={{ backgroundColor: ORANGE }}>
        <Image src="/images/multiplayer/bg-star.png" alt="" width={220} height={220} className="absolute -top-6 -right-6 opacity-25 pointer-events-none select-none" draggable={false} />
        <div className="relative flex items-center justify-between mb-3">
          <Image src="/images/nav/user-image.svg" alt="Avatar" width={36} height={36} className="rounded-full" />
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1">
              <Image src="/images/home/fxemoji_fire.svg" alt="Racha" width={16} height={16} />
              <span className="text-white text-xs font-semibold">4</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1">
              <Image src="/images/home/streamline-plump-color_star-circle-flat.svg" alt="Nivel" width={16} height={16} />
              <span className="text-white text-xs font-semibold">Lvl 2.</span>
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
      <div className="bg-gray-100 flex-1 px-5 pt-6 pb-8 flex flex-col gap-4">

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
                  inputMode="text"
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
              <p className="text-[11px] leading-relaxed text-gray-500">
                Looks like no host has started a session with this code. Make sure you entered the correct code.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* JOIN button */}
        <motion.button
          whileTap={isFilled ? { scale: 0.97 } : {}}
          onClick={isFilled ? handleJoin : undefined}
          className="w-full py-4 rounded-2xl font-black text-white text-base tracking-widest uppercase transition-all duration-300"
          style={{ backgroundColor: isFilled ? ORANGE : '#D1D5DB' }}
          disabled={!isFilled}
        >
          Join
        </motion.button>

      </div>
    </div>
  )
}

function WaitingRoom() {
  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Orange header ── */}
      <div className="relative px-5 pt-8 pb-12 overflow-hidden" style={{ backgroundColor: ORANGE }}>
        <Image src="/images/multiplayer/bg-star.png" alt="" width={220} height={220} className="absolute -top-6 -right-6 opacity-25 pointer-events-none select-none" draggable={false} />
        <div className="relative flex items-center justify-between mb-3">
          <Image src="/images/nav/user-image.svg" alt="Avatar" width={36} height={36} className="rounded-full" />
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1">
              <Image src="/images/home/fxemoji_fire.svg" alt="Racha" width={16} height={16} />
              <span className="text-white text-xs font-semibold">4</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1">
              <Image src="/images/home/streamline-plump-color_star-circle-flat.svg" alt="Nivel" width={16} height={16} />
              <span className="text-white text-xs font-semibold">Lvl 2.</span>
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
      <div className="bg-gray-100 flex-1 px-5 pt-6 pb-8 flex flex-col gap-4">

        {/* Waiting card */}
        <div className="bg-gray-100 rounded-2xl p-6 flex flex-col items-center gap-2">
          {/* Animated radar avatar */}
          <div className="relative flex items-center justify-center w-48 h-48 mb-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{ borderWidth: 1.5, borderStyle: 'solid', borderColor: ORANGE, width: 64, height: 64 }}
                animate={{
                  scale: [1, 3],
                  opacity: [0, 0.6, 0],
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.65,
                  repeat: Infinity,
                  ease: 'easeOut',
                  times: [0, 0.15, 1],
                }}
              />
            ))}
            <div className="w-16 h-16 rounded-full z-10 overflow-hidden shrink-0">
              <Image src="/images/nav/user-image.svg" alt="Host" width={64} height={64} className="rounded-full" />
            </div>
          </div>
          <p className="text-lg font-black text-gray-800">Waiting room...</p>
          <p className="text-xs text-gray-400 text-center">Wait for the host to start the session.</p>
        </div>

        {/* Players card */}
        <div className="bg-white rounded-2xl p-4 flex flex-col gap-1" style={{ border: `2px solid ${ORANGE}` }}>
          <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase mb-2">
            Players ({PLACEHOLDER_PLAYERS.length}/6)
          </p>

          {PLACEHOLDER_PLAYERS.map((player, index) => (
            <div key={player.id}>
              <div className="flex items-center gap-3 py-2.5">
                <Image src="/images/nav/user-image.svg" alt={player.name} width={40} height={40} className="rounded-full shrink-0" />
                <span className="font-bold text-gray-800 text-sm">{player.name}</span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#D4DAEF', color: '#4A5BB5' }}>
                  lvl. {player.level}
                </span>
                {player.isHost && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#F5E6D3', color: '#E8922A' }}>
                    HOST
                  </span>
                )}
                {player.isYou && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#FADADD', color: '#C85C6E' }}>
                    YOU
                  </span>
                )}
              </div>
              {index < PLACEHOLDER_PLAYERS.length - 1 && <div className="h-px bg-gray-100 mx-1" />}
            </div>
          ))}

          <div className="h-px bg-gray-100 mx-1" />
          <div className="flex items-center gap-3 py-2.5">
            <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center shrink-0">
              <Plus className="w-4 h-4 text-gray-300" />
            </div>
            <span className="text-sm text-gray-400 font-medium">Waiting for players...</span>
          </div>
        </div>

      </div>
    </div>
  )
}
