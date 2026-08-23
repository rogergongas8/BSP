'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Height (px) currently covered by the on-screen keyboard.
 *
 * `position: fixed` anchors to the *layout* viewport, which does not shrink when
 * the keyboard opens — so fixed bottom bars end up underneath it. This measures
 * the gap between the layout viewport's bottom and the visual viewport's bottom,
 * which is exactly the keyboard's occluded height.
 *
 * Precision matters more than speed here: iOS Safari fires `resize` on
 * visualViewport *continuously* while the keyboard slides, so the honest way to
 * stay glued to it is to re-render on every one of those events with **no CSS
 * transition** — any transition duration re-animates each intermediate value and
 * lands late. Reads are coalesced into a rAF so a burst of events costs one paint.
 *
 * `settling` is true only while a browser that reports the change as a single
 * jump (rather than a stream) is catching up — consumers use it to apply a short
 * easing in that case alone.
 */
export function useKeyboardOffset() {
  const [offset, setOffset] = useState(0)
  const [settling, setSettling] = useState(false)

  const rafRef = useRef<number | null>(null)
  const lastRef = useRef(0)
  const eventsRef = useRef(0)
  const streamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const measure = () => {
      rafRef.current = null
      const gap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      // Sub-pixel churn from rubber-band scrolling would otherwise repaint forever.
      if (Math.abs(gap - lastRef.current) < 0.5) return
      lastRef.current = gap
      setOffset(gap)
    }

    const schedule = () => {
      if (rafRef.current === null) rafRef.current = requestAnimationFrame(measure)
    }

    const onViewportChange = () => {
      // A browser that streams the keyboard animation sends many events in quick
      // succession; one that snaps sends a single one. Count them within a short
      // window to tell which we're dealing with, and only ease for the snapping kind.
      eventsRef.current += 1
      if (streamTimerRef.current) clearTimeout(streamTimerRef.current)
      streamTimerRef.current = setTimeout(() => {
        setSettling(eventsRef.current <= 2)
        eventsRef.current = 0
      }, 80)
      schedule()
    }

    vv.addEventListener('resize', onViewportChange)
    vv.addEventListener('scroll', onViewportChange)
    measure()

    return () => {
      vv.removeEventListener('resize', onViewportChange)
      vv.removeEventListener('scroll', onViewportChange)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      if (streamTimerRef.current) clearTimeout(streamTimerRef.current)
    }
  }, [])

  return { offset, settling }
}

/**
 * Style for a `fixed bottom-0` bar that should ride exactly on top of the keyboard.
 * Uses `transform` (compositor-only, no layout pass) rather than `bottom`.
 */
export function keyboardLiftStyle(offset: number, settling: boolean) {
  return {
    transform: `translate3d(0, ${-offset}px, 0)`,
    // Streamed events already carry the keyboard's own curve — transitioning them
    // would lag behind it. Only the single-jump case needs interpolation, and it
    // gets the platform keyboard easing (iOS uses this cubic-bezier).
    transition: settling ? 'transform 220ms cubic-bezier(0.17, 0.59, 0.4, 1)' : 'none',
    willChange: 'transform',
  } as const
}
