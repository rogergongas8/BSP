import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin } from '@/lib/security'
import { z } from 'zod'

const QuerySchema = z.object({
  battle_id: z.enum(['javi-zas', 'mimo-zas', 'javi-mimo-zas']),
  exclude:   z.string().optional(),
})

const UUID_RE = /^[0-9a-f-]{36}$/i

// javi-mimo-zas has no dedicated data — it draws from both underlying battles at random
const BATTLE_SOURCE_IDS: Record<string, string[]> = {
  'javi-zas':      ['javi-zas'],
  'mimo-zas':      ['mimo-zas'],
  'javi-mimo-zas': ['javi-zas', 'mimo-zas'],
}

export async function GET(request: NextRequest) {
  const originError = checkOrigin(request)
  if (originError) return originError

  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = QuerySchema.safeParse({
    battle_id: request.nextUrl.searchParams.get('battle_id'),
    exclude:   request.nextUrl.searchParams.get('exclude') ?? undefined,
  })
  if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 })

  const { battle_id, exclude } = parsed.data
  const sourceIds = BATTLE_SOURCE_IDS[battle_id]
  const excludeIds = exclude
    ? exclude.split(',').filter(id => UUID_RE.test(id))
    : []

  const supabase = createAdminClient()

  // Single round trip — see the note in /api/phrases/random.
  const { data, error } = await supabase
    .rpc('random_contrast_phrase', { p_battles: sourceIds, p_exclude: excludeIds })
    .maybeSingle()

  if (error || !data) return NextResponse.json({ error: 'No phrases found' }, { status: 404 })

  return NextResponse.json({ data })
}
