'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import Image from 'next/image'
import { X } from 'lucide-react'

export function HostEndedModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            className="relative w-full max-w-[320px] rounded-3xl bg-white shadow-2xl px-6 pt-6 pb-7 flex flex-col items-center gap-4"
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 12 }}
            transition={{ type: 'spring', damping: 18, stiffness: 280 }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>

            <Image
              src="/images/multiplayer/hostleave.png"
              alt=""
              width={180}
              height={176}
              className="object-contain mt-2"
            />

            <p className="text-center text-sm text-gray-700">Looks like the host has ended the game</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
