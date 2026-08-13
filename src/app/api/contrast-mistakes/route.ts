import { createClient } from '@/lib/supabase/server'
import { checkOrigin } from '@/lib/security'
import { checkAndAwardAchievements } from '@/lib/check-achievements'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const VALID_BATTLES = ['javi-zas', 'mimo-zas', 'javi-mimo-zas'] as const

const PostBodySchema = z.object({
  contrast_phrase_id: z.string().uuid(),
  battle_id:          z.enum(VALID_BATTLES),
})

const PatchBodySchema = z.object({
  contrast_phrase_id: z.string().uuid(),
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

  const { contrast_phrase_id, battle_id } = parsed.data

  const { error } = await supabase
    .from('contrast_mistakes')
    .insert({ user_id: user.id, contrast_phrase_id, battle_id })

  // 23505 = this phrase already has an open mistake (unique index) — already tracked, not an error
  if (error && error.code !== '23505') {
    return NextResponse.json({ error: 'Failed to save mistake' }, { status: 500 })
  }

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
    .from('contrast_mistakes')
    .update({ resolved_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('contrast_phrase_id', parsed.data.contrast_phrase_id)
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
    .from('contrast_mistakes')
    .select('contrast_phrase_id, battle_id')
    .eq('user_id', user.id)
    .is('resolved_at', null)

  if (error) return NextResponse.json({ error: 'Failed to load mistakes' }, { status: 500 })

  return NextResponse.json({ data })
}
