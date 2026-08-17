import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin } from '@/lib/security'
import { clientIp, enforceRateLimit, signupLimiter } from '@/lib/rate-limit'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { USERNAME_PROBLEM_MESSAGE, usernameToSlug, validateUsername } from '@/lib/username'

const SignupSchema = z.object({
  username: z.string().min(1).max(60),
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

  const { pin } = parsed.data
  const username = parsed.data.username.trim()

  // Accents are allowed in the name itself and only stripped for the internal address, so an
  // account for "José" no longer comes back as invalid input.
  const problem = validateUsername(username)
  if (problem) {
    return NextResponse.json({ error: USERNAME_PROBLEM_MESSAGE[problem] }, { status: 400 })
  }

  const slug = usernameToSlug(username)
  const email = `${slug}@bsp.internal`

  const admin = createAdminClient()

  // Availability is checked on the slug, not the raw text: "José" and "Jose" resolve to the same
  // login address, so allowing both would create an account nobody can sign in to.
  const { data: existing } = await admin
    .from('profiles')
    .select('username')
    .eq('username_slug', slug)
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

  // The profile trigger seeds `username` from the email local part, i.e. the slug. Overwrite it
  // with the text the user actually typed so their accents survive everywhere the name is shown.
  await admin
    .from('profiles')
    .update({ username })
    .eq('id', created.user.id)

  // Sign in the new user so the session cookie is set
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: pin })
  if (signInError) {
    return NextResponse.json({ error: 'Account created but sign-in failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
