import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const VALID_TENSES = ['indefinido', 'imperfecto', 'pretérito-perfecto'] as const
const VALID_SUBCATEGORIES = ['Regular', 'Irregular'] as const

const QuerySchema = z.object({
  tense:       z.enum(VALID_TENSES),
  subcategory: z.enum(VALID_SUBCATEGORIES).optional(),
})

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== process.env.NEXT_PUBLIC_SITE_URL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = QuerySchema.safeParse({
    tense:       request.nextUrl.searchParams.get('tense'),
    subcategory: request.nextUrl.searchParams.get('subcategory') ?? undefined,
  })
  if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 })

  const { tense, subcategory } = parsed.data

  const supabase = await createClient()
  const { data: mistakes, error: mistakesError } = await supabase
    .from('phrase_mistakes')
    .select('phrase_id, phrase_type')
    .eq('user_id', user.id)
    .eq('tense', tense)
    .is('resolved_at', null)
  if (mistakesError) return NextResponse.json({ error: 'Failed to load mistakes' }, { status: 500 })

  const filtered = subcategory
    ? mistakes.filter(m => (m.phrase_type.toLowerCase().includes('irreg') ? 'Irregular' : 'Regular') === subcategory)
    : mistakes

  const phraseIds = [...new Set(filtered.map(m => m.phrase_id))]
  if (phraseIds.length === 0) return NextResponse.json({ data: [] })

  const admin = createAdminClient()
  const { data: phrases, error: phrasesError } = await admin
    .from('phrases')
    .select('id, verb, sentence, answer, type, person, expected_stem, stem_group')
    .in('id', phraseIds)

  if (phrasesError) return NextResponse.json({ error: 'Failed to load phrases' }, { status: 500 })

  return NextResponse.json({ data: phrases })
}
