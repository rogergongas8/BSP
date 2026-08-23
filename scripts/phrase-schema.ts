import { z } from 'zod'

/**
 * The phrase types the game can actually grade.
 *
 * `statusRowsFor` in src/lib/game-logic.ts branches on this exact string to decide which
 * correction rows a wrong answer gets. A value that is not in this list falls through to
 * the "single memorised form" branch and is graded against an empty form table, so every
 * row reads as wrong regardless of what the student typed.
 *
 * The seeders read `type` from a spreadsheet column, so a renamed or misspelled category
 * in the source file used to reach the database unchecked. Validating here keeps the
 * spreadsheets and the grader from drifting apart silently.
 */
export const PHRASE_TYPES = [
  'Indef_reg',
  'Indef_reg_gustar',
  'Indef_stem_irreg',
  'Indef_full_irreg_A',
  'Indef_full_irreg_B',
  'Imp_reg',
  'Imp_reg_gustar',
  'imp_irreg_A',
  'imp_irreg_B',
  'imp_irreg_C',
  'PP_reg',
  'PP_reg_gustar',
  'PP_irreg',
] as const

export const TENSES = ['indefinido', 'imperfecto', 'pretérito-perfecto'] as const

/** Person/number codes, as stored. */
export const PERSONS = ['1s', '2s', '3s', '1pl', '2pl', '3pl'] as const

export const phraseSchema = z.object({
  verb:          z.string().min(1),
  sentence:      z.string().min(1),
  answer:        z.string().min(1),
  type:          z.enum(PHRASE_TYPES),
  person:        z.enum(PERSONS),
  tense:         z.enum(TENSES),
  expected_stem: z.string().min(1).nullable(),
  stem_group:    z.string().min(1).nullable(),
})

export type SeedPhrase = z.infer<typeof phraseSchema>

// ─── answer ↔ person agreement ───────────────────────────────────────────────

const deaccent = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const AR_INDEF: Record<string, string> = { '1s': 'é', '2s': 'aste', '3s': 'ó', '1pl': 'amos', '2pl': 'asteis', '3pl': 'aron' }
const ER_INDEF: Record<string, string> = { '1s': 'í', '2s': 'iste', '3s': 'ió', '1pl': 'imos', '2pl': 'isteis', '3pl': 'ieron' }
const AR_IMP:   Record<string, string> = { '1s': 'aba', '2s': 'abas', '3s': 'aba', '1pl': 'ábamos', '2pl': 'abais', '3pl': 'aban' }
const ER_IMP:   Record<string, string> = { '1s': 'ía', '2s': 'ías', '3s': 'ía', '1pl': 'íamos', '2pl': 'íais', '3pl': 'ían' }
const HABER:    Record<string, string> = { '1s': 'he', '2s': 'has', '3s': 'ha', '1pl': 'hemos', '2pl': 'habéis', '3pl': 'han' }

/**
 * Does the stored `answer` actually inflect for the stored `person`?
 *
 * The shape checks above accept any row whose fields are the right *type*, so a row could
 * carry a perfectly valid answer under the wrong person. One did: an imperfecto row read
 * "…Diego, Héctor, Claudia y yo ___ juntos" with answer "comíamos" but person '3pl', because
 * the source spreadsheet says "Infinitivo: comer, nosotros" and "P/N: 3pl" in the same row.
 *
 * `person` drives the correction — the Person/Number row and its hint are judged against that
 * person's ending — so a mislabelled row tells a student their correct answer has the wrong
 * person. Migration 0036 fixed that row in the database; this check stops a re-seed from
 * reintroducing it, and catches any new one.
 *
 * Only the regular, fully predictable groups are checked. The irregular types are memorised
 * forms with no derivable ending, so there is nothing to verify against.
 */
function personMismatch(p: SeedPhrase): string | null {
  const answer = deaccent(p.answer.trim())
  const isAR = deaccent(p.verb).endsWith('ar')

  if (p.type === 'PP_reg' || p.type === 'PP_reg_gustar' || p.type === 'PP_irreg') {
    const aux = answer.split(/\s+/)[0] ?? ''
    const want = deaccent(HABER[p.person] ?? '')
    return aux && want && aux !== want
      ? `answer "${p.answer}" starts with "${aux}", but person ${p.person} takes "${HABER[p.person]}"`
      : null
  }

  const table =
    p.type === 'Indef_reg' || p.type === 'Indef_reg_gustar' ? (isAR ? AR_INDEF : ER_INDEF) :
    p.type === 'Imp_reg'   || p.type === 'Imp_reg_gustar'   ? (isAR ? AR_IMP   : ER_IMP)   :
    null
  if (!table) return null

  const want = deaccent(table[p.person] ?? '')
  if (!want || answer.endsWith(want)) return null

  const actual = Object.keys(table).find(k => answer.endsWith(deaccent(table[k])))
  return `answer "${p.answer}" does not end in "${table[p.person]}" for person ${p.person}` +
    (actual ? ` — it looks like ${actual}` : '')
}

/**
 * Validates every row before it reaches the database, reporting all bad rows at once
 * rather than dying on the first — a spreadsheet with a renamed category usually has the
 * same problem in many rows, and fixing them one run at a time is slow.
 */
export function validatePhrases(rows: unknown[], label: string): SeedPhrase[] {
  const ok: SeedPhrase[] = []
  const errors: string[] = []

  rows.forEach((row, i) => {
    const parsed = phraseSchema.safeParse(row)
    if (parsed.success) {
      ok.push(parsed.data)
      return
    }
    const detail = parsed.error.issues
      .map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ')
    errors.push(`  row ${i + 1}: ${detail}`)
  })

  // Cross-field agreement, once every row is known to be well-shaped.
  ok.forEach((row, i) => {
    const mismatch = personMismatch(row)
    if (mismatch) errors.push(`  row ${i + 1}: ${mismatch}`)
  })

  if (errors.length > 0) {
    console.error(`\n✗ ${label}: ${errors.length} invalid row(s) — nothing was seeded.`)
    console.error(errors.slice(0, 20).join('\n'))
    if (errors.length > 20) console.error(`  …and ${errors.length - 20} more`)
    process.exit(1)
  }

  return ok
}
