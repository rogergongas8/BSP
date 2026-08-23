import { createClient } from '@/lib/supabase/server'
import { checkOrigin } from '@/lib/security'
import { checkAndAwardAchievements } from '@/lib/check-achievements'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const VALID_TENSES = ['indefinido', 'imperfecto', 'pretérito-perfecto'] as const

const PostBodySchema = z.object({
  phrase_id:   z.string().uuid(),
  tense:       z.enum(VALID_TENSES),
  phrase_type: z.string().min(1).max(60),
})

const PatchBodySchema = z.object({
  phrase_id: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  const originError = checkOrigin(request)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = PostBodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { phrase_id, tense, phrase_type } = parsed.data

  // RPC inserts with `on conflict do nothing`: a phrase that already has an open mistake is
  // skipped silently instead of raising a 23505 that would fill the Postgres log.
  const { error } = await supabase.rpc('record_phrase_mistake', {
    p_phrase_id:   phrase_id,
    p_tense:       tense,
    p_phrase_type: phrase_type,
  })

  if (error) return NextResponse.json({ error: 'Failed to save mistake' }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function PATCH(request: NextRequest) {
  const originError = checkOrigin(request)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = PatchBodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { error } = await supabase
    .from('phrase_mistakes')
    .update({ resolved_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('phrase_id', parsed.data.phrase_id)
    .is('resolved_at', null)

  if (error) return NextResponse.json({ error: 'Failed to resolve mistake' }, { status: 500 })

  const newAchievements = await checkAndAwardAchievements(user.id).catch(() => [] as string[])

  return NextResponse.json({ ok: true, newAchievements })
}

export async function GET(request: NextRequest) {
  const originError = checkOrigin(request)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('phrase_mistakes')
    .select('phrase_id, tense, phrase_type')
    .eq('user_id', user.id)
    .is('resolved_at', null)

  if (error) return NextResponse.json({ error: 'Failed to load mistakes' }, { status: 500 })

  return NextResponse.json({ data })
}
