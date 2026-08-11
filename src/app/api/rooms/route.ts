import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin } from '@/lib/security'
import { enforceRateLimit, roomCreateLimiter } from '@/lib/rate-limit'
import { z } from 'zod'

const VALID_TENSES = ['indefinido', 'imperfecto', 'pretérito-perfecto'] as const
const VALID_BATTLES = ['javi-zas', 'mimo-zas', 'javi-mimo-zas'] as const

const BodySchema = z.discriminatedUnion('game_type', [
  z.object({ game_type: z.literal('escribiendo'), game_mode: z.enum(VALID_TENSES) }),
  z.object({ game_type: z.literal('contraste'),   game_mode: z.enum(VALID_BATTLES) }),
])

function generateCode(): string {
  return Math.floor(Math.random() * 10000).toString().padStart(4, '0')
}

export async function POST(request: NextRequest) {
  const originError = checkOrigin(request)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rateLimitError = await enforceRateLimit(roomCreateLimiter, user.id)
  if (rateLimitError) return rateLimitError

  const body = await request.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { game_type, game_mode } = parsed.data

  const admin = createAdminClient()

  // Generate a unique code — retry until we find one not in use
  let code = ''
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = generateCode()
    const { count } = await admin
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('code', candidate)
      .neq('status', 'finished')
    if ((count ?? 0) === 0) { code = candidate; break }
  }

  if (!code) {
    return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 })
  }

  const { data: room, error: roomError } = await admin
    .from('rooms')
    .insert({ code, host_id: user.id, game_type, game_mode })
    .select('id, code')
    .single()

  if (roomError || !room) {
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
  }

  // Auto-join the host
  await admin
    .from('room_players')
    .insert({ room_id: room.id, user_id: user.id })

  return NextResponse.json({ data: room })
}
