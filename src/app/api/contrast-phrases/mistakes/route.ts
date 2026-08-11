import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin } from '@/lib/security'
import { z } from 'zod'

const VALID_BATTLES = ['javi-zas', 'mimo-zas', 'javi-mimo-zas'] as const

const QuerySchema = z.object({
  battle_id: z.enum(VALID_BATTLES),
})

export async function GET(request: NextRequest) {
  const originError = checkOrigin(request)
  if (originError) return originError

  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = QuerySchema.safeParse({
    battle_id: request.nextUrl.searchParams.get('battle_id'),
  })
  if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 })

  const { battle_id } = parsed.data

  const supabase = await createClient()
  const { data: mistakes, error: mistakesError } = await supabase
    .from('contrast_mistakes')
    .select('contrast_phrase_id')
    .eq('user_id', user.id)
    .eq('battle_id', battle_id)
    .is('resolved_at', null)
  if (mistakesError) return NextResponse.json({ error: 'Failed to load mistakes' }, { status: 500 })

  const phraseIds = [...new Set(mistakes.map(m => m.contrast_phrase_id))]
  if (phraseIds.length === 0) return NextResponse.json({ data: [] })

  const admin = createAdminClient()
  const { data: phrases, error: phrasesError } = await admin
    .from('contrast_phrases')
    .select('id, battle_id, sentence, infinitive_1, option_a_1, option_b_1, correct_1, infinitive_2, option_a_2, option_b_2, correct_2')
    .in('id', phraseIds)

  if (phrasesError) return NextResponse.json({ error: 'Failed to load phrases' }, { status: 500 })

  return NextResponse.json({ data: phrases })
}
