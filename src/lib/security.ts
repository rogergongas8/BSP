import { NextRequest, NextResponse } from 'next/server'

/**
 * Rejects cross-origin requests AND requests missing the Origin header entirely.
 * Browsers always send Origin on same-site fetch/XHR for state-changing methods,
 * so a missing header here means the request didn't come from our own client.
 */
export function checkOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin')
  if (origin !== process.env.NEXT_PUBLIC_SITE_URL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}
