import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import * as path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

function cleanVerb(raw: string): string {
  return raw.replace(/\*\*/g, '').trim()
}

async function seedPPIrreg() {
  const filePath = path.join(process.cwd(), 'docs', 'preterito perfecto', 'Presente_Perfecto_Irregular_150_DEF.xlsx')
  const workbook = XLSX.readFile(filePath)

  const verbsSheet = workbook.Sheets['Verbos utilizados']
  const verbRows = XLSX.utils.sheet_to_json<{ Verbo: string; Participio: string }>(verbsSheet)
  const verbByParticipio = new Map(verbRows.map(r => [r.Participio.trim(), cleanVerb(r.Verbo)]))

  const sheet = workbook.Sheets['Frases']
  const rows = XLSX.utils.sheet_to_json<{
    Frase: string
    Respuesta: string
    'aux_token: P/N': string
    'part_token: expected_irreg_stem': string
  }>(sheet, { range: 1 })

  // The sheet is grouped by verb: each group starts with a one-cell banner row (DECIR, HACER…)
  // followed by its own copy of the column headers. `range: 1` only skips the first banner, so
  // the 9 remaining header rows arrive as data — and they pass a plain truthiness check because
  // `Frase` holds the literal string "Frase". Drop them by value.
  const seenIrreg = new Set<string>()
  const phrases = rows
    .filter(row => row.Frase && row.Respuesta && row.Frase.trim() !== 'Frase')
    .map(row => {
      const participio = row['part_token: expected_irreg_stem'].trim()
      const verb = verbByParticipio.get(participio) ?? participio
      return {
        verb,
        sentence:      row.Frase.trim(),
        answer:        row.Respuesta.trim(),
        type:          'PP_irreg',
        person:        row['aux_token: P/N'],
        tense:         'pretérito-perfecto',
        expected_stem: participio,
        stem_group:    null as string | null,
      }
    })
    .filter(p => { if (seenIrreg.has(p.sentence)) return false; seenIrreg.add(p.sentence); return true })

  console.log(`Seeding ${phrases.length} PP_irreg phrases...`)
  const { error } = await supabase.from('phrases').upsert(phrases, { onConflict: 'sentence' })
  if (error) { console.error('Error seeding PP_irreg:', error.message); process.exit(1) }
  console.log(`✓ ${phrases.length} PP_irreg phrases seeded`)
}

async function seedPPReg() {
  // DEF-2 (17 Aug 2026) supersedes the original DEF export: 250 items instead of 245, and
  // nearly every sentence was rewritten — for many item numbers the verb, answer and
  // person changed too. It is a replacement batch, not an increment.
  const filePath = path.join(process.cwd(), 'docs', 'preterito perfecto', 'Presente_Perfecto_regulares_250_DEF-2.xlsx')
  const workbook = XLSX.readFile(filePath)
  const sheet = workbook.Sheets['Frases']
  const rows = XLSX.utils.sheet_to_json<{
    Verbo: string
    Frase: string
    Respuesta: string
    'aux_token: P/N': string
    'aux_token: gustar-type verb': string
  }>(sheet)

  const seenReg = new Set<string>()
  const phrases = rows
    .filter(row => row.Frase && row.Respuesta)
    .map(row => ({
      verb:          cleanVerb(row.Verbo),
      sentence:      row.Frase.trim(),
      answer:        row.Respuesta.trim(),
      type:          row['aux_token: gustar-type verb'] === 'Sí' ? 'PP_reg_gustar' : 'PP_reg',
      person:        row['aux_token: P/N'],
      tense:         'pretérito-perfecto',
      expected_stem: null as string | null,
      stem_group:    null as string | null,
    }))
    .filter(p => { if (seenReg.has(p.sentence)) return false; seenReg.add(p.sentence); return true })

  console.log(`Seeding ${phrases.length} PP_reg phrases...`)
  const { error } = await supabase.from('phrases').upsert(phrases, { onConflict: 'sentence' })
  if (error) { console.error('Error seeding PP_reg:', error.message); process.exit(1) }
  console.log(`✓ ${phrases.length} PP_reg phrases seeded`)
}

async function seed() {
  await seedPPIrreg()
  await seedPPReg()
}

seed()
