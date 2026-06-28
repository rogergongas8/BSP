import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import * as path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

// Clean infinitive_form: remove markdown bold markers and extra whitespace
function cleanVerb(raw: string): string {
  return raw.replace(/\*\*/g, '').trim()
}

// Extract the stem letters from expected_stem field (e.g. "tuv-" → "tuv", "hiz-  [3s...]" → "hiz")
function cleanStem(raw: string | null | undefined): string | null {
  if (!raw) return null
  const match = raw.match(/^([a-záéíóúü]+)-/)
  return match ? match[1] : null
}

async function seedFullIrreg() {
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
    verb:          cleanVerb(row.Verbo),
    sentence:      row.Frase1.trim(),
    answer:        row.Respuesta,
    type:          row.tipo,
    person:        row['P/N'],
    tense:         'indefinido',
    expected_stem: null as string | null,
    stem_group:    null as string | null,
  }))

  console.log(`Seeding ${phrases.length} full_irreg phrases...`)
  const { error } = await supabase.from('phrases').upsert(phrases, { onConflict: 'id' })
  if (error) { console.error('Error seeding full_irreg:', error.message); process.exit(1) }
  console.log(`✓ ${phrases.length} full_irreg phrases seeded`)
}

async function seedStemIrreg() {
  const filePath = path.join(process.cwd(), 'docs', 'Indefinido_Indef_stem_irreg_150_DEF.xlsx')
  const workbook = XLSX.readFile(filePath)
  const sheet = workbook.Sheets['indef_stem_irreg']
  const rows = XLSX.utils.sheet_to_json<{
    Frase: string
    Respuesta: string
    infinitive_form: string
    expected_stem: string
    'P/N': string
    stem_group: string | null
  }>(sheet)

  const phrases = rows
    .filter(row => row.Frase && row.Respuesta)
    .map(row => ({
      verb:          cleanVerb(row.infinitive_form),
      sentence:      row.Frase.trim(),
      answer:        row.Respuesta,
      type:          'Indef_stem_irreg',
      person:        row['P/N'],
      tense:         'indefinido',
      expected_stem: cleanStem(row.expected_stem),
      stem_group:    row.stem_group ?? null,
    }))

  console.log(`Seeding ${phrases.length} stem_irreg phrases...`)
  const { error } = await supabase.from('phrases').upsert(phrases, { onConflict: 'id' })
  if (error) { console.error('Error seeding stem_irreg:', error.message); process.exit(1) }
  console.log(`✓ ${phrases.length} stem_irreg phrases seeded`)
}

async function seed() {
  await seedFullIrreg()
  await seedStemIrreg()
}

seed()
