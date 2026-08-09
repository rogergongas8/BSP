import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import * as path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

const BATTLE_BY_CATEGORY: Record<string, string> = {
  'Perfecto / Indefinido, un verbo':        'javi-zas',
  'Indefinido / Imperfecto, dos verbos':    'mimo-zas',
}

async function seed() {
  const filePath = path.join(process.cwd(), 'docs', 'lio-de-tiempos', 'Output_Items_Contraste_Tiempos_1250_controlled_randomized.xlsx')
  const workbook = XLSX.readFile(filePath)
  const sheet = workbook.Sheets['Hoja1']
  const rows = XLSX.utils.sheet_to_json<{
    'Categoría 1': string
    'Frase': string
    'Infinitivo 1': string
    'Opción 1 hueco 1': string
    'Opción 2 hueco 1': string
    'Respuesta correcta hueco 1': number
    'Infinitivo 2': string | undefined
    'Opción 1 hueco 2': string | undefined
    'Opción 2 hueco 2': string | undefined
    'Respuesta correcta hueco 2': number | undefined
  }>(sheet)

  const seen = new Set<string>()
  const phrases = rows
    .filter(row => row['Frase'] && row['Opción 1 hueco 1'])
    .map(row => {
      const battleId = BATTLE_BY_CATEGORY[row['Categoría 1']]
      if (!battleId) return null
      return {
        battle_id:     battleId,
        sentence:      row['Frase'].trim(),
        infinitive_1:  row['Infinitivo 1'],
        option_a_1:    row['Opción 1 hueco 1'],
        option_b_1:    row['Opción 2 hueco 1'],
        correct_1:     row['Respuesta correcta hueco 1'],
        infinitive_2:  row['Infinitivo 2'] ?? null,
        option_a_2:    row['Opción 1 hueco 2'] ?? null,
        option_b_2:    row['Opción 2 hueco 2'] ?? null,
        correct_2:     row['Respuesta correcta hueco 2'] ?? null,
      }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .filter(p => { if (seen.has(p.sentence)) return false; seen.add(p.sentence); return true })

  console.log(`Seeding ${phrases.length} contrast phrases...`)
  const { error } = await supabase.from('contrast_phrases').upsert(phrases, { onConflict: 'sentence' })
  if (error) { console.error('Error seeding contrast phrases:', error.message); process.exit(1) }
  console.log(`✓ ${phrases.length} contrast phrases seeded`)
}

seed()
