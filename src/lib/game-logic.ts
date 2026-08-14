export type Phrase = {
  id: string
  verb: string
  sentence: string
  answer: string
  type: string
  person: string
  expected_stem?: string | null
  stem_group?: string | null
  /** Only present when fetched from a pooled/mixed source (e.g. the cross-tense redo queue). */
  tense?: string
}

export type ValidationStatus =
  | 'idle' | 'correct' | 'skipped' | 'invalid_form' | 'wrong_stem' | 'wrong_ending' | 'wrong_person'
  | 'structure_incomplete' | 'aux_invalid' | 'aux_wrong_person'
  | 'part_irreg_invalid' | 'part_ending_invalid' | 'part_stem_invalid'

/** Marks a character range to render in red: within one of the two Pretérito Perfecto tokens, or 'all' for the whole input (structure errors). */
export type PPHighlightRange = {
  token: 'aux' | 'part' | 'all'
  start: number
  end: number
}

export type ValidationResult = {
  status: ValidationStatus
  hint?: string
  highlight?: string
  ppHighlight?: PPHighlightRange
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

const STEM_IRREG_PERSON_MAP: Record<string, string[]> = {
  '1s': ['e'], '2s': ['iste'], '3s': ['o'], '1pl': ['imos'], '2pl': ['isteis'], '3pl': ['ieron', 'eron'],
}

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

  // Stem is wrong — check if ending and person were at least correct
  const endingAndPersonOk =
    inputEnding !== null &&
    (STEM_IRREG_PERSON_MAP[phrase.person] ?? []).includes(inputEnding)

  return {
    status: 'wrong_stem',
    hint: STEM_WRONG_HINT,
    highlight: endingAndPersonOk ? (inputStem ?? undefined) : undefined,
  }
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
  "Remember: in regular indefinidos, **-ar** endings usually have the **'a'** sound, except for *yo* and *él/ella* (which only have an accented vowel)."

const REG_ENDING_WRONG_ERER_HINT =
  "Remember: in regular indefinidos, **-er/-ir** endings all include an **'i'** sound."

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

  // 2. Derive expected stem (needed for both wrong_ending and stem checks)
  const expectedStem = phrase.expected_stem
    ?? deaccent(phrase.verb.toLowerCase()).slice(0, -2)

  if (inputStem === null) {
    // No valid indefinido ending found — but stem may still be correct
    const stemCorrect = normalized.startsWith(expectedStem)
    return {
      status: 'wrong_ending',
      hint: isAR ? REG_ENDING_WRONG_AR_HINT : REG_ENDING_WRONG_ERER_HINT,
      highlight: stemCorrect ? expectedStem : undefined,
    }
  }

  // 2b. Valid ending found but stem is wrong AND input starts with expected stem →
  // user typed correct stem then an invalid ending sequence (e.g. "visitasto" vs "visitaste")
  if (inputStem !== expectedStem && normalized.startsWith(expectedStem)) {
    return {
      status: 'wrong_ending',
      hint: isAR ? REG_ENDING_WRONG_AR_HINT : REG_ENDING_WRONG_ERER_HINT,
      highlight: expectedStem,
    }
  }

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

// ─── imperfecto (imp_irreg) ─────────────────────────────────────────────────

const IMP_IRREG_FORMS: Record<string, string[]> = {
  imp_irreg_A: ['era', 'eras', 'era', 'éramos', 'erais', 'eran'],
  imp_irreg_B: ['iba', 'ibas', 'iba', 'íbamos', 'ibais', 'iban'],
  imp_irreg_C: ['veía', 'veías', 'veía', 'veíamos', 'veíais', 'veían'],
}

const IMP_IRREG_INVALID_HINTS: Record<string, string> = {
  imp_irreg_A:
    "Lucky you! Looks like you've run into one of the only three irregular imperfect verbs. *Ir* starts with \"i-\", but it's followed by an **unexpected consonant**. Does that ring a bell?",
  imp_irreg_B:
    "Lucky you! Looks like you've run into one of the only three irregular imperfect verbs. *Ser* doesn't even start with \"s-\"; it **starts with \"e-\"**. Does that ring a bell?",
  imp_irreg_C:
    "Lucky you! Looks like you've run into one of the only three irregular imperfect verbs. But don't worry, *ver* is the easiest one: it keeps the \"**ve-**\" base and adds the **imperfect endings**.",
}

const IMP_IRREG_WRONG_PERSON_HINT =
  "Close! Now it just has to match the subject. Recheck who is doing the action."

function validateImpIrreg(normalized: string, phrase: Phrase): ValidationResult {
  const validForms = (IMP_IRREG_FORMS[phrase.type] ?? []).map(deaccent)

  if (!validForms.includes(normalized)) {
    return {
      status: 'invalid_form',
      hint: IMP_IRREG_INVALID_HINTS[phrase.type] ?? 'Check your answer.',
    }
  }

  return { status: 'wrong_person', hint: IMP_IRREG_WRONG_PERSON_HINT }
}

// ─── imperfecto (imp_reg) ────────────────────────────────────────────────────

const AR_IMP_ENDINGS   = ['ábamos', 'abais', 'aban', 'aba', 'abas'] as const
const ERIR_IMP_ENDINGS = ['íamos', 'íais', 'ían', 'ía', 'ías'] as const

const AR_IMP_PERSON_MAP: Record<string, string> = {
  '1s': 'aba', '2s': 'abas', '3s': 'aba', '1pl': 'ábamos', '2pl': 'abais', '3pl': 'aban',
}
const ERIR_IMP_PERSON_MAP: Record<string, string> = {
  '1s': 'ía', '2s': 'ías', '3s': 'ía', '1pl': 'íamos', '2pl': 'íais', '3pl': 'ían',
}

const IMP_REG_ENDING_WRONG_AR_HINT =
  "Quick check: regular imperfect verbs use the **\"-aba\"** pattern (-ar) or **\"-ía\"** pattern (-er/-ir). Which one fits here?"

const IMP_REG_ENDING_WRONG_ERIR_HINT =
  "Quick check: regular imperfect verbs use the **\"-aba\"** pattern (-ar) or **\"-ía\"** pattern (-er/-ir). Which one fits here?"

const IMP_REG_PERSON_WRONG_GUSTAR_HINT =
  "Close! This is a **gustar**-type verb. The verb agrees with **what causes the feeling**, not with who experiences it."

const IMP_REG_PERSON_WRONG_HINT =
  "Close! Now it just has to match the subject. Recheck who is doing the action."

const IMP_REG_STEM_HINT =
  "It's a regular imperfecto, so for the stem just drop the last two letters of the infinitive and put it before your ending."

function validateImpReg(normalized: string, phrase: Phrase): ValidationResult {
  const isAR = phrase.verb.toLowerCase().endsWith('ar')
  const endings   = isAR ? AR_IMP_ENDINGS   : ERIR_IMP_ENDINGS
  const personMap = isAR ? AR_IMP_PERSON_MAP : ERIR_IMP_PERSON_MAP
  const endingWrongHint = isAR ? IMP_REG_ENDING_WRONG_AR_HINT : IMP_REG_ENDING_WRONG_ERIR_HINT

  const expectedStem = deaccent(phrase.verb.toLowerCase()).slice(0, -2)

  // 1. Extract ending (longest first to avoid partial matches, e.g. '-aba' before '-abas')
  let inputStem: string | null = null
  let inputEnding: string | null = null
  for (const ending of endings) {
    const deaccentedEnding = deaccent(ending)
    if (normalized.endsWith(deaccentedEnding) && normalized.length > deaccentedEnding.length) {
      inputStem   = normalized.slice(0, normalized.length - deaccentedEnding.length)
      inputEnding = deaccentedEnding
      break
    }
  }

  // 2. No valid imperfecto ending found
  if (inputEnding === null) {
    const stemCorrect = normalized.startsWith(expectedStem)
    return {
      status: 'wrong_ending',
      hint: endingWrongHint,
      highlight: stemCorrect ? expectedStem : undefined,
    }
  }

  // 3. Check person/number
  const expectedEnding = deaccent(personMap[phrase.person] ?? '')
  if (inputEnding !== expectedEnding) {
    const isGustar = phrase.type === 'Imp_reg_gustar'
    return {
      status: 'wrong_person',
      hint: isGustar ? IMP_REG_PERSON_WRONG_GUSTAR_HINT : IMP_REG_PERSON_WRONG_HINT,
      highlight: inputStem === expectedStem ? (inputStem ?? undefined) : undefined,
    }
  }

  // 4. Check stem
  if (inputStem !== expectedStem) {
    return { status: 'wrong_stem', hint: IMP_REG_STEM_HINT, highlight: inputStem ?? undefined }
  }

  return { status: 'correct' }
}

// ─── pretérito_perfecto ─────────────────────────────────────────────────────

const HABER_FORMS = ['he', 'has', 'ha', 'hemos', 'habéis', 'han'].map(deaccent)

const HABER_PERSON_MAP: Record<string, string> = {
  '1s': 'he', '2s': 'has', '3s': 'ha', '1pl': 'hemos', '2pl': 'habéis', '3pl': 'han',
}

const PP_STRUCTURE_HINT =
  "Careful! Pretérito Perfecto needs two parts: **helper verb + participle**."

const PP_AUX_INVALID_NO_ATTEMPT_HINT =
  "Quick check: in pretérito perfecto, the helper verb is **HABER**, not another verb."

const PP_AUX_INVALID_ATTEMPT_HINT =
  "Almost! The helper verb must be a valid present form of **haber**. Try to recall it, it's a small set."

const PP_AUX_PERSON_WRONG_GUSTAR_HINT =
  "Close! This is a **gustar**-type verb. The verb agrees with **what causes the feeling**, not with who experiences it."

const PP_AUX_PERSON_WRONG_HINT =
  "Close! The haber form has to match the subject. Recheck who is doing the action."

const PP_PART_IRREG_INVALID_HINT =
  "Agh, it's one of those. This verb uses an **irregular participle**. Try to recall its special form."

const PP_PART_ENDING_INVALID_HINT =
  "Quick check: Regular participles end in **-ado** (-ar) or **-ido** (-er/-ir). Which one fits here?"

const PP_PART_STEM_INVALID_HINT =
  "Nice! You've got the key part, the ending. Now use the **infinitive without the last two letters** before it."

function deaccentToken(s: string): string {
  return deaccent(s.toLowerCase())
}

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])

/**
 * PART_ENDING_INVALID highlight length, per the PDF:
 * -ado/-ido → last 3; -ando → last 4; -iendo → last 5;
 * else last 1 if the input ends in a vowel, last 2 if it ends in a consonant.
 */
function partEndingHighlightLen(partToken: string): number {
  if (partToken.endsWith('ado') || partToken.endsWith('ido')) return 3
  if (partToken.endsWith('ando')) return 4
  if (partToken.endsWith('iendo')) return 5
  const last = partToken.slice(-1)
  return VOWELS.has(last) ? 1 : 2
}

function validatePreteritoPerfecto(input: string, phrase: Phrase): ValidationResult {
  // Preserve original spacing/casing per token for highlight ranges (rendered against user input).
  const rawTokens = input.trim().split(/\s+/).filter(Boolean)

  if (rawTokens.length !== 2) {
    return {
      status: 'structure_incomplete',
      hint: PP_STRUCTURE_HINT,
      ppHighlight: { token: 'all', start: 0, end: input.trim().length },
    }
  }

  const [auxRaw, partRaw] = rawTokens
  const auxToken = deaccentToken(auxRaw)
  const partToken = deaccentToken(partRaw)

  const isGustar = phrase.type === 'PP_reg_gustar'

  // ── Auxiliary ──
  const isHaberAttempt = auxToken.startsWith('ha') || auxToken.startsWith('he')

  if (!HABER_FORMS.includes(auxToken)) {
    return {
      status: 'aux_invalid',
      hint: isHaberAttempt ? PP_AUX_INVALID_ATTEMPT_HINT : PP_AUX_INVALID_NO_ATTEMPT_HINT,
      ppHighlight: { token: 'aux', start: 0, end: auxRaw.length },
    }
  }

  const expectedAux = HABER_PERSON_MAP[phrase.person]
  if (auxToken !== deaccentToken(expectedAux)) {
    return {
      status: 'aux_wrong_person',
      hint: isGustar ? PP_AUX_PERSON_WRONG_GUSTAR_HINT : PP_AUX_PERSON_WRONG_HINT,
      // "all letters after h" — aux_token always starts with 'h' (he/has/ha/hemos/habéis/han)
      ppHighlight: { token: 'aux', start: 1, end: auxRaw.length },
    }
  }

  // ── Participle ──
  if (phrase.type === 'PP_irreg') {
    const expectedPart = deaccentToken(phrase.expected_stem ?? '')
    if (partToken !== expectedPart) {
      return {
        status: 'part_irreg_invalid',
        hint: PP_PART_IRREG_INVALID_HINT,
        ppHighlight: { token: 'part', start: 0, end: partRaw.length },
      }
    }
    return { status: 'correct' }
  }

  // PP_reg / PP_reg_gustar
  const isAR = phrase.verb.toLowerCase().endsWith('ar')
  const expectedEnding = isAR ? 'ado' : 'ido'
  const expectedStem = phrase.expected_stem ?? deaccent(phrase.verb.toLowerCase()).slice(0, -2)

  if (!partToken.endsWith(expectedEnding)) {
    const len = partEndingHighlightLen(partToken)
    return {
      status: 'part_ending_invalid',
      hint: PP_PART_ENDING_INVALID_HINT,
      ppHighlight: { token: 'part', start: Math.max(0, partRaw.length - len), end: partRaw.length },
    }
  }

  const partStem = partToken.slice(0, partToken.length - expectedEnding.length)
  if (partStem !== expectedStem) {
    return {
      status: 'part_stem_invalid',
      hint: PP_PART_STEM_INVALID_HINT,
      // "all letters before part_ending" — part_ending is the trailing -ado/-ido, already confirmed valid above
      ppHighlight: { token: 'part', start: 0, end: partRaw.length - expectedEnding.length },
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

  if (phrase.type === 'PP_irreg' || phrase.type === 'PP_reg' || phrase.type === 'PP_reg_gustar') {
    return validatePreteritoPerfecto(input, phrase)
  }

  if (phrase.type === 'imp_irreg_A' || phrase.type === 'imp_irreg_B' || phrase.type === 'imp_irreg_C') {
    return validateImpIrreg(normalized, phrase)
  }

  if (phrase.type === 'Imp_reg' || phrase.type === 'Imp_reg_gustar') {
    return validateImpReg(normalized, phrase)
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

export const TENSE_META: Record<string, { tense: string; label: string; character: string; characterName: string; imageDir: string; color: string }> = {
  'indefinido':         { tense: 'indefinido',         label: 'Indefinido',  character: 'zas',          characterName: 'Zas',          imageDir: 'indefinido',  color: '#4A5BB5' },
  'imperfecto':         { tense: 'imperfecto',         label: 'Imperfecto',  character: 'mimo',         characterName: 'Mimo',         imageDir: 'imperfecto',  color: '#E8922A' },
  'pretérito-perfecto': { tense: 'pretérito-perfecto', label: 'P. Perfecto', character: 'javi-tostado', characterName: 'Javi Tostado', imageDir: 'pretperfect', color: '#C85C6E' },
}

// Strips diacritics so URL slugs match regardless of how the browser/OS
// encoded an accented character typed into the address bar (NFC vs NFD).
function stripDiacritics(s: string) {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

const TENSE_ID_BY_SLUG = Object.fromEntries(
  Object.keys(TENSE_META).map(id => [stripDiacritics(id), id])
)

/** Resolves a raw route param to a canonical TENSE_META key, accent-insensitively. */
export function resolveTenseId(raw: string): string | undefined {
  // Route params should already be decoded by Next.js, but some navigation
  // paths (typed URLs) can leave them percent-encoded — decode defensively.
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    // raw wasn't a valid percent-encoded sequence — use it as-is
  }
  return TENSE_ID_BY_SLUG[stripDiacritics(decoded)] ?? TENSE_ID_BY_SLUG[stripDiacritics(raw)]
}

/**
 * Which theory subcategory a mistake phrase belongs to. Indefinido has a 3-way split
 * (regular / stem-changing / fully irregular), each backed by its own lesson — a
 * phrase_type like "Indef_stem_irreg" is NOT the same lesson as "Indef_full_irreg_A",
 * even though both contain "irreg". Every other tense is a simple regular/irregular split.
 */
export function subcategoryFor(tenseId: string, phraseType: string): string {
  const t = phraseType.toLowerCase()
  if (tenseId === 'indefinido') {
    if (t.includes('stem_irreg')) return 'Semi-irregular'
    if (t.includes('full_irreg')) return 'Fully irregular'
    return 'Regular'
  }
  return t.includes('irreg') ? 'Irregular' : 'Regular'
}
