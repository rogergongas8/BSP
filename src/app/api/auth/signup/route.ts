import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin } from '@/lib/security'
import { clientIp, enforceRateLimit, signupLimiter } from '@/lib/rate-limit'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const SignupSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/i),
  pin: z.string().length(4).regex(/^\d{4}$/),
})

export async function POST(request: NextRequest) {
  const originError = checkOrigin(request)
  if (originError) return originError

  const rateLimitError = await enforceRateLimit(signupLimiter, clientIp(request))
  if (rateLimitError) return rateLimitError

  const body = await request.json().catch(() => null)
  const parsed = SignupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { username, pin } = parsed.data
  const email = `${username.toLowerCase()}@bsp.internal`

  const admin = createAdminClient()

  // Check username availability
  const { data: existing } = await admin
    .from('profiles')
    .select('username')
    .eq('username', username.toLowerCase())
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
  }

  // Create user — email_confirm: true skips confirmation email
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: pin,
    email_confirm: true,
  })

  if (createError || !created.user) {
    return NextResponse.json({ error: 'Could not create account' }, { status: 500 })
  }

  // Sign in the new user so the session cookie is set
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: pin })
  if (signInError) {
    return NextResponse.json({ error: 'Account created but sign-in failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
