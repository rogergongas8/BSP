'use client'

import { DoorOpen } from 'lucide-react'
import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Signs the user out from the home header.
 *
 * `router.refresh()` after the redirect matters: without it the App Router can serve the
 * previous, still-authenticated render of /login from its client cache, making it look like
 * the logout failed.
 */
export default function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    if (loading) return
    setLoading(true)

    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})

    router.push('/login')
    router.refresh()
  }

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={handleLogout}
      disabled={loading}
      aria-label="Cerrar sesión"
      className="flex items-center justify-center w-8 h-8 rounded-full bg-white/15 disabled:opacity-60"
    >
      <DoorOpen className="w-4 h-4 text-white" />
    </motion.button>
  )
}
