import Image from 'next/image'
import ActivityCard from './ActivityCard'
import { BadgeModalDemo } from './BadgeModalDemo'
import { LevelUpModalDemo } from './LevelUpModalDemo'

const CAT_POSITIONS = [
  // day 0: cat holding the XP badge from above
  { cat: 'absolute -top-5 right-6 w-[60px] h-[60px] z-20', xp: 'absolute top-7 right-4 z-10' },
  // day 1: smaller cat top-right corner, XP overlapping right edge
  { cat: 'absolute -top-5 -right-1 w-[38px] h-[38px] z-20 rotate-[20deg]', xp: 'absolute top-2 -right-3 z-10 rotate-[20deg]' },
  // day 2: XP top-right tilted left, cat peeking from bottom-right
  { cat: 'absolute -bottom-3 right-4 w-[52px] h-[52px] z-20', xp: 'absolute -top-2 right-2 z-10 rotate-[20deg]' },
] as const

export default function HomePage() {
  // eslint-disable-next-line react-hooks/purity
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % 3
  const pos = CAT_POSITIONS[dayIndex]

  return (
    <div className="flex flex-col">

      {/* ── Blue header ── */}
      <div className="bg-bsp-blue px-5 pt-8">

        {/* User row */}
        <div className="flex items-center justify-between mb-5">
          <Image
            src="/images/nav/user-image.svg"
            alt="Avatar"
            width={36}
            height={36}
            className="rounded-full"
          />
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

        {/* Today's challenge card */}
        <div className="relative mb-8">
          {/* Cat character — rotates position every 24 h */}
          <div className={pos.cat}>
            <Image
              src="/images/home/avatar.svg"
              alt="Cat"
              fill
              className="object-contain drop-shadow-md"
            />
          </div>

          {/* XP badge — follows the cat */}
          <div className={`${pos.xp} bg-bsp-orange rounded-full px-2 py-2 shadow-md z-10`}>
            <span className="text-black text-xs">+ 200 XP</span>
          </div>

          <div className="bg-white/15 rounded-3xl px-4 py-3 flex items-center gap-3">
            {/* Progress ring */}
            <div className="relative w-12 h-12 shrink-0">
              <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
                <circle cx="24" cy="24" r="19" fill="none" stroke="white" strokeOpacity="0.25" strokeWidth="4" />
                <circle
                  cx="24" cy="24" r="19" fill="none"
                  stroke="#4CAF50" strokeWidth="4"
                  strokeDasharray="119.38" strokeDashoffset="89"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-white/70 text-xs mb-0.5">Today&apos;s challenge</p>
              <p className="text-white font-bold text-sm">Complete 3 activities</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Wave separator ── */}
      <div className="bg-bsp-blue -mb-px">
        <svg viewBox="0 0 402 36" preserveAspectRatio="none" className="w-full block h-9">
          <path
            d="M0,0 C67,36 134,0 201,18 C268,36 335,0 402,18 L402,36 L0,36 Z"
            fill="#F3F4F6"
          />
        </svg>
      </div>

      {/* ── Content area ── */}
      <div className="bg-gray-100 px-4 pt-4 pb-6 flex-1">

        {/* Section title */}
        <h2 className="mb-5 text-base leading-snug">
          <span className="font-black text-gray-900">SUPER</span>
          <span className="font-semibold text-gray-900"> useful activities </span>
          <span className="font-normal text-gray-400 text-sm">(your welcome)</span>
        </h2>

        {/* 2-col activity cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <ActivityCard
            href="/escribiendo"
            imageSrc="/images/home/escribiendo.png"
            imageAlt="Escribiendo"
            imageWidth={564}
            imageHeight={1022}
            buttonColor="orange"
            buttonBottom="10%"
          />
          <ActivityCard
            href="/practice"
            imageSrc="/images/home/liodetiempos.png"
            imageAlt="Lío de tiempos"
            imageWidth={564}
            imageHeight={1019}
            buttonColor="orange"
            buttonBottom="10%"
            priority={true}
          />
        </div>

        {/* Battle / Multiplayer card */}
        <ActivityCard
          href="/room"
          imageSrc="/images/home/multiplayer.png"
          imageAlt="BSP Battle"
          imageWidth={1123}
          imageHeight={828}
          buttonColor="gradient"
          buttonPosition="right"
          buttonBottom="15%"
          buttonRight="10%"
          buttonWidth="w-24"
        />

      </div>
      <BadgeModalDemo />
      <LevelUpModalDemo />
    </div>
  )
}
