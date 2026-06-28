import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const QuerySchema = z.object({
  tense: z.string().min(1),
})

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== process.env.NEXT_PUBLIC_SITE_URL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = QuerySchema.safeParse({ tense: request.nextUrl.searchParams.get('tense') })
  if (!parsed.success) return NextResponse.json({ error: 'Invalid tense' }, { status: 400 })

  const supabase = createAdminClient()

  const { count } = await supabase
    .from('phrases')
    .select('*', { count: 'exact', head: true })
    .eq('tense', parsed.data.tense)

  if (!count) return NextResponse.json({ error: 'No phrases found' }, { status: 404 })

  const offset = Math.floor(Math.random() * count)

  const { data, error } = await supabase
    .from('phrases')
    .select('id, verb, sentence, answer, type, person')
    .eq('tense', parsed.data.tense)
    .range(offset, offset)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ data })
}
