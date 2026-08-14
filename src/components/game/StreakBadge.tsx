'use client'

import Image from 'next/image'

export default function StreakBadge({ streak }: { streak: number }) {
  return (
    <div
      className="relative flex items-center gap-2 rounded-2xl pl-4 pr-20 py-4"
      style={{ backgroundColor: '#FDBB6E' }}
    >
      <span className="text-xl font-black text-white shrink-0">{streak}</span>
      <span className="text-xl shrink-0">🔥</span>
      <span className="flex-1 text-sm font-bold text-white">You&apos;re on strike!</span>
      <Image
        src="/images/multiplayer/Strike.png"
        alt=""
        width={132}
        height={83}
        className="absolute -right-1 top-1/2 -translate-y-[63%] object-contain shrink-0 pointer-events-none"
      />
    </div>
  )
}
