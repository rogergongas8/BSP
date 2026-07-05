import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

function generateCode(): string {
  return Math.floor(Math.random() * 10000).toString().padStart(4, '0')
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== process.env.NEXT_PUBLIC_SITE_URL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    .insert({ code, host_id: user.id })
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
