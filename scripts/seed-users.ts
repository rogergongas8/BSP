/**
 * Seeds test users with XP and achievements.
 * Run with: npx tsx scripts/seed-users.ts
 *
 * Requires SUPABASE_SECRET_KEY in .env.local
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey  = process.env.SUPABASE_SECRET_KEY!

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY')
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type SeedUser = {
  username: string
  pin: string
  total_xp: number
  streak: number
  activities_completed: number
  top3_finishes: number
  achievements: string[]
}

const USERS: SeedUser[] = [
  {
    username: 'akane',
    pin: '1234',
    total_xp: 232,
    streak: 3,
    activities_completed: 21,
    top3_finishes: 2,
    achievements: ['paso_a_paso', 'hola_de_nuevo', 'ni_un_fallo', 'reto_aceptado', 'cambio_de_look', 'campeones'],
  },
  {
    username: 'roger',
    pin: '1234',
    total_xp: 1420,
    streak: 12,
    activities_completed: 87,
    top3_finishes: 15,
    achievements: ['paso_a_paso', 'hola_de_nuevo', 'ni_un_fallo', 'reto_aceptado', 'cambio_de_look', 'campeones', 'no_paras', 'vaya_semana', 'podio'],
  },
  {
    username: 'carlos',
    pin: '1234',
    total_xp: 540,
    streak: 5,
    activities_completed: 34,
    top3_finishes: 4,
    achievements: ['paso_a_paso', 'cambio_de_look', 'hola_de_nuevo'],
  },
  {
    username: 'jana',
    pin: '1234',
    total_xp: 3200,
    streak: 28,
    activities_completed: 156,
    top3_finishes: 31,
    achievements: ['paso_a_paso', 'hola_de_nuevo', 'ni_un_fallo', 'reto_aceptado', 'cambio_de_look', 'campeones', 'no_paras', 'vaya_semana', 'podio', 'viajero_del_tiempo', 'vaya_leyenda', 'senor_del_tiempo'],
  },
]

async function seedUsers() {
  console.log('Seeding users...\n')

  for (const user of USERS) {
    const email = `${user.username}@bsp.internal`

    // Delete existing user if present (idempotent)
    const { data: existing } = await admin.auth.admin.listUsers()
    const found = existing?.users.find(u => u.email === email)
    if (found) {
      await admin.auth.admin.deleteUser(found.id)
      console.log(`  Deleted existing user: ${user.username}`)
    }

    // Create auth user
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: user.pin,
      email_confirm: true,
    })

    if (createError || !created.user) {
      console.error(`  ERROR creating ${user.username}:`, createError?.message)
      continue
    }

    const userId = created.user.id

    // Update profile (trigger auto-created it)
    const { error: profileError } = await admin
      .from('profiles')
      .update({
        total_xp:             user.total_xp,
        streak:               user.streak,
        activities_completed: user.activities_completed,
        top3_finishes:        user.top3_finishes,
      })
      .eq('id', userId)

    if (profileError) {
      console.error(`  ERROR updating profile for ${user.username}:`, profileError.message)
      continue
    }

    // Insert achievements
    if (user.achievements.length > 0) {
      const { error: achError } = await admin
        .from('user_achievements')
        .insert(
          user.achievements.map(achievement_id => ({ user_id: userId, achievement_id }))
        )

      if (achError) {
        console.error(`  ERROR inserting achievements for ${user.username}:`, achError.message)
        continue
      }
    }

    console.log(`  Created: ${user.username} | XP: ${user.total_xp} | Achievements: ${user.achievements.length}`)
  }

  console.log('\nDone.')
}

seedUsers()
