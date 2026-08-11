'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'motion/react'
import { isAvatarId, resolveAvatarPath, type AvatarId } from '@/lib/avatars'
import AvatarPickerModal from './AvatarPickerModal'

export default function ProfileAvatar({
  avatarId, fallbackImagePath,
}: {
  avatarId: string | null
  fallbackImagePath: string
}) {
  const [open, setOpen] = useState(false)
  const currentAvatarId: AvatarId | null = avatarId && isAvatarId(avatarId) ? avatarId : null
  const imageSrc = resolveAvatarPath(avatarId, fallbackImagePath)

  return (
    <>
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen(true)}
        className="relative shrink-0"
      >
        <div className="w-20 h-20 rounded-full overflow-hidden bg-white/20 p-2.5">
          <Image src={imageSrc} alt="Avatar" width={80} height={80} className="w-full h-full object-contain" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
          <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
            <path d="M7 1L9 3L3.5 8.5L1 9L1.5 6.5L7 1Z" stroke="#374151" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </motion.button>

      <AvatarPickerModal
        open={open}
        onClose={() => setOpen(false)}
        currentAvatarId={currentAvatarId}
      />
    </>
  )
}
