import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin } from '@/lib/security'
import { z } from 'zod'

const QuerySchema = z.object({
  tense:   z.string().min(1),
  exclude: z.string().optional(),
})

const UUID_RE = /^[0-9a-f-]{36}$/i

export async function GET(request: NextRequest) {
  const originError = checkOrigin(request)
  if (originError) return originError

  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = QuerySchema.safeParse({
    tense:   request.nextUrl.searchParams.get('tense'),
    exclude: request.nextUrl.searchParams.get('exclude') ?? undefined,
  })
  if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 })

  const { tense, exclude } = parsed.data
  const excludeIds = exclude
    ? exclude.split(',').filter(id => UUID_RE.test(id))
    : []

  const supabase = createAdminClient()

  // Single round trip: the RPC does the exclusion, the fallback-to-full-pool and the random
  // pick inside Postgres. This replaced a COUNT followed by an OFFSET query (and a second
  // pair of those whenever the unseen pool ran out) — the hottest query during a class.
  const { data, error } = await supabase
    .rpc('random_phrase', { p_tense: tense, p_exclude: excludeIds })
    .maybeSingle()

  if (error || !data) return NextResponse.json({ error: 'No phrases found' }, { status: 404 })

  return NextResponse.json({ data })
}
