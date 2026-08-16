'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'

/**
 * Shared chrome for /login and /signup: the logo above the form, and the peeking cat.
 *
 * The cat art is cropped down its right edge — the character is drawn leaning out from behind
 * something — so it only reads correctly with that cut edge against the right of the viewport.
 * Both PNGs were trimmed to remove the transparent padding they carried there (271px and 46px
 * respectively), which had held each cat away from the edge by a different amount.
 *
 * The wrapper needs `left-auto` alongside its `right-*` value: the parent is a flex column, so
 * an absolutely positioned child with no horizontal anchor falls back to its static position —
 * the left edge of the flex line — and the `right` offset never applies.
 *
 * It sits behind the form (`-z-10`) and is inert to pointer events, so it can overlap the
 * layout freely without ever intercepting a tap meant for an input.
 */
/**
 * Framing is expressed as inline style values, not Tailwind classes, on purpose.
 *
 * Tailwind only emits a rule for a class it can find as a literal string while scanning the
 * source. These values live inside an object and reach the element through a variable, so
 * arbitrary utilities like `w-[50%]` or `top-[45%]` are never seen by the scanner and no CSS
 * is generated for them — the element silently ignores them. (Scale utilities such as
 * `-right-11` appeared to work only because other files happen to use them.)
 */
const CATS: Record<string, {
  src: string
  width: number
  height: number
  alt: string
  /** Per-page framing: the two cats are drawn at different scales and crops. */
  style: React.CSSProperties
}> = {
  '/login': {
    src: '/images/login/logincat.png',
    width: 637,
    height: 1004,
    alt: '',
    style: { width: '90%', maxWidth: 410, bottom: 50, right: -120 },
  },
  '/signup': {
    src: '/images/login/registercat.png',
    width: 446,
    height: 1030,
    alt: '',
    style: { width: '50%', maxWidth: 195, bottom: 50, right: -44 },
  },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const cat = CATS[pathname]

  return (
    <>
      {/* Force body background to match so Safari's overscroll / gaps don't show white */}
      <style>{`html, body { background-color: #2F54BA !important; overflow: hidden; height: 100%; }`}</style>
      <div className="fixed inset-0 bg-bsp-blue flex flex-col pl-10 pr-6 pt-20 pb-8 overflow-hidden">
        <Image
          src="/images/login/logo.png"
          alt="BSP"
          width={310}
          height={66}
          priority
          className="w-[124px] h-auto mb-8"
        />

        {cat && (
          <div
            aria-hidden
            className="pointer-events-none absolute left-auto -z-10"
            style={cat.style}
          >
            <Image
              src={cat.src}
              alt={cat.alt}
              width={cat.width}
              height={cat.height}
              priority
              className="w-full h-auto"
            />
          </div>
        )}

        {children}
      </div>
    </>
  )
}
