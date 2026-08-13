import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin } from '@/lib/security'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const originError = checkOrigin(request)
  if (originError) return originError

  if (!/^[0-9]{4}$/.test(code)) {
    return NextResponse.json({ error: 'Invalid room code' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: room } = await admin
    .from('rooms')
    .select('id, host_id, status')
    .eq('code', code)
    .single()

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  await admin.from('room_players').delete().eq('room_id', room.id).eq('user_id', user.id)

  // Host leaving mid-game ends it for everyone — there's no one left to run the round timeline.
  if (room.host_id === user.id && room.status === 'playing') {
    await admin.from('rooms').update({ status: 'finished' }).eq('id', room.id)
  }

  return NextResponse.json({ ok: true })
}
