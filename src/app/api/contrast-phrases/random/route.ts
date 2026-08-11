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

  const pickRandom = async (withExclude: boolean) => {
    let countQ = supabase
      .from('contrast_phrases')
      .select('*', { count: 'exact', head: true })
      .in('battle_id', sourceIds)
    if (withExclude && excludeIds.length > 0)
      countQ = countQ.not('id', 'in', excludeIds)

    const { count } = await countQ
    if (!count) return null

    const offset = Math.floor(Math.random() * count)

    let dataQ = supabase
      .from('contrast_phrases')
      .select('id, battle_id, sentence, infinitive_1, option_a_1, option_b_1, correct_1, infinitive_2, option_a_2, option_b_2, correct_2')
      .in('battle_id', sourceIds)
    if (withExclude && excludeIds.length > 0)
      dataQ = dataQ.not('id', 'in', excludeIds)

    const { data, error } = await dataQ.range(offset, offset).single()
    return error ? null : data
  }

  // Try with exclusions first; fall back to unrestricted if pool exhausted
  const data = (await pickRandom(true)) ?? (await pickRandom(false))

  if (!data) return NextResponse.json({ error: 'No phrases found' }, { status: 404 })

  return NextResponse.json({ data })
}
