'use client'

import { usePathname } from 'next/navigation'
import BottomNav from '@/components/nav/bottom-nav'

const GAME_PATHS = ['/escribiendo/', '/play/', '/learn/']

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isGame = GAME_PATHS.some(p => pathname.startsWith(p))

  return (
    <div className="min-h-dvh bg-gray-100 flex flex-col relative overflow-x-hidden">
      <main className={`${isGame ? '' : 'pb-28'} flex-1 flex flex-col`}>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
