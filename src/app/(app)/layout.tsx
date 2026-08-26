'use client'

import { usePathname } from 'next/navigation'
import BottomNav, { isBottomNavVisible } from '@/components/nav/bottom-nav'
import NotificationQueue from './NotificationQueue'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Asking the nav itself, rather than keeping a second list here that can drift out of sync.
  const reserveNavSpace = isBottomNavVisible(pathname)

  return (
    <div className="min-h-dvh bg-gray-100 flex flex-col relative overflow-x-hidden">
      <main className={`${reserveNavSpace ? 'pb-28' : ''} flex-1 flex flex-col`}>
        {children}
      </main>
      <BottomNav />
      {/* Mounted here rather than on the home page so the queue is consumed wherever the user
          goes after finishing. It used to live only in `/`, so a level-up or badge earned in a
          session was silently dropped whenever the player left the results screen through the
          bottom nav (Learn / Profile) instead of the "¡Fin!" button. */}
      <NotificationQueue />
    </div>
  )
}
