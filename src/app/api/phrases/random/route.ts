import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const QuerySchema = z.object({
  tense:   z.string().min(1),
  exclude: z.string().optional(),
})

const UUID_RE = /^[0-9a-f-]{36}$/i

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== process.env.NEXT_PUBLIC_SITE_URL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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

  const pickRandom = async (withExclude: boolean) => {
    let countQ = supabase
      .from('phrases')
      .select('*', { count: 'exact', head: true })
      .eq('tense', tense)
    if (withExclude && excludeIds.length > 0)
      countQ = countQ.not('id', 'in', `(${excludeIds.join(',')})`)

    const { count } = await countQ
    if (!count) return null

    const offset = Math.floor(Math.random() * count)

    let dataQ = supabase
      .from('phrases')
      .select('id, verb, sentence, answer, type, person, expected_stem, stem_group')
      .eq('tense', tense)
    if (withExclude && excludeIds.length > 0)
      dataQ = dataQ.not('id', 'in', `(${excludeIds.join(',')})`)

    const { data, error } = await dataQ.range(offset, offset).single()
    return error ? null : data
  }

  // Try with exclusions first; fall back to unrestricted if pool exhausted
  const data = (await pickRandom(true)) ?? (await pickRandom(false))

  if (!data) return NextResponse.json({ error: 'No phrases found' }, { status: 404 })

  return NextResponse.json({ data })
}
