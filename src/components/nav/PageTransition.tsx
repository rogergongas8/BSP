'use client'

import { motion, AnimatePresence } from 'motion/react'
import { usePathname } from 'next/navigation'

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex-1 relative grid [grid-template-columns:1fr] [grid-template-rows:1fr]">
      <AnimatePresence>
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="[grid-area:1/1] flex flex-col w-full h-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
