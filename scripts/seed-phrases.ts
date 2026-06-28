import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import * as path from 'path'
import * as fs from 'fs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

const TENSE_MAP: Record<string, string> = {
  Indef_full_irreg_A: 'indefinido',
  Indef_full_irreg_B: 'indefinido',
}

async function seed() {
  const filePath = path.join(process.cwd(), 'docs', 'Indefinido_full_irreg_50_DEF.xlsx')
  const workbook = XLSX.readFile(filePath)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<{
    Verbo: string
    Frase1: string
    Respuesta: string
    tipo: string
    'P/N': string
  }>(sheet)

  const phrases = rows.map(row => ({
    verb:     row.Verbo,
    sentence: row.Frase1,
    answer:   row.Respuesta,
    type:     row.tipo,
    person:   row['P/N'],
    tense:    TENSE_MAP[row.tipo] ?? 'indefinido',
  }))

  console.log(`Seeding ${phrases.length} phrases...`)

  const { error } = await supabase.from('phrases').upsert(phrases, { onConflict: 'id' })

  if (error) {
    console.error('Error seeding:', error.message)
    process.exit(1)
  }

  console.log(`✓ ${phrases.length} phrases seeded successfully`)
}

seed()
