'use client'

import { useEffect, useState } from 'react'

/** The root font-size the design is drawn at — a 430px-wide iPhone renders at exactly this. */
const BASE_REM_PX = 16

/**
 * How much the fluid root has shrunk the UI on this screen, as a multiplier.
 *
 * `html { font-size: clamp(13px, 3.72vw, 16px) }` (globals.css) scales everything expressed in
 * `rem` — which is every Tailwind spacing and type utility. Sizes that live as plain numbers in
 * JavaScript never see it: the carousels drive their card width, track height and drag maths off
 * pixel constants, so they alone stayed desktop-sized on a small phone while the layout around
 * them shrank. Multiplying those constants by this factor puts them back on the same ruler.
 *
 * Returns 1 on a 430px-or-wider screen (and during SSR, where there is nothing to measure), so
 * the reference device is untouched.
 */
export function useRemScale(): number {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const read = () => {
      const px = parseFloat(getComputedStyle(document.documentElement).fontSize)
      // A failed parse would silently collapse every measurement to 0.
      setScale(Number.isFinite(px) && px > 0 ? px / BASE_REM_PX : 1)
    }
    read()
    window.addEventListener('resize', read)
    return () => window.removeEventListener('resize', read)
  }, [])

  return scale
}
