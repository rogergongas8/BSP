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
    "The **traitor**... Ends with \"-ar\", but it behaves as if it was an **\"-er/-ir\" verb**...",
  Indef_full_irreg_B:
    "This is **THE irregular** that has to be memorised. It's the same for \"ir\" and \"ser\". It starts with \"fu\"...",
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

// ─── indef_reg ────────────────────────────────────────────────────────────────

// After deaccenting: é→e, ó→o, í→i, ió→io
const AR_ENDINGS   = ['asteis', 'aron', 'amos', 'aste', 'o', 'e'] as const
const ERER_ENDINGS = ['isteis', 'ieron', 'imos', 'iste', 'io', 'i'] as const

const AR_PERSON_MAP: Record<string, string> = {
  '1s': 'e', '2s': 'aste', '3s': 'o', '1pl': 'amos', '2pl': 'asteis', '3pl': 'aron',
}
const ERER_PERSON_MAP: Record<string, string> = {
  '1s': 'i', '2s': 'iste', '3s': 'io', '1pl': 'imos', '2pl': 'isteis', '3pl': 'ieron',
}

const REG_ENDING_WRONG_AR_HINT =
  "Remember in regular indefinidos, **-ar** endings usually have the **e** sound, except for accent distinctions. Do any of your letters feel out of place?"

const REG_ENDING_WRONG_ERER_HINT =
  "Remember in regular indefinidos, **-er/-ir** endings all include an **i** sound. Does your ending look right?"

const REG_PERSON_WRONG_GUSTAR_HINT =
  "Close! This is a **gustar**-type verb. The verb agrees with the **What**, not the Who. Recheck who is doing the action."

const REG_PERSON_WRONG_HINT =
  "Close! Now it just has to match the subject. Recheck who is doing the action."

const REG_STEM_HINTS: Record<string, string> = {
  Reg_default_stem:
    "It's a regular indefinido, so the stem just stays the same — drop the last two letters of the infinitive and put it before your ending (good job there!).",
  Reg_change_stem_1s_car:
    "Spelling tweak: **-car** verbs change **c → qu** in the 1st person singular to keep the sound.",
  Reg_change_stem_1s_gar:
    "Spelling tweak: **-gar** verbs change **g → gu** in the 1st person singular to keep the sound.",
  Reg_change_stem_1s_zar:
    "Spelling tweak: **-zar** verbs change **z → c** in the 1st person singular to keep the sound.",
  Reg_change_stem_3s3pl:
    "This is one of those almost-regular indefinidos: the stem is regular, but it has a **vowel change in the 3rd person**. Can you recall that stem change?",
}

function validateIndefReg(normalized: string, phrase: Phrase): ValidationResult {
  const isAR = phrase.verb.toLowerCase().endsWith('ar')
  const endings   = isAR ? AR_ENDINGS   : ERER_ENDINGS
  const personMap = isAR ? AR_PERSON_MAP : ERER_PERSON_MAP

  // 1. Extract ending (longest first to avoid partial matches)
  let inputStem: string | null = null
  let inputEnding: string | null = null
  for (const ending of endings) {
    if (normalized.endsWith(ending) && normalized.length > ending.length) {
      inputStem   = normalized.slice(0, normalized.length - ending.length)
      inputEnding = ending
      break
    }
  }

  if (inputStem === null) {
    return {
      status: 'wrong_ending',
      hint: isAR ? REG_ENDING_WRONG_AR_HINT : REG_ENDING_WRONG_ERER_HINT,
    }
  }

  // 2. Derive expected stem
  const expectedStem = phrase.expected_stem
    ?? deaccent(phrase.verb.toLowerCase()).slice(0, -2)

  // 3. Check person/number
  const expectedEnding = personMap[phrase.person]
  if (inputEnding !== expectedEnding) {
    const isGustar = phrase.type === 'Indef_reg_gustar'
    return {
      status: 'wrong_person',
      hint: isGustar ? REG_PERSON_WRONG_GUSTAR_HINT : REG_PERSON_WRONG_HINT,
      highlight: inputStem === expectedStem ? inputStem : undefined,
    }
  }

  // 4. Check stem
  if (inputStem !== expectedStem) {
    const stemGroup = phrase.stem_group ?? 'Reg_default_stem'
    return {
      status: 'wrong_stem',
      hint: REG_STEM_HINTS[stemGroup] ?? REG_STEM_HINTS.Reg_default_stem,
      highlight: inputStem, // split point: stem (red) | ending (theme)
    }
  }

  return { status: 'correct' }
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

  if (phrase.type === 'Indef_reg' || phrase.type === 'Indef_reg_gustar') {
    return validateIndefReg(normalized, phrase)
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
