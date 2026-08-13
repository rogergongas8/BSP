import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin } from '@/lib/security'
import { subcategoryFor } from '@/lib/game-logic'
import { z } from 'zod'

const VALID_TENSES = ['indefinido', 'imperfecto', 'pretérito-perfecto'] as const
const VALID_SUBCATEGORIES = ['Regular', 'Semi-irregular', 'Fully irregular', 'Irregular'] as const

const QuerySchema = z.object({
  tense:       z.enum(VALID_TENSES),
  subcategory: z.enum(VALID_SUBCATEGORIES).optional(),
})

export async function GET(request: NextRequest) {
  const originError = checkOrigin(request)
  if (originError) return originError

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
    ? mistakes.filter(m => subcategoryFor(tense, m.phrase_type) === subcategory)
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
