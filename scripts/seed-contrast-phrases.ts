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

/**
 * Drops the unstressed pronoun from an option when the sentence already supplies it right
 * before the gap, so "¿Os ___ pronto…?" does not read as "¿Os os fuisteis pronto…?".
 *
 * The workbook carries a handful of rows written that way. Migration 0033 fixed the rows that
 * were already in the database, but this seed upserts on `sentence`, so without the same rule
 * here a re-seed would put every one of them straight back.
 *
 * Only strips when the pronoun is genuinely duplicated: when the sentence does NOT lead with
 * one ("La cola ___ larga, así que ___"), the option has to keep its own ("me fui").
 */
const PRON = '(?:me|te|se|nos|os|le|les|lo|la|los|las)'

function stripDuplicatePronoun(
  sentence: string,
  gap: 1 | 2,
  optionA: string | null,
  optionB: string | null,
): [string | null, string | null] {
  if (!optionA || !optionB) return [optionA, optionB]

  const leading = new RegExp(`^(${PRON})\\s`, 'i')
  const pronoun = (optionA.match(leading) ?? optionB.match(leading))?.[1]?.toLowerCase()
  if (!pronoun) return [optionA, optionB]

  // Does the text before this gap already end with that same pronoun?
  const before = sentence.split('___')[gap - 1] ?? ''
  const trailing = before.match(new RegExp(`(?:^|[\\s¿¡("'‘“,.;:])(${PRON})\\s*$`, 'i'))
  if (trailing?.[1]?.toLowerCase() !== pronoun) return [optionA, optionB]

  const strip = (s: string) => s.replace(new RegExp(`^${PRON}\\s+`, 'i'), '')
  return [strip(optionA), strip(optionB)]
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
      const sentence = row['Frase'].trim()
      const [optionA1, optionB1] = stripDuplicatePronoun(sentence, 1, row['Opción 1 hueco 1'], row['Opción 2 hueco 1'])
      const [optionA2, optionB2] = stripDuplicatePronoun(sentence, 2, row['Opción 1 hueco 2'] ?? null, row['Opción 2 hueco 2'] ?? null)
      return {
        battle_id:     battleId,
        sentence,
        infinitive_1:  row['Infinitivo 1'],
        option_a_1:    optionA1!,
        option_b_1:    optionB1!,
        correct_1:     row['Respuesta correcta hueco 1'],
        infinitive_2:  row['Infinitivo 2'] ?? null,
        option_a_2:    optionA2,
        option_b_2:    optionB2,
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
