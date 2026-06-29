'use client'

import { useState, use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'motion/react'
import { ChevronRight, Copy, Check, Plus } from 'lucide-react'

const ORANGE = '#FF8716'

const PLACEHOLDER_PLAYERS = [
  { id: '1', name: 'Carlos', level: 6, avatar: '/images/nav/user-image.svg', isHost: true },
  { id: '2', name: 'Roger', level: 2, avatar: '/images/nav/user-image.svg', isHost: false },
  { id: '3', name: 'Akane', level: 4, avatar: '/images/nav/user-image.svg', isHost: false },
]

const MAX_PLAYERS = 6

export default function RoomLobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const [copied, setCopied] = useState(false)

  const sessionCode = `BSP-${code}`

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
      <div className="bg-gray-100 flex-1 px-5 pt-6 pb-28 flex flex-col gap-4">

        {/* Session Code card */}
        <div
          className="w-full bg-white rounded-2xl p-4 flex flex-col gap-3"
          style={{ border: `2px solid ${ORANGE}` }}
        >
          <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Session Code</p>

          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-xl px-4 py-3" style={{ backgroundColor: '#FFF4E8' }}>
              <p className="text-2xl font-bold tracking-[0.12em] text-center" style={{ color: ORANGE }}>{sessionCode}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={handleCopy}
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: ORANGE }}
            >
              {copied
                ? <Check className="w-5 h-5 text-white stroke-[3]" />
                : <Copy className="w-5 h-5 text-white stroke-[2.5]" />
              }
            </motion.button>
          </div>

          <p className="text-xs text-gray-400 text-center font-medium">Share this code with your friends</p>
        </div>

        {/* Players card */}
        <div
          className="w-full bg-white rounded-2xl p-4 flex flex-col gap-1"
          style={{ border: `2px solid ${ORANGE}` }}
        >
          <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase mb-2">
            Players ({PLACEHOLDER_PLAYERS.length}/{MAX_PLAYERS})
          </p>

          {PLACEHOLDER_PLAYERS.map((player, index) => (
            <div key={player.id}>
              <div className="flex items-center gap-3 py-2.5">
                <Image src={player.avatar} alt={player.name} width={40} height={40} className="rounded-full shrink-0" />
                <span className="font-bold text-gray-800 text-sm">{player.name}</span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#D4DAEF', color: '#4A5BB5' }}>
                  lvl. {player.level}
                </span>
                {player.isHost && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#F5E6D3', color: '#E8922A' }}>
                    HOST
                  </span>
                )}
              </div>
              {index < PLACEHOLDER_PLAYERS.length - 1 && (
                <div className="h-px bg-gray-100 mx-1" />
              )}
            </div>
          ))}

          {/* Waiting slot */}
          <div className="h-px bg-gray-100 mx-1" />
          <div className="flex items-center gap-3 py-2.5">
            <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center shrink-0">
              <Plus className="w-4 h-4 text-gray-300" />
            </div>
            <span className="text-sm text-gray-400 font-medium">Waiting for players...</span>
          </div>
        </div>

      </div>

      {/* ── JUGAR button — always visible ── */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-gray-100">
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="w-full py-4 rounded-2xl font-black text-white text-base tracking-widest uppercase shadow-lg"
          style={{ backgroundColor: ORANGE }}
        >
          Jugar
        </motion.button>
      </div>

    </div>
  )
}
