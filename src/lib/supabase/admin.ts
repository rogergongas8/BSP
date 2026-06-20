import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Server-side only — bypasses RLS. Never import from Client Components.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
