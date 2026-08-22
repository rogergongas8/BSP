'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { ChevronRight, ChevronDown, Plus, ArrowRight } from 'lucide-react'
import TenseCarousel from '@/components/game/TenseCarousel'
import BattleCarousel from '@/components/game/BattleCarousel'
import { createClient } from '@/lib/supabase/client'
import { getLevelInfo, catImagePath } from '@/lib/levels'
import { resolveAvatarPath } from '@/lib/avatars'
import OverscrollColor from '@/components/overscroll-color'

const ORANGE = '#FF8716'
const ORANGE_DARK = '#F55379'
const PURPLE = '#B855D4'
const PURPLE_DARK = '#4A5BB5'

type CreateMode = 'options' | 'escribiendo' | 'lio'

export default function RoomPage() {
  const router = useRouter()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createMode, setCreateMode] = useState<CreateMode>('options')
  const [creating, setCreating] = useState(false)
  const [streak, setStreak] = useState(0)
  const [level, setLevel] = useState(1)
  const [avatar, setAvatar] = useState('/images/nav/user-image.svg')

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

  const handlePlay = async (href: string) => {
    const [, section, mode] = href.split('/')
    const game_type = section === 'escribiendo' ? 'escribiendo' : 'contraste'
    const game_mode = mode

    if (creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_type, game_mode }),
      })
      const json = await res.json()
      if (json.data?.code) {
        router.push(`/room/${json.data.code}`)
      } else {
        console.error('Room creation failed:', json)
        alert(json.error ?? 'Error creating room. Check console.')
        setCreating(false)
      }
    } catch (err) {
      console.error('Room creation error:', err)
      setCreating(false)
    }
  }

  const handleCreateToggle = () => {
    if (isCreateOpen) {
      setIsCreateOpen(false)
      setTimeout(() => setCreateMode('options'), 400)
    } else {
      setIsCreateOpen(true)
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
          <Link href="/" className="flex items-center gap-1 text-white/80 text-xs font-semibold">
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
      <div className="bg-gray-100 flex-1 px-5 sm:px-[26%] pt-6 pb-28 flex flex-col gap-4">

        <p className="text-sm font-black text-gray-900">Choose your role</p>

        {/* ── Create a session ── */}
        <div
          className="w-full rounded-2xl overflow-hidden"
          style={{
            borderStyle: 'solid',
            borderWidth: 2,
            borderColor: 'transparent',
            background: isCreateOpen
              ? `linear-gradient(160deg, ${ORANGE} 0%, ${ORANGE_DARK} 100%) padding-box, linear-gradient(160deg, ${ORANGE} 0%, ${ORANGE_DARK} 100%) border-box`
              : `linear-gradient(white, white) padding-box, linear-gradient(135deg, ${ORANGE} 0%, ${ORANGE_DARK} 100%) border-box`
          }}
        >
          {/* Header */}
          <motion.button
            className="w-full p-4 flex gap-3 items-start"
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateToggle}
          >
            <div
              className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: isCreateOpen ? 'rgba(255,255,255,0.2)' : `linear-gradient(135deg, ${ORANGE} 0%, ${ORANGE_DARK} 100%)` }}
            >
              <Plus className="w-6 h-6 text-white stroke-[3]" />
            </div>
            <div className="flex flex-col gap-0.5 flex-1 min-w-0 text-left">
              <p
                className="font-black text-base"
                style={isCreateOpen
                  ? { color: 'white' }
                  : { background: `linear-gradient(135deg, ${ORANGE} 0%, ${ORANGE_DARK} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
                }
              >
                Create a session
              </p>
              <p className={`text-xs font-normal ${isCreateOpen ? 'text-white' : 'text-gray-900'}`}>
                You are the host
              </p>
              <p className={`text-xs font-normal mt-1 leading-relaxed ${isCreateOpen ? 'text-white/80' : 'text-gray-900'}`}>
                Choose an activity and get a code to share with your friends.
              </p>
            </div>
            <motion.div
              animate={{ rotate: isCreateOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              className="shrink-0 mt-1"
            >
              <ChevronDown className={`w-4 h-4 ${isCreateOpen ? 'text-white/70' : 'text-gray-400'}`} />
            </motion.div>
          </motion.button>

          {/* Expandable body — grows downward only, top stays fixed */}
          <motion.div
            initial={false}
            animate={{ height: isCreateOpen ? 'auto' : 0, opacity: isCreateOpen ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 250, damping: 28 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col px-4 pb-5 pt-2">

              {/* ESCRIBIENDO CARD */}
              <div
                onClick={() => setCreateMode(createMode === 'escribiendo' ? 'options' : 'escribiendo')}
                className="w-full relative bg-white rounded-[24px] border-2 border-gray-100 shadow-[0_4px_0_rgba(0,0,0,0.04)] flex flex-col items-center overflow-visible cursor-pointer"
                style={{ paddingTop: 44, paddingBottom: 16, marginTop: 16 }}
              >
                {/* Image */}
                <motion.div
                  className="absolute z-10"
                  animate={createMode === 'escribiendo'
                    ? { top: -20, left: 16, x: 0, width: 70, height: 70 }
                    : { top: -20, left: '50%', x: '-50%', width: 70, height: 70 }
                  }
                  initial={false}
                  transition={{ type: 'spring', stiffness: 250, damping: 40 }}
                >
                  <Image src="/images/multiplayer/escribiendo.png" alt="" fill className="object-contain drop-shadow-md" draggable={false} />
                </motion.div>

                {/* Chevron */}
                <motion.div
                  className="absolute top-5 right-5 z-10"
                  animate={{ rotate: createMode === 'escribiendo' ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 250, damping: 28 }}
                >
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                </motion.div>

                {/* Collapsed title — accordion downward */}
                <motion.div
                  initial={false}
                  animate={{ height: createMode !== 'escribiendo' ? 'auto' : 0, opacity: createMode !== 'escribiendo' ? 1 : 0 }}
                  transition={{ type: 'spring', stiffness: 250, damping: 28 }}
                  className="overflow-hidden w-full flex flex-col items-center"
                >
                  <p className="text-base font-black text-gray-800 leading-tight">Escribiendo...</p>
                  <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mt-0.5 pb-1">3 Tenses</p>
                </motion.div>

                {/* Carousel — accordion downward */}
                <motion.div
                  initial={false}
                  animate={{ height: createMode === 'escribiendo' ? 'auto' : 0, opacity: createMode === 'escribiendo' ? 1 : 0 }}
                  transition={{ type: 'spring', stiffness: 250, damping: 28 }}
                  className="overflow-hidden w-full"
                  onClick={(e) => { if (createMode === 'escribiendo') e.stopPropagation() }}
                >
                  <TenseCarousel onPlay={handlePlay} contained />
                </motion.div>
              </div>

              {/* LÍO CARD */}
              <div
                onClick={() => setCreateMode(createMode === 'lio' ? 'options' : 'lio')}
                className="w-full relative rounded-[24px] border-[3px] border-black/20 shadow-[0_4px_0_rgba(0,0,0,0.15)] flex flex-col items-center overflow-visible cursor-pointer"
                style={{ backgroundColor: '#4A5BB5', paddingTop: 44, paddingBottom: 16, marginTop: 16 }}
              >
                {/* Image */}
                <motion.div
                  className="absolute z-10"
                  animate={createMode === 'lio'
                    ? { top: -20, left: 16, x: 0, width: 70, height: 70 }
                    : { top: -20, left: '50%', x: '-50%', width: 70, height: 70 }
                  }
                  initial={false}
                  transition={{ type: 'spring', stiffness: 250, damping: 40 }}
                >
                  <Image src="/images/multiplayer/lio.png" alt="" fill className="object-contain drop-shadow-md" draggable={false} />
                </motion.div>

                {/* Chevron */}
                <motion.div
                  className="absolute top-5 right-5 z-10"
                  animate={{ rotate: createMode === 'lio' ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 250, damping: 28 }}
                >
                  <ChevronDown className="w-5 h-5 text-white/70" />
                </motion.div>

                {/* Collapsed title — accordion downward */}
                <motion.div
                  initial={false}
                  animate={{ height: createMode !== 'lio' ? 'auto' : 0, opacity: createMode !== 'lio' ? 1 : 0 }}
                  transition={{ type: 'spring', stiffness: 250, damping: 28 }}
                  className="overflow-hidden w-full flex flex-col items-center"
                >
                  <p className="text-base font-black text-white leading-tight">Lío de tiempos</p>
                  <p className="text-[10px] font-bold text-white/70 tracking-widest uppercase mt-0.5 pb-1">3 Contrasts</p>
                </motion.div>

                {/* Carousel — accordion downward */}
                <motion.div
                  initial={false}
                  animate={{ height: createMode === 'lio' ? 'auto' : 0, opacity: createMode === 'lio' ? 1 : 0 }}
                  transition={{ type: 'spring', stiffness: 250, damping: 28 }}
                  className="overflow-hidden w-full"
                  onClick={(e) => { if (createMode === 'lio') e.stopPropagation() }}
                >
                  <BattleCarousel onPlay={handlePlay} contained />
                </motion.div>
              </div>

            </div>
          </motion.div>
        </div>

        {/* ── Join a session ── */}
        <Link href="/join">
        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="w-full text-left rounded-2xl p-4 flex gap-4 items-start"
          style={{
            border: '2px solid transparent',
            background: `linear-gradient(white, white) padding-box, linear-gradient(135deg, ${PURPLE} 0%, ${PURPLE_DARK} 100%) border-box`,
          }}
        >
          <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${PURPLE} 0%, ${PURPLE_DARK} 100%)` }}>
            <ArrowRight className="w-6 h-6 text-white stroke-[3]" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="font-black text-base" style={{ background: `linear-gradient(135deg, ${PURPLE} 0%, ${PURPLE_DARK} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Join a session</p>
            <p className="text-xs font-normal text-gray-900">Introduce the host&apos;s code</p>
            <p className="text-xs font-normal text-gray-900 mt-1 leading-relaxed">A friend or a teacher has already created a room? Join with the code!</p>
          </div>
        </motion.button>
        </Link>

      </div>
    </div>
  )
}
