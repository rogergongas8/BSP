import { createClient } from '@/lib/supabase/server'
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

function checkOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  return !origin || origin === process.env.NEXT_PUBLIC_SITE_URL
}

export async function POST(request: NextRequest) {
  if (!checkOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = PostBodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { phrase_id, tense, phrase_type } = parsed.data

  const { error } = await supabase
    .from('phrase_mistakes')
    .insert({ user_id: user.id, phrase_id, tense, phrase_type })

  if (error) return NextResponse.json({ error: 'Failed to save mistake' }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function PATCH(request: NextRequest) {
  if (!checkOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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

  return NextResponse.json({ ok: true })
}

export async function GET(request: NextRequest) {
  if (!checkOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
