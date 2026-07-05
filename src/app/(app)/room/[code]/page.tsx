'use client'

import { useState, use, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { ChevronRight, Copy, Check, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getLevelInfo, catImagePath } from '@/lib/levels'
import OverscrollColor from '@/components/overscroll-color'

type PresencePayload = {
  user_id: string
  username: string
  level: number
  avatar: string
  isHost: boolean
}

const ORANGE = '#FF8716'
const MAX_PLAYERS = 6

type Player = {
  user_id: string
  username: string
  level: number
  avatar: string
  isHost: boolean
}

export default function RoomLobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [players, setPlayers] = useState<Player[]>([])
  const [hostId, setHostId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [streak, setStreak] = useState(0)
  const [level, setLevel] = useState(1)
  const [starting, setStarting] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roomsChannelRef = useRef<any>(null)

  const sessionCode = `BSP-${code}`

  useEffect(() => {
    const supabase = createClient()
    let presenceChannel: ReturnType<typeof supabase.channel> | null = null
    let roomsChannel: ReturnType<typeof supabase.channel> | null = null

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('streak, total_xp, username')
        .eq('id', user.id)
        .single()
      if (myProfile) {
        setStreak(myProfile.streak)
        setLevel(getLevelInfo(myProfile.total_xp).level)
      }

      const { data: room } = await supabase
        .from('rooms')
        .select('id, host_id')
        .eq('code', code)
        .single()
      if (!room) { router.push('/room'); return }
      setHostId(room.host_id)

      const myInfo = getLevelInfo(myProfile?.total_xp ?? 0)
      const myPresence: PresencePayload = {
        user_id: user.id,
        username: myProfile?.username ?? 'Player',
        level: myInfo.level,
        avatar: catImagePath(myInfo.cat),
        isHost: user.id === room.host_id,
      }

      // ── Presence channel — tracks everyone who's on this lobby page ──
      presenceChannel = supabase.channel(`lobby:${room.id}`, {
        config: { presence: { key: user.id } },
      })

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          if (!presenceChannel) return
          const state = presenceChannel.presenceState<PresencePayload>()
          const list: Player[] = Object.values(state)
            .map((entries) => entries[0])
            .filter(Boolean)
            .map((p) => ({
              user_id: p.user_id,
              username: p.username,
              level: p.level,
              avatar: p.avatar,
              isHost: p.isHost,
            }))
            .sort((a, b) => (b.isHost ? 1 : 0) - (a.isHost ? 1 : 0))
          setPlayers(list)
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel!.track(myPresence)
          }
        })

      channelRef.current = presenceChannel

      // ── postgres_changes only for room status (game start) ──
      roomsChannel = supabase
        .channel(`room-status:${room.id}:${Math.random()}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${room.id}`,
        }, (payload) => {
          const updated = payload.new as { status: string }
          if (updated.status === 'playing') {
            router.push(`/play/${code}`)
          }
        })
        .subscribe()

      roomsChannelRef.current = roomsChannel
    }

    load()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (roomsChannelRef.current) supabase.removeChannel(roomsChannelRef.current)
    }
  }, [code]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStart = async () => {
    if (starting) return
    setStarting(true)
    try {
      const res = await fetch(`/api/rooms/${code}/start`, { method: 'POST' })
      if (!res.ok) {
        const { error } = await res.json()
        alert(error ?? 'Failed to start game')
        setStarting(false)
      }
      // On success: Realtime UPDATE on rooms will trigger navigation for all players
    } catch {
      setStarting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <OverscrollColor top={ORANGE} bottom="#F3F4F6" />

      {/* ── Orange header ── */}
      <div className="relative px-5 pt-8 pb-12 overflow-hidden" style={{ backgroundColor: ORANGE }}>
        <Image src="/images/multiplayer/bg-star.png" alt="" width={220} height={220} className="absolute -top-6 -right-6 opacity-25 pointer-events-none select-none" draggable={false} />
        <div className="relative flex items-center justify-between mb-3">
          <Image src={catImagePath(getLevelInfo(level === 1 ? 0 : level).cat)} alt="Avatar" width={36} height={36} className="rounded-full object-contain" />
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
      <div className="bg-gray-100 flex-1 px-5 pt-6 pb-28 flex flex-col gap-4">

        {/* Session Code card */}
        <div className="w-full bg-white rounded-2xl p-4 flex flex-col gap-3" style={{ border: `2px solid ${ORANGE}` }}>
          <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Session Code</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-xl px-4 py-3" style={{ backgroundColor: '#FFF4E8' }}>
              <p className="text-2xl font-bold tracking-[0.12em] text-center" style={{ color: ORANGE }}>{sessionCode}</p>
            </div>
            <motion.button whileTap={{ scale: 0.88 }} onClick={handleCopy}
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: ORANGE }}>
              {copied ? <Check className="w-5 h-5 text-white stroke-[3]" /> : <Copy className="w-5 h-5 text-white stroke-[2.5]" />}
            </motion.button>
          </div>
          <p className="text-xs text-gray-400 text-center font-medium">Share this code with your friends</p>
        </div>

        {/* Players card */}
        <div className="w-full bg-white rounded-2xl p-4 flex flex-col gap-1" style={{ border: `2px solid ${ORANGE}` }}>
          <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase mb-2">
            Players ({players.length}/{MAX_PLAYERS})
          </p>

          {players.map((player, index) => (
            <div key={player.user_id}>
              <div className="flex items-center gap-3 py-2.5">
                <Image src={player.avatar} alt={player.username} width={40} height={40} className="rounded-full shrink-0 object-contain" />
                <span className="font-bold text-gray-800 text-sm">{player.username}</span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#D4DAEF', color: '#4A5BB5' }}>
                  lvl. {player.level}
                </span>
                {player.isHost && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#F5E6D3', color: '#E8922A' }}>
                    HOST
                  </span>
                )}
              </div>
              {index < players.length - 1 && <div className="h-px bg-gray-100 mx-1" />}
            </div>
          ))}

          {players.length < MAX_PLAYERS && (
            <>
              {players.length > 0 && <div className="h-px bg-gray-100 mx-1" />}
              <div className="flex items-center gap-3 py-2.5">
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center shrink-0">
                  <Plus className="w-4 h-4 text-gray-300" />
                </div>
                <span className="text-sm text-gray-400 font-medium">Waiting for players...</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── JUGAR button ── */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-gray-100">
        <motion.button
          whileTap={{ scale: 0.97 }}
          disabled={currentUserId !== hostId || players.length < 2 || starting}
          onClick={handleStart}
          className="w-full py-4 rounded-2xl font-black text-white text-base tracking-widest uppercase shadow-lg disabled:opacity-40"
          style={{ backgroundColor: ORANGE }}
        >
          {starting ? 'Iniciando...' : 'Jugar'}
        </motion.button>
      </div>
    </div>
  )
}
