'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { X, Check } from 'lucide-react'
import { AVATAR_IDS, avatarImagePath, type AvatarId } from '@/lib/avatars'

export default function AvatarPickerModal({
  open, onClose, currentAvatarId,
}: {
  open: boolean
  onClose: () => void
  currentAvatarId: AvatarId | null
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<AvatarId | null>(currentAvatarId)
  const [saving, setSaving] = useState(false)

  const hasChanged = selected !== null && selected !== currentAvatarId

  const handleSave = async () => {
    if (!hasChanged || !selected) return
    setSaving(true)
    try {
      const res = await fetch('/api/profile/avatar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_id: selected }),
      })
      if (res.ok) {
        onClose()
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[60] bg-white rounded-t-3xl max-h-[85vh] flex flex-col"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3">
              <div className="w-10 h-1.5 rounded-full bg-gray-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-3 pb-4">
              <h2 className="text-lg font-black text-gray-900">Choose your avatar</h2>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 -m-2 text-gray-400"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto px-5 pb-4">
              <div className="grid grid-cols-4 gap-3">
                {AVATAR_IDS.map(id => {
                  const isSelected = selected === id
                  return (
                    <motion.button
                      key={id}
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setSelected(id)}
                      className={`relative aspect-square rounded-2xl flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-blue-50 ring-2 ring-bsp-blue' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <Image
                        src={avatarImagePath(id)}
                        alt=""
                        width={56}
                        height={56}
                        className="w-full h-full object-contain p-1.5"
                      />
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                          className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-bsp-blue flex items-center justify-center shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                        </motion.div>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Save button */}
            <div className="px-5 pb-8 pt-2 border-t border-gray-100">
              <motion.button
                whileTap={hasChanged ? { scale: 0.97 } : undefined}
                disabled={!hasChanged || saving}
                onClick={handleSave}
                className="w-full py-4 rounded-2xl text-base font-black text-white bg-bsp-blue disabled:opacity-40"
              >
                {saving ? 'Saving...' : 'Save'}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
