/**
 * Seeds the revised indefinido phrase set (570 rows across three workbooks).
 *
 * Replaces scripts/seed-phrases.ts, which targeted the earlier drop. The revised workbooks
 * differ in shape, so the column mapping is not shared with the old script:
 *
 *   | field         | old workbooks      | revised workbooks        |
 *   |---------------|--------------------|--------------------------|
 *   | sheet name    | indef_reg_300, …   | Hoja1 (all three)        |
 *   | verb (reg)    | infinitive_form    | Infinitive               |
 *   | stem_group    | stem_group column  | absent — derived below   |
 *   | expected_stem | expected_stem col  | absent in reg workbook   |
 *
 * `type` and `stem_group` values must match what src/lib/game-logic.ts validates against —
 * a typo here silently marks correct answers wrong, so the known-good sets are asserted
 * before anything is written.
 */
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import * as path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

const DRY_RUN = !process.argv.includes('--confirm')

type PhraseRow = {
  verb: string
  sentence: string
  answer: string
  type: string
  person: string
  tense: string
  expected_stem: string | null
  stem_group: string | null
}

/** Mirrors game-logic.ts: any value outside these sets breaks answer validation. */
const VALID_TYPES = new Set([
  'Indef_reg',
  'Indef_reg_gustar',
  'Indef_stem_irreg',
  'Indef_full_irreg_A',
  'Indef_full_irreg_B',
])
const VALID_STEM_GROUPS = new Set([
  'Reg_default_stem',
  'Reg_change_stem_3s3pl',
  'Reg_change_stem_1s_car',
  'Reg_change_stem_1s_gar',
  'Reg_change_stem_1s_zar',
])
const VALID_PERSONS = new Set(['1s', '2s', '3s', '1pl', '2pl', '3pl'])

const docs = (file: string) => path.join(process.cwd(), 'docs', 'indefinido', file)

function readSheet<T>(file: string): T[] {
  const workbook = XLSX.readFile(docs(file))
  return XLSX.utils.sheet_to_json<T>(workbook.Sheets[workbook.SheetNames[0]])
}

/** Strips markdown bold left over from the source documents. */
function cleanVerb(raw: string): string {
  return raw.replace(/\*\*/g, '').trim()
}

/**
 * "tuv-" -> "tuv", and "hiz- [3s special spelling: hiz-]" -> "hiz".
 * The bracketed note is editorial, not part of the stem.
 */
function cleanStem(raw: string | null | undefined): string | null {
  if (!raw) return null
  const match = String(raw).match(/^([a-záéíóúü]+)-/i)
  return match ? match[1] : null
}

function loadRegulars(): PhraseRow[] {
  const rows = readSheet<{
    Frase: string
    Respuesta: string
    Infinitive: string
    'P/N': string
    tipo: string
    stem_type: string
  }>('Indefinido_indef_reg_355_revised_DEF.xlsx')

  return rows
    .filter(r => r.Frase && r.Respuesta)
    .map(r => ({
      verb:     cleanVerb(r.Infinitive),
      sentence: String(r.Frase).trim(),
      answer:   String(r.Respuesta).trim(),
      // The workbook marks gustar-type verbs in `tipo`; everything else is a plain regular.
      type:     r.tipo === 'gustar-type verb' ? 'Indef_reg_gustar' : 'Indef_reg',
      person:   r['P/N'],
      tense:    'indefinido',
      // Regulars carry no explicit stem: game-logic derives it from the infinitive.
      expected_stem: null,
      stem_group:    r.stem_type ?? 'Reg_default_stem',
    }))
}

function loadFullIrregulars(): PhraseRow[] {
  const rows = readSheet<{
    Verbo: string
    Frase: string
    Respuesta: string
    tipo: string
    'P/N': string
  }>('Indefinido_full_irreg_65_revised_DEF.xlsx')

  return rows
    .filter(r => r.Frase && r.Respuesta)
    .map(r => ({
      verb:     cleanVerb(r.Verbo),
      sentence: String(r.Frase).trim(),
      answer:   String(r.Respuesta).trim(),
      type:     r.tipo,
      person:   r['P/N'],
      tense:    'indefinido',
      expected_stem: null,
      stem_group:    null,
    }))
}

function loadStemIrregulars(): PhraseRow[] {
  const rows = readSheet<{
    Frase: string
    Respuesta: string
    infinitive_form: string
    expected_stem: string
    'P/N': string
  }>('Indefinido_Indef_stem_irreg_150_DEF-2.xlsx')

  return rows
    .filter(r => r.Frase && r.Respuesta)
    .map(r => ({
      verb:     cleanVerb(r.infinitive_form),
      sentence: String(r.Frase).trim(),
      answer:   String(r.Respuesta).trim(),
      type:     'Indef_stem_irreg',
      person:   r['P/N'],
      tense:    'indefinido',
      expected_stem: cleanStem(r.expected_stem),
      stem_group:    null,
    }))
}

/**
 * Fails loudly rather than seeding data the game cannot validate. A bad `type` does not
 * error at insert time — it surfaces later as correct answers being marked wrong.
 */
function validate(phrases: PhraseRow[]): void {
  const problems: string[] = []

  for (const p of phrases) {
    if (!VALID_TYPES.has(p.type)) problems.push(`unknown type "${p.type}" — ${p.sentence}`)
    if (!VALID_PERSONS.has(p.person)) problems.push(`unknown person "${p.person}" — ${p.sentence}`)
    if (p.stem_group && !VALID_STEM_GROUPS.has(p.stem_group))
      problems.push(`unknown stem_group "${p.stem_group}" — ${p.sentence}`)
    if (!p.sentence.includes('___')) problems.push(`no ___ gap — ${p.sentence}`)
    if (!p.verb) problems.push(`empty verb — ${p.sentence}`)
    if (p.type === 'Indef_stem_irreg' && !p.expected_stem)
      problems.push(`stem_irreg without expected_stem — ${p.sentence}`)
  }

  if (problems.length > 0) {
    console.error(`✗ ${problems.length} invalid rows:`)
    for (const p of problems.slice(0, 20)) console.error('   ', p)
    if (problems.length > 20) console.error(`    …and ${problems.length - 20} more`)
    process.exit(1)
  }
}

/**
 * `phrases.sentence` is unique, so two rows sharing a sentence would collapse on insert and
 * one answer key would win arbitrarily. Reported rather than silently resolved: which answer
 * is correct is an editorial decision, not one this script should make.
 */
function reportDuplicates(phrases: PhraseRow[]): void {
  const bySentence = new Map<string, PhraseRow[]>()
  for (const p of phrases) {
    const list = bySentence.get(p.sentence) ?? []
    list.push(p)
    bySentence.set(p.sentence, list)
  }

  const dups = [...bySentence.entries()].filter(([, list]) => list.length > 1)
  if (dups.length === 0) return

  console.warn(`\n⚠  ${dups.length} duplicated sentence(s) — only one row per sentence can be stored:`)
  for (const [sentence, list] of dups) {
    console.warn(`   "${sentence}"`)
    for (const p of list) console.warn(`      ${p.verb} → ${p.answer} (${p.person}, ${p.type})`)
  }
  console.warn('   Resolve in the workbook, or the last one processed wins.\n')
}

async function main() {
  const phrases = [...loadRegulars(), ...loadFullIrregulars(), ...loadStemIrregulars()]

  console.log('Loaded from workbooks:')
  const byType = new Map<string, number>()
  for (const p of phrases) byType.set(p.type, (byType.get(p.type) ?? 0) + 1)
  for (const [type, n] of [...byType].sort()) console.log(`  ${type.padEnd(22)} ${String(n).padStart(4)}`)
  console.log(`  ${''.padEnd(22)} ${String(phrases.length).padStart(4)} total\n`)

  validate(phrases)
  console.log('✓ all rows valid for game-logic')
  reportDuplicates(phrases)

  const { count: existing } = await supabase
    .from('phrases')
    .select('*', { count: 'exact', head: true })
    .eq('tense', 'indefinido')

  console.log(`indefinido rows currently in DB: ${existing ?? 0}`)

  if (DRY_RUN) {
    console.log('\n── DRY RUN — nothing written. Re-run with --confirm to seed. ──')
    return
  }

  // Upsert on `sentence`: safe to re-run, and if the purge already emptied the table this is
  // a plain insert. Chunked because a single 570-row payload is large enough to hit limits.
  const CHUNK = 200
  let written = 0
  for (let i = 0; i < phrases.length; i += CHUNK) {
    const chunk = phrases.slice(i, i + CHUNK)
    const { error } = await supabase.from('phrases').upsert(chunk, { onConflict: 'sentence' })
    if (error) {
      console.error(`✗ chunk at ${i}: ${error.message}`)
      process.exit(1)
    }
    written += chunk.length
    console.log(`  …${written}/${phrases.length}`)
  }

  const { count: final } = await supabase
    .from('phrases')
    .select('*', { count: 'exact', head: true })
    .eq('tense', 'indefinido')

  console.log(`\n✓ seeded. indefinido rows in DB: ${final ?? 0}`)
}

main()
