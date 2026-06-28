export type Phrase = {
  id: string
  verb: string
  sentence: string
  answer: string
  type: string
  person: string
  expected_stem?: string | null
  stem_group?: string | null
}

export type ValidationStatus = 'idle' | 'correct' | 'skipped' | 'invalid_form' | 'wrong_stem' | 'wrong_ending' | 'wrong_person'

export type ValidationResult = {
  status: ValidationStatus
  hint?: string
  highlight?: string
}

// ─── indef_full_irreg ────────────────────────────────────────────────────────

const VALID_FORMS: Record<string, string[]> = {
  Indef_full_irreg_A: ['di', 'diste', 'dio', 'dimos', 'disteis', 'dieron'],
  Indef_full_irreg_B: ['fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron'],
}

const INVALID_FORM_HINTS: Record<string, string> = {
  Indef_full_irreg_A:
    "It's one of those pain-in-the-neck irregulars — this indefinido form has to be memorised. The **traitor**... It ends with \"-ar\", but it behaves as if it was an **-er/-ir** verb.",
  Indef_full_irreg_B:
    "It's one of those pain-in-the-neck irregulars — this indefinido form has to be memorised. This is **THE** irregular that has to be memorised. It's the same for \"ir\" and \"ser\". It starts with **fu**...",
}

const WRONG_PERSON_HINTS: Record<string, string> = {
  Indef_full_irreg_A:
    "Close! Now it just has to match the subject. Recheck who is doing the action.",
  Indef_full_irreg_B:
    "Close! Now it just has to match the subject. Recheck who is doing the action.",
}

export const HIGHLIGHT_PREFIX: Record<string, string> = {
  Indef_full_irreg_A: 'd',
  Indef_full_irreg_B: 'fu',
}

// ─── indef_stem_irreg ─────────────────────────────────────────────────────────

// Try longer endings first to avoid partial matches (e.g. 'iste' before 'e')
const STEM_IRREG_ENDINGS = ['isteis', 'ieron', 'imos', 'eron', 'iste', 'o', 'e'] as const

const STEM_WRONG_HINT =
  "One of those tricky ones with an **irregular stem**. Do you remember how it changes from the infinitive?"

const ENDING_WRONG_HINT =
  "Nearly. You've got the trickiest part, the stem. Now the ending — there's a **specific pattern** for this irregular-stem group. Remember?"

const STEM_IRREG_WRONG_PERSON_HINT =
  "Close! Now it just has to match the subject. Recheck who is doing the action."

const THIRD_PL_WRONG_ENDING_HINT =
  "Watch out with 3rd person plural in this irregular-stem group: it's usually **-ieron**, but some switch to **-eron**. Do you remember which type this verb is?"

function validateStemIrreg(normalized: string, phrase: Phrase): ValidationResult {
  const expectedStem = phrase.expected_stem ?? ''

  // Try to extract a valid stem-irreg ending (all 7: both -ieron and -eron included)
  let inputStem: string | null = null
  let inputEnding: string | null = null
  for (const ending of STEM_IRREG_ENDINGS) {
    if (normalized.endsWith(ending) && normalized.length > ending.length) {
      inputStem = normalized.slice(0, normalized.length - ending.length)
      inputEnding = ending
      break
    }
  }

  // Stem correct + valid ending → wrong person (exact match already caught above)
  if (inputStem === expectedStem) {
    const isThirdPlTypeMismatch =
      phrase.person === '3pl' && (inputEnding === 'ieron' || inputEnding === 'eron')
    return {
      status: 'wrong_person',
      hint: isThirdPlTypeMismatch ? THIRD_PL_WRONG_ENDING_HINT : STEM_IRREG_WRONG_PERSON_HINT,
      highlight: expectedStem,
    }
  }

  // Input starts with correct stem → stem is right, ending is the problem
  if (normalized.startsWith(expectedStem)) {
    return { status: 'wrong_ending', hint: ENDING_WRONG_HINT, highlight: expectedStem }
  }

  // Stem is wrong
  return { status: 'wrong_stem', hint: STEM_WRONG_HINT }
}

// ─── Strip accents ────────────────────────────────────────────────────────────

function deaccent(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// ─── Main validate ────────────────────────────────────────────────────────────

export function validate(input: string, phrase: Phrase): ValidationResult {
  const normalized = deaccent(input.trim().toLowerCase())
  const correct    = deaccent(phrase.answer.toLowerCase())

  if (normalized === correct) return { status: 'correct' }

  if (phrase.type === 'Indef_stem_irreg') {
    return validateStemIrreg(normalized, phrase)
  }

  // indef_full_irreg_A / B
  const validForms = (VALID_FORMS[phrase.type] ?? []).map(deaccent)

  if (!validForms.includes(normalized)) {
    return {
      status: 'invalid_form',
      hint: INVALID_FORM_HINTS[phrase.type] ?? 'Check your answer.',
    }
  }

  return {
    status: 'wrong_person',
    hint: WRONG_PERSON_HINTS[phrase.type] ?? 'Check the subject.',
    highlight: HIGHLIGHT_PREFIX[phrase.type],
  }
}

// ─── Tense metadata ───────────────────────────────────────────────────────────

export const TENSE_META: Record<string, { tense: string; character: string; color: string }> = {
  'indefinido':         { tense: 'indefinido',         character: 'zas',          color: '#4A5BB5' },
  'imperfecto':         { tense: 'imperfecto',         character: 'mimo',         color: '#E8922A' },
  'pretérito-perfecto': { tense: 'pretérito-perfecto', character: 'javi-tostado', color: '#C85C6E' },
}
