import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== process.env.NEXT_PUBLIC_SITE_URL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Generate unique code via DB function
  const { data: codeData, error: codeError } = await supabase
    .rpc('generate_room_code')
  if (codeError || !codeData) {
    return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 })
  }

  const code = codeData as string

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({ code, host_id: user.id })
    .select('id, code')
    .single()

  if (roomError || !room) {
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
  }

  // Auto-join the host
  await supabase
    .from('room_players')
    .insert({ room_id: room.id, user_id: user.id })

  return NextResponse.json({ data: room })
}
