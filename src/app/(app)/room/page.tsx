'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { ChevronRight, Plus, ArrowRight } from 'lucide-react'

const ORANGE = '#FF8716'
const ORANGE_DARK = '#EF7316'
const PURPLE = '#B855D4'
const PURPLE_DARK = '#4A5BB5'

export default function RoomPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Orange header ── */}
      <div className="relative px-5 pt-8 pb-12 overflow-hidden" style={{ backgroundColor: ORANGE }}>
        <Image
          src="/images/multiplayer/bg-star.png"
          alt=""
          width={220}
          height={220}
          className="absolute -top-6 -right-6 opacity-25 pointer-events-none select-none"
          draggable={false}
        />
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
          <Link href="/" className="flex items-center gap-1 text-white/80 text-xs font-semibold">
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            Back
          </Link>
        </motion.div>
        <h1 className="relative text-center text-3xl font-black text-gray-900 tracking-tight">
          Batalla Súper Pasada
        </h1>
      </div>

      {/* ── Wave ── */}
      <div className="-mb-px" style={{ backgroundColor: ORANGE }}>
        <svg viewBox="0 0 402 36" preserveAspectRatio="none" className="w-full block h-9">
          <path d="M0,0 C67,36 134,0 201,18 C268,36 335,0 402,18 L402,36 L0,36 Z" fill="#F3F4F6" />
        </svg>
      </div>

      {/* ── Content ── */}
      <div className="bg-gray-100 flex-1 px-5 pt-6 pb-28 flex flex-col gap-4">

        <p className="text-sm font-black text-gray-900">Choose your role</p>

        {/* Create a session */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          onClick={() => router.push('/room/create')}
          className="w-full text-left bg-white rounded-2xl p-4 flex gap-4 items-start"
          style={{
            border: '2px solid transparent',
            background: `linear-gradient(white, white) padding-box, linear-gradient(135deg, ${ORANGE} 0%, ${ORANGE_DARK} 100%) border-box`,
          }}
        >
          <div
            className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${ORANGE} 0%, ${ORANGE_DARK} 100%)` }}
          >
            <Plus className="w-6 h-6 text-white stroke-[3]" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="font-black text-base" style={{ color: ORANGE_DARK }}>Create a session</p>
            <p className="text-xs font-semibold" style={{ color: ORANGE }}>You are the host</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Choose an activity and get a code to share with your friends.
            </p>
          </div>
        </motion.button>

        {/* Join a session */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          onClick={() => router.push('/room/join')}
          className="w-full text-left bg-white rounded-2xl p-4 flex gap-4 items-start"
          style={{
            border: '2px solid transparent',
            background: `linear-gradient(white, white) padding-box, linear-gradient(135deg, ${PURPLE} 0%, ${PURPLE_DARK} 100%) border-box`,
          }}
        >
          <div
            className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${PURPLE} 0%, ${PURPLE_DARK} 100%)` }}
          >
            <ArrowRight className="w-6 h-6 text-white stroke-[3]" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="font-black text-base" style={{ color: PURPLE }}>Join a session</p>
            <p className="text-xs font-semibold" style={{ color: PURPLE }}>Introduce the host&apos;s code</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              A friend or a teacher has already created a room? Join with the code!
            </p>
          </div>
        </motion.button>

      </div>
    </div>
  )
}
