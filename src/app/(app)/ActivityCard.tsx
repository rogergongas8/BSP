'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'

type Props = {
  href: string
  imageSrc: string
  imageAlt: string
  imageWidth: number
  imageHeight: number
  buttonColor?: 'orange' | 'blue'
  buttonPosition?: 'center' | 'right'
  buttonBottom?: string
  buttonRight?: string
  buttonWidth?: string
}

export default function ActivityCard({
  href,
  imageSrc,
  imageAlt,
  imageWidth,
  imageHeight,
  buttonColor = 'orange',
  buttonPosition = 'center',
  buttonBottom = '10%',
  buttonRight = '10%',
  buttonWidth = 'w-24',
}: Props) {
  const router = useRouter()

  const btnClass =
    buttonColor === 'orange'
      ? 'bg-[#FDBB6E] text-black shadow-[0_4px_12px_#FF87164D] py-2.5'
      : 'bg-bsp-blue text-white shadow-[0_4px_12px_#2F54BA4D] py-[11px]'

  const posClass = buttonPosition === 'center'
    ? 'left-1/2 -translate-x-1/2'
    : ''
    
  const posStyle = buttonPosition === 'center'
    ? { bottom: buttonBottom }
    : { bottom: buttonBottom, right: buttonRight }

  const [isPressed, setIsPressed] = useState(false)

  return (
    <motion.div
      className="relative cursor-pointer"
      animate={{ scale: isPressed ? 0.96 : 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerLeave={() => setIsPressed(false)}
      onPointerCancel={() => setIsPressed(false)}
      onClick={() => router.push(href)}
    >
      <Image
        src={imageSrc}
        alt={imageAlt}
        width={imageWidth}
        height={imageHeight}
        quality={100}
        unoptimized
        draggable={false}
        className="w-full h-auto select-none drop-shadow-sm"
      />
      <motion.div
        className={`absolute ${buttonWidth} ${posClass}`}
        style={posStyle}
        whileTap={{ scale: 0.9 }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          router.push(href)
        }}
      >
        <div className={`w-full ${btnClass} rounded-full text-xs font-semibold flex items-center justify-center gap-1`}>
          Jugar <span className="text-sm leading-none">›</span>
        </div>
      </motion.div>
    </motion.div>
  )
}
