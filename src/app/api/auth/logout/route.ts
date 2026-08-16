import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin } from '@/lib/security'
import { createClient } from '@/lib/supabase/server'

/**
 * Ends the session. POST rather than GET so a stray <img> or prefetch cannot log the user
 * out, and origin-checked like every other mutating route.
 *
 * signOut() clears the auth cookies through the server client's cookie adapter, so the
 * response carries the expiry headers back to the browser.
 */
export async function POST(request: NextRequest) {
  const originError = checkOrigin(request)
  if (originError) return originError

  const supabase = await createClient()
  await supabase.auth.signOut()

  return NextResponse.json({ ok: true })
}
