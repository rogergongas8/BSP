'use client'

import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { motion, LayoutGroup } from 'motion/react'

const NAV_ITEMS = [
  { icon: '/images/nav/review.svg', iconActive: '/images/nav/review-hover.svg', label: 'Learn', href: '/learn', size: 28 },
  { icon: '/images/nav/home.svg', iconActive: '/images/nav/home-hover.svg', label: 'Home', href: '/', size: 28 },
  { icon: '/images/nav/profile-v2.svg', iconActive: '/images/nav/profile-hover-v2.svg', label: 'Profile', href: '/profile', size: 28 },
]

const HIDE_NAV_PATHS = ['/escribiendo', '/practice', '/room', '/play', '/learn/']

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  if (HIDE_NAV_PATHS.some(p => pathname.startsWith(p))) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="relative h-[54px] w-[261px] bg-[#567BCA]/70 backdrop-blur-md rounded-full shadow-[0_8px_32px_#2F54BA55,inset_0_0_0_1px_rgba(255,255,255,0.2)]">
        <LayoutGroup>
          <div className="relative grid grid-cols-3 h-full z-10 px-[3px]">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <button
                  key={item.label}
                  onClick={() => router.push(item.href)}
                  className="relative flex items-center justify-center h-full active:scale-90 transition-transform duration-300"
                >
                  {/* Burbuja — vive dentro del botón activo para que layoutId la anime */}
                  {isActive && (
                    <motion.div
                      layoutId="bubble"
                      className="absolute inset-[4px] rounded-full bg-[#394E93]/70 backdrop-blur-md border border-white/20"
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 38,
                        mass: 1,
                      }}
                    />
                  )}

                  {/* Iconos con cross-fade */}
                  <div className="relative z-10" style={{ width: item.size, height: item.size }}>
                    <Image
                      src={item.icon}
                      alt={item.label}
                      width={120}
                      height={120}
                      className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${isActive ? 'opacity-0' : 'opacity-60'}`}
                    />
                    <Image
                      src={item.iconActive}
                      alt={item.label}
                      width={120}
                      height={120}
                      className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        </LayoutGroup>
      </div>
    </div>
  )
}
