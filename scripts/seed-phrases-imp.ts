import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import * as path from 'path'
import { validatePhrases } from './phrase-schema'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

function cleanVerb(raw: string): string {
  return raw.replace(/\*\*/g, '').trim()
}

async function seedImpIrreg() {
  const filePath = path.join(process.cwd(), 'docs', 'imperfecto', 'Imperfecto_imp_irreg_7_morfo_revised.xlsx')
  const workbook = XLSX.readFile(filePath)
  const sheet = workbook.Sheets['Hoja1']
  const rows = XLSX.utils.sheet_to_json<{
    Frase: string
    Respuesta: string
    infinitive_form: string
    'P/N': string
    'Categoría': string
  }>(sheet)

  const seen = new Set<string>()
  const phrases = rows
    .filter(row => row.Frase && row.Respuesta)
    .map(row => ({
      verb:          cleanVerb(row.infinitive_form),
      sentence:      row.Frase.trim(),
      answer:        row.Respuesta.trim(),
      type:          row['Categoría'],
      person:        row['P/N'],
      tense:         'imperfecto',
      expected_stem: null as string | null,
      stem_group:    null as string | null,
    }))
    .filter(p => { if (seen.has(p.sentence)) return false; seen.add(p.sentence); return true })

  const validated = validatePhrases(phrases, 'imp_irreg')

  console.log(`Seeding ${validated.length} imp_irreg phrases...`)
  const { error } = await supabase.from('phrases').upsert(validated, { onConflict: 'sentence' })
  if (error) { console.error('Error seeding imp_irreg:', error.message); process.exit(1) }
  console.log(`✓ ${phrases.length} imp_irreg phrases seeded`)
}

async function seedImpReg() {
  const filePath = path.join(process.cwd(), 'docs', 'imperfecto', 'Imperfecto_imp_reg_7_morfo_revised.xlsx')
  const workbook = XLSX.readFile(filePath)
  const sheet = workbook.Sheets['Hoja1']
  const rows = XLSX.utils.sheet_to_json<{
    Frase: string
    Respuesta: string
    infinitive_form: string
    'P/N': string
    'Categoría': string | undefined
  }>(sheet)

  const seen = new Set<string>()
  const phrases = rows
    .filter(row => row.Frase && row.Respuesta)
    .map(row => ({
      verb:          cleanVerb(row.infinitive_form),
      sentence:      row.Frase.trim(),
      answer:        row.Respuesta.trim(),
      type:          row['Categoría'] === 'gustar-type verb' ? 'Imp_reg_gustar' : 'Imp_reg',
      person:        row['P/N'],
      tense:         'imperfecto',
      expected_stem: null as string | null,
      stem_group:    null as string | null,
    }))
    .filter(p => { if (seen.has(p.sentence)) return false; seen.add(p.sentence); return true })

  const validated = validatePhrases(phrases, 'imp_reg')

  console.log(`Seeding ${validated.length} imp_reg phrases...`)
  const { error } = await supabase.from('phrases').upsert(validated, { onConflict: 'sentence' })
  if (error) { console.error('Error seeding imp_reg:', error.message); process.exit(1) }
  console.log(`✓ ${phrases.length} imp_reg phrases seeded`)
}

async function seed() {
  await seedImpIrreg()
  await seedImpReg()
}

seed()
