import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin } from '@/lib/security'

/** Same as /api/phrases/mistakes but pooled across every tense — backs the "Redo all" mixed session. */
export async function GET(request: NextRequest) {
  const originError = checkOrigin(request)
  if (originError) return originError

  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const { data: mistakes, error: mistakesError } = await supabase
    .from('phrase_mistakes')
    .select('phrase_id')
    .eq('user_id', user.id)
    .is('resolved_at', null)
  if (mistakesError) return NextResponse.json({ error: 'Failed to load mistakes' }, { status: 500 })

  const phraseIds = [...new Set(mistakes.map(m => m.phrase_id))]
  if (phraseIds.length === 0) return NextResponse.json({ data: [] })

  const admin = createAdminClient()
  const { data: phrases, error: phrasesError } = await admin
    .from('phrases')
    .select('id, verb, sentence, answer, type, person, expected_stem, stem_group, tense')
    .in('id', phraseIds)

  if (phrasesError) return NextResponse.json({ error: 'Failed to load phrases' }, { status: 500 })

  return NextResponse.json({ data: phrases })
}
