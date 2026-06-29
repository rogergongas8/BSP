'use client'

import { useEffect } from 'react'

export default function OverscrollColor({ top, bottom }: { top: string; bottom: string }) {
  useEffect(() => {
    const prevTop = document.documentElement.style.backgroundColor
    const prevBottom = document.body.style.backgroundColor
    document.documentElement.style.backgroundColor = top
    document.body.style.backgroundColor = bottom
    return () => {
      document.documentElement.style.backgroundColor = prevTop
      document.body.style.backgroundColor = prevBottom
    }
  }, [top, bottom])
  return null
}
