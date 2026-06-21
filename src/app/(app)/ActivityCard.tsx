'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

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
}: Props) {
  const router = useRouter()
  const [cardPressed, setCardPressed] = useState(false)
  const [btnPressed, setBtnPressed] = useState(false)

  const btnClass =
    buttonColor === 'orange'
      ? 'bg-[#FDBB6E] text-black shadow-[0_4px_12px_#FF87164D]'
      : 'bg-bsp-blue text-white'

  const posStyle =
    buttonPosition === 'center'
      ? { bottom: buttonBottom, left: '50%', transform: `translateX(-50%) scale(${btnPressed ? 0.9 : 1})` }
      : { bottom: buttonBottom, right: buttonRight, transform: `scale(${btnPressed ? 0.9 : 1})` }

  return (
    <div
      className="relative cursor-pointer transition-transform duration-150"
      style={{ transform: `scale(${cardPressed ? 0.97 : 1})` }}
      onPointerDown={() => setCardPressed(true)}
      onPointerUp={() => setCardPressed(false)}
      onPointerLeave={() => { setCardPressed(false); setBtnPressed(false) }}
      onClick={() => router.push(href)}
    >
      <Image
        src={imageSrc}
        alt={imageAlt}
        width={imageWidth}
        height={imageHeight}
        quality={100}
        className="w-full h-auto"
      />
      <div
        className="absolute w-24 transition-transform duration-100"
        style={posStyle}
        onPointerDown={(e) => {
          e.stopPropagation()
          setBtnPressed(true)
        }}
        onPointerUp={(e) => {
          e.stopPropagation()
          setBtnPressed(false)
        }}
        onClick={(e) => {
          e.stopPropagation()
          router.push(href)
        }}
      >
        <div className={`w-full ${btnClass} rounded-full py-2.5 text-xs font-semibold flex items-center justify-center gap-1`}>
          Jugar <span className="text-sm leading-none">›</span>
        </div>
      </div>
    </div>
  )
}
