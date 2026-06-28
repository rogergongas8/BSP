export type Phrase = {
  id: string
  verb: string
  sentence: string
  answer: string
  type: string
  person: string
}

export type ValidationStatus = 'idle' | 'correct' | 'invalid_form' | 'wrong_person'

export type ValidationResult = {
  status: ValidationStatus
  hint?: string
  highlight?: string
}

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

// Returns which part to highlight when person/number is wrong
export const HIGHLIGHT_PREFIX: Record<string, string> = {
  Indef_full_irreg_A: 'd',  // highlight letters after "d"
  Indef_full_irreg_B: 'fu', // highlight letters after "fu"
}

// Strip accents so "dió" matches "dio", "fué" matches "fue", etc.
function deaccent(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function validate(input: string, phrase: Phrase): ValidationResult {
  const normalized = deaccent(input.trim().toLowerCase())
  const correct    = deaccent(phrase.answer.toLowerCase())

  if (normalized === correct) return { status: 'correct' }

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

// Maps tenseId (URL) to DB tense value and character
export const TENSE_META: Record<string, { tense: string; character: string; color: string }> = {
  'indefinido':         { tense: 'indefinido',         character: 'zas',         color: '#4A5BB5' },
  'imperfecto':         { tense: 'imperfecto',         character: 'mimo',        color: '#E8922A' },
  'pretérito-perfecto': { tense: 'pretérito-perfecto', character: 'javi-tostado', color: '#C85C6E' },
}
