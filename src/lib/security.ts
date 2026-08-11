import { NextRequest, NextResponse } from 'next/server'

/**
 * CSRF guard: rejects requests whose Origin (or, failing that, Referer) doesn't match
 * our own site. Browsers reliably send Origin on state-changing methods (POST/PUT/PATCH/
 * DELETE), but GET requests — including same-origin fetches, notably in Safari — often
 * omit it entirely. Falling back to Referer for GET keeps real CSRF protection on the
 * methods that need it without 403-ing legitimate same-origin reads.
 */
export function checkOrigin(request: NextRequest): NextResponse | null {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  const origin = request.headers.get('origin')

  if (origin) {
    if (origin !== siteUrl) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return null
  }

  // No Origin header: only acceptable for safe (GET/HEAD) requests, and only if Referer
  // confirms it came from our own site.
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const referer = request.headers.get('referer')
  if (!referer || !siteUrl || !referer.startsWith(siteUrl)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return null
}
