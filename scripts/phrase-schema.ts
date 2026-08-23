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

  if (errors.length > 0) {
    console.error(`\n✗ ${label}: ${errors.length} invalid row(s) — nothing was seeded.`)
    console.error(errors.slice(0, 20).join('\n'))
    if (errors.length > 20) console.error(`  …and ${errors.length - 20} more`)
    process.exit(1)
  }

  return ok
}
