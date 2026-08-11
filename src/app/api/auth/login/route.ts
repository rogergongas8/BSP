import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin } from '@/lib/security'
import { clientIp, enforceRateLimit, loginLimiter } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const LoginSchema = z.object({
  username: z.string().min(1).max(30),
  pin: z.string().length(4).regex(/^\d{4}$/),
})

export async function POST(request: NextRequest) {
  const originError = checkOrigin(request)
  if (originError) return originError

  const rateLimitError = await enforceRateLimit(loginLimiter, clientIp(request))
  if (rateLimitError) return rateLimitError

  const body = await request.json().catch(() => null)
  const parsed = LoginSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { username, pin } = parsed.data
  const email = `${username.toLowerCase()}@bsp.internal`

  const supabase = await createClient()
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password: pin })

  if (authError) {
    return NextResponse.json({ error: 'Usuario o PIN incorrecto.' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
