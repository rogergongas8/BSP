import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin } from '@/lib/security'
import { clientIp, enforceRateLimit, loginIpLimiter, loginLimiter } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const LoginSchema = z.object({
  username: z.string().min(1).max(30),
  pin: z.string().length(4).regex(/^\d{4}$/),
})

export async function POST(request: NextRequest) {
  const originError = checkOrigin(request)
  if (originError) return originError

  // Loose per-IP cap first: blunts scripted spraying without needing to parse the body.
  const ipLimitError = await enforceRateLimit(loginIpLimiter, clientIp(request))
  if (ipLimitError) return ipLimitError

  const body = await request.json().catch(() => null)
  const parsed = LoginSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { username, pin } = parsed.data
  const email = `${username.toLowerCase()}@bsp.internal`

  // The real brute-force defence: throttle guesses against this specific account. Keyed on the
  // normalised username so "Roger" and "roger" share one budget and cannot double the attempts.
  const accountLimitError = await enforceRateLimit(loginLimiter, `user:${username.toLowerCase()}`)
  if (accountLimitError) return accountLimitError

  const supabase = await createClient()
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password: pin })

  if (authError) {
    return NextResponse.json({ error: 'Usuario o PIN incorrecto.' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
