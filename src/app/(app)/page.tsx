import Image from 'next/image'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="flex flex-col">

      {/* ── Blue header ── */}
      <div className="bg-bsp-blue px-5 pt-8">

        {/* User row */}
        <div className="flex items-center justify-between mb-5">
          <Image
            src="/images/home/avatar.svg"
            alt="Avatar"
            width={48}
            height={48}
            className="rounded-full"
          />
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-bsp-blue-dark rounded-full px-3 py-1.5">
              <span className="text-sm">🔥</span>
              <span className="text-white text-xs font-semibold">4</span>
            </div>
            <div className="flex items-center gap-1.5 bg-bsp-blue-dark rounded-full px-3 py-1.5">
              <span className="text-sm">⭐</span>
              <span className="text-white text-xs font-semibold">Lvl 2.</span>
            </div>
          </div>
        </div>

        {/* Today's challenge card */}
        <div className="bg-white/15 rounded-2xl px-4 py-3 flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
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
          <div className="bg-bsp-orange rounded-full px-3 py-1.5 ml-2">
            <span className="text-white text-xs font-bold">+ 200 XP</span>
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
      <div className="bg-gray-100 px-4 pt-4 pb-6">

        {/* Section title */}
        <h2 className="mb-5 text-base leading-snug">
          <span className="font-black text-gray-900">SUPER</span>
          <span className="font-semibold text-gray-900"> useful activities </span>
          <span className="font-normal text-gray-400 text-sm">(your welcome)</span>
        </h2>

        {/* 2-col activity cards */}
        <div className="grid grid-cols-2 gap-3 mb-4 mt-10">

          {/* Escribiendo card */}
          <div className="relative">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-24 h-24 z-10">
              <Image src="/images/home/escribiendo.svg" alt="Escribiendo" fill className="object-contain" />
            </div>
            <div className="bg-white rounded-2xl pt-16 pb-4 px-3 flex flex-col items-center text-center">
              <h3 className="font-bold text-sm text-gray-900 mb-0.5">Escribiendo...</h3>
              <p className="text-gray-400 text-[11px] italic mb-2">type-in</p>
              <p className="text-gray-500 text-[11px] leading-snug mb-3">
                Select a tense and type the correct conjugation.
              </p>
              <Link
                href="/practice"
                className="bg-bsp-orange text-white rounded-full px-5 py-2 text-xs font-semibold flex items-center gap-1"
              >
                Jugar <span className="text-base leading-none">›</span>
              </Link>
            </div>
          </div>

          {/* Lío de tiempos card */}
          <div className="relative">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-24 h-24 z-10">
              <Image src="/images/home/lio-de-tiempos.svg" alt="Lío de tiempos" fill className="object-contain" />
            </div>
            <div className="bg-bsp-blue rounded-2xl pt-16 pb-4 px-3 flex flex-col items-center text-center">
              <h3 className="font-bold text-sm text-white mb-0.5">Lío de tiempos</h3>
              <p className="text-white/60 text-[11px] italic mb-2">multiple choice</p>
              <p className="text-white/80 text-[11px] leading-snug mb-3">
                Choose the correct tense for each scenario.
              </p>
              <Link
                href="/practice"
                className="bg-bsp-orange text-white rounded-full px-5 py-2 text-xs font-semibold flex items-center gap-1"
              >
                Jugar <span className="text-base leading-none">›</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Battle / Multiplayer card */}
        <div className="bg-[#F5A85A] rounded-2xl p-4 relative overflow-hidden">
          <div className="absolute -top-3 right-0 w-32 h-32 z-10">
            <Image src="/images/home/battle.svg" alt="Battle" fill className="object-contain object-right-top" />
          </div>

          <div className="flex items-center gap-2 mb-3">
            <div className="bg-bsp-blue-dark rounded-full px-3 py-1 flex items-center gap-1">
              <span className="text-yellow-300 text-xs">⚡</span>
              <span className="text-white text-xs font-semibold">Multiplayer</span>
            </div>
          </div>

          <h3 className="font-black text-bsp-blue text-lg leading-tight mb-2">
            BSP Battle<br />Super Pasada
          </h3>

          <p className="text-sm text-gray-700 leading-snug mb-4">
            Time to spice things up!<br />
            Challenge your friends in{' '}
            <strong>Escribiendo...</strong> or <strong>Lío de tiempos</strong>.
          </p>

          <div className="flex items-center justify-between">
            {/* Player avatars */}
            <div className="flex -space-x-2">
              {[
                { letter: 'A', bg: 'bg-blue-400' },
                { letter: 'C', bg: 'bg-red-400' },
                { letter: 'R', bg: 'bg-orange-400' },
              ].map(({ letter, bg }) => (
                <div
                  key={letter}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white ${bg}`}
                >
                  {letter}
                </div>
              ))}
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-300 text-gray-500 text-xs font-bold border-2 border-white">
                ?
              </div>
            </div>

            <Link
              href="/room"
              className="bg-bsp-blue text-white rounded-full px-5 py-2 text-sm font-semibold flex items-center gap-1"
            >
              Jugar <span className="text-base leading-none">›</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
