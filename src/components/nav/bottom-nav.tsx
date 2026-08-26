'use client'

import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { motion, LayoutGroup } from 'motion/react'

// `sizeClass` rather than a pixel number: the bar itself is sized in rem, so the icons have to
// shrink with it or they crowd the bubble on a narrow phone.
const NAV_ITEMS = [
  { icon: '/images/nav/review.svg', iconActive: '/images/nav/review-hover.svg', label: 'Learn', href: '/learn', sizeClass: 'w-7 h-7' },
  { icon: '/images/nav/home.svg', iconActive: '/images/nav/home-hover.svg', label: 'Home', href: '/', sizeClass: 'w-7 h-7' },
  { icon: '/images/nav/profile-v2.svg', iconActive: '/images/nav/profile-hover-v2.svg', label: 'Profile', href: '/profile', sizeClass: 'w-7 h-7' },
]

const HIDE_NAV_PATHS = ['/escribiendo', '/practice', '/room', '/play', '/learn/']

/**
 * Whether the floating nav is on screen for a route.
 *
 * Exported because the app layout has to reserve the bar's height and used to decide that from
 * its own separate list, which had drifted out of sync with this one: /practice, /room and their
 * subroutes hide the nav but were still getting `pb-28`, so every one of those screens carried a
 * dead 112px of padding — a phantom scroll on a screen whose content otherwise fit exactly.
 */
export function isBottomNavVisible(pathname: string) {
  return !HIDE_NAV_PATHS.some(p => pathname.startsWith(p))
}

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  if (!isBottomNavVisible(pathname)) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="relative h-[3.375rem] w-[16.3125rem] bg-[#567BCA]/70 backdrop-blur-md rounded-full shadow-[0_8px_32px_#2F54BA55,inset_0_0_0_1px_rgba(255,255,255,0.2)]">
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
                  <div className={`relative z-10 ${item.sizeClass}`}>
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
