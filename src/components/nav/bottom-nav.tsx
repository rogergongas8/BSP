'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/learn', icon: '/images/nav/Review.svg', iconActive: '/images/nav/review-selected.svg', label: 'Learn' },
  { href: '/', icon: '/images/nav/Home.svg', iconActive: '/images/nav/home-selected.svg', label: 'Home' },
  { href: '/profile', icon: '/images/nav/Profile.svg', iconActive: '/images/nav/profile-selected.svg', label: 'Profile' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-bsp-blue-dark rounded-full px-3 py-2 flex items-center gap-1 shadow-lg">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`p-3 rounded-full transition-colors ${isActive ? 'bg-white' : ''}`}
            >
              <Image
                src={isActive ? item.iconActive : item.icon}
                alt={item.label}
                width={22}
                height={22}
              />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
