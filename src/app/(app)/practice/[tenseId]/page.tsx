'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { motion } from 'motion/react'

export default function GamePage() {
  const router = useRouter()
  return (
    <>
      {/* ── Transition overlay (Curtain Up) ── */}
      <motion.div
        className="fixed inset-x-0 top-0 h-screen bg-bsp-blue z-50 pointer-events-none"
        initial={{ y: '0%' }}
        animate={{ y: 'calc(-100% - 50px)' }}
        transition={{ duration: 0.55, ease: [0.4, 0, 0.6, 1], delay: 0.1 }}
      >
        <div className="absolute left-0 right-0 bottom-0 translate-y-[99%]">
          <svg viewBox="0 0 402 36" preserveAspectRatio="none" className="w-full block h-9 text-bsp-blue rotate-180">
            <path d="M0,0 C67,36 134,0 201,18 C268,36 335,0 402,18 L402,36 L0,36 Z" fill="currentColor" />
          </svg>
        </div>
      </motion.div>

      <div className="min-h-screen bg-white flex flex-col items-start px-5 pt-10">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => router.back()}
          className="flex items-center gap-1 text-gray-500 text-sm font-semibold"
        >
          <ChevronRight className="w-3.5 h-3.5 rotate-180" />
          Back
        </motion.button>
      </div>
    </>
  )
}
