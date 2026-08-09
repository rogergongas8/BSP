import { createClient } from '@/lib/supabase/server'
import { AVATAR_IDS } from '@/lib/avatars'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const BodySchema = z.object({
  avatar_id: z.enum(AVATAR_IDS),
})

export async function PATCH(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== process.env.NEXT_PUBLIC_SITE_URL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_id: parsed.data.avatar_id })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: 'Failed to update avatar' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
