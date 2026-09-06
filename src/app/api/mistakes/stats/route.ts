import { createClient } from '@/lib/supabase/server'
import { checkOrigin } from '@/lib/security'
import { NextRequest, NextResponse } from 'next/server'

// Aggregate mistake counts per singleplayer mode. Multiplayer is out of scope: Battle rounds
// never write to phrase_mistakes / contrast_mistakes, so there is nothing to aggregate there.
//
// "Total" counts every mistake ever recorded, resolved or not. A phrase failed, cleared, and
// failed again is two rows — two mistakes committed, one of them cleared — which is what the
// partial unique index (open rows only) is designed to allow.
export async function GET(request: NextRequest) {
  const originError = checkOrigin(request)
  if (originError) return originError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // head + exact count: Postgres returns the count only, never the rows.
  const countRows = (table: 'phrase_mistakes' | 'contrast_mistakes', clearedOnly: boolean) => {
    const query = supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    return clearedOnly ? query.not('resolved_at', 'is', null) : query
  }

  const [escTotal, escCleared, lioTotal, lioCleared] = await Promise.all([
    countRows('phrase_mistakes', false),
    countRows('phrase_mistakes', true),
    countRows('contrast_mistakes', false),
    countRows('contrast_mistakes', true),
  ])

  if (escTotal.error || escCleared.error || lioTotal.error || lioCleared.error) {
    return NextResponse.json({ error: 'Failed to load mistake stats' }, { status: 500 })
  }

  const summarise = (total: number | null, cleared: number | null) => {
    const t = total ?? 0
    const c = cleared ?? 0
    return { total: t, cleared: c, pct: t === 0 ? 0 : Math.round((c / t) * 100) }
  }

  return NextResponse.json({
    data: {
      escribiendo: summarise(escTotal.count, escCleared.count),
      lio:         summarise(lioTotal.count, lioCleared.count),
    },
  })
}
