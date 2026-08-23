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

// `hacer` is the one verb in this group whose stem shifts again inside the group: hic- everywhere
// except the 3rd person singular, which spells it hiz- (hizo). The source workbook flags that row
// on its own — `expected_stem` reads "hiz- [3s special spelling: hiz-]" for it and plain "hic-"
// for the other five persons — so the generic stem hint left the actual difficulty unexplained.
const STEM_WRONG_HACER_3S_HINT =
  "One of those tricky ones with an **irregular stem**. Do you remember how it changes from the infinitive? Tiny spelling detail: in the **3rd person singular**, *hacer* uses a special spelling in the indefinido."

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

  // Input starts with correct stem → stem is right, ending is the problem.
  //
  // `startsWith`, not looksLikeStemPlusEnding: that helper additionally demands the remainder
  // be built only from ending letters, so "tuvex" fell through to wrong_stem and the student
  // was asked "do you remember how the stem changes?" about `tuv-` — the hard part, which they
  // had written correctly. The Stem row (a plain startsWith) said ✓ at the same time. The stem
  // is either present or it is not; whether what follows is a plausible ending is the *ending*
  // row's question, and it already reports it.
  if (expectedStem !== '' && normalized.startsWith(expectedStem)) {
    return { status: 'wrong_ending', hint: ENDING_WRONG_HINT, highlight: expectedStem }
  }

  // Stem is wrong — check if ending and person were at least correct
  const endingAndPersonOk =
    inputEnding !== null &&
    (STEM_IRREG_PERSON_MAP[phrase.person] ?? []).includes(inputEnding)

  const isHacer3s = phrase.person === '3s' && expectedStem === 'hiz'

  return {
    status: 'wrong_stem',
    hint: isHacer3s ? STEM_WRONG_HACER_3S_HINT : STEM_WRONG_HINT,
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

// The trailing warning is only appended for *tú*: "visitastes" / "comistes" is the single most
// common ending mistake, and it lands here (the extra -s makes the ending unrecognisable), but
// telling every other person not to add an -s would just be noise.
const REG_ENDING_TU_WARNING =
  " Also, hope you didn't add an **\"s\"** at the end for *tú*..."

const REG_ENDING_WRONG_AR_HINT =
  "Remember: in regular indefinidos, **-ar** endings usually have the **'a'** sound, except for *yo* and *él/ella* (which only have an accented vowel)."

const REG_ENDING_WRONG_ERER_HINT =
  "Remember: in regular indefinidos, **-er/-ir** endings all include an **'i'** sound."

function regEndingWrongHint(isAR: boolean, person: string): string {
  const base = isAR ? REG_ENDING_WRONG_AR_HINT : REG_ENDING_WRONG_ERER_HINT
  return person === '2s' ? base + REG_ENDING_TU_WARNING : base
}

const REG_PERSON_WRONG_GUSTAR_HINT =
  "Close! This is a **gustar**-type verb. The verb agrees with the **What**, not the Who. Recheck who is doing the action."

const REG_PERSON_WRONG_HINT =
  "Close! Now it just has to match the subject. Recheck who is doing the action."

const REG_STEM_HINTS: Record<string, string> = {
  // "the stem just stays the same" contradicted the rest of the sentence: the stem is the
  // infinitive *minus* its last two letters, which is what the instruction then asks for.
  Reg_default_stem:
    "It's a regular indefinido, so for the stem just drop the last two letters of the infinitive and put it before your ending (good job there!).",
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

  // Does the answer carry the expected stem? A plain prefix test, matching what the Stem
  // status row asks. `looksLikeStemPlusEnding` additionally demands the remainder be built
  // only from ending letters, which is the *ending* row's question — using it here sent
  // "habliste" and "hablábamos" (both with a correct `habl-`) down to the wrong_stem branch,
  // where the student was told "good job there!" about the ending they had just got wrong
  // while the Stem row showed ✓.
  const hasExpectedStem = expectedStem !== '' && normalized.startsWith(expectedStem)

  if (inputStem === null) {
    // No valid indefinido ending found — but stem may still be correct
    return {
      status: 'wrong_ending',
      hint: regEndingWrongHint(isAR, phrase.person),
      highlight: hasExpectedStem ? expectedStem : undefined,
    }
  }

  // 2b. Valid ending found but stem is wrong AND input starts with expected stem →
  // user typed correct stem then an invalid ending sequence (e.g. "visitasto" vs "visitaste")
  if (inputStem !== expectedStem && hasExpectedStem) {
    return {
      status: 'wrong_ending',
      hint: regEndingWrongHint(isAR, phrase.person),
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

  // Stem and ending both check out against a *derived* stem — but `validate` already
  // compared the input to `phrase.answer` and it did not match, so this cannot be the
  // right answer no matter what the reconstruction says.
  //
  // The two disagree whenever the derived stem is wrong: a vowel-changing verb like
  // *seguir* is stored as Indef_reg, so the stem is derived as `segu-` when the 3rd person
  // actually takes `sigu-`. That made "seguieron" pass as correct while the real answer,
  // *siguieron*, was accepted only by the equality check above. `answer` is the authority
  // on correctness; this function's job is to explain a wrong answer, not to overrule it.
  const stemGroup = phrase.stem_group ?? 'Reg_change_stem_3s3pl'
  return {
    status: 'wrong_stem',
    hint: REG_STEM_HINTS[stemGroup] ?? REG_STEM_HINTS.Reg_change_stem_3s3pl,
    highlight: inputStem,
  }
}

// ─── imperfecto (imp_irreg) ─────────────────────────────────────────────────

const IMP_IRREG_FORMS: Record<string, string[]> = {
  imp_irreg_A: ['era', 'eras', 'era', 'éramos', 'erais', 'eran'],
  imp_irreg_B: ['iba', 'ibas', 'iba', 'íbamos', 'ibais', 'iban'],
  imp_irreg_C: ['veía', 'veías', 'veía', 'veíamos', 'veíais', 'veían'],
}

// Keyed to the verb each type actually holds: A = ser (era…), B = ir (iba…), C = ver (veía…),
// matching IMP_IRREG_FORMS above and the seeded rows. The hints for A and B used to be
// swapped — a wrong answer on *ser* was told about *ir* and vice versa.
const IMP_IRREG_INVALID_HINTS: Record<string, string> = {
  imp_irreg_A:
    "Lucky you! Looks like you've run into one of the only three irregular imperfect verbs. *Ser* doesn't even start with \"s-\"; it **starts with \"e-\"**. Does that ring a bell?",
  imp_irreg_B:
    "Lucky you! Looks like you've run into one of the only three irregular imperfect verbs. *Ir* starts with \"i-\", but it's followed by an **unexpected consonant**. Does that ring a bell?",
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

  // Does the answer carry the expected stem? A plain prefix test, matching the Stem status
  // row, so the cascade and the rows cannot disagree — see the same guard in validateIndefReg.
  const hasExpectedStem = expectedStem !== '' && normalized.startsWith(expectedStem)

  // 2. No valid imperfecto ending found
  if (inputEnding === null) {
    return {
      status: 'wrong_ending',
      hint: endingWrongHint,
      highlight: hasExpectedStem ? expectedStem : undefined,
    }
  }

  // 2b. A valid ending was found, but stripping it leaves something other than the expected
  // stem while the answer still *starts* with that stem: the student wrote the stem and then
  // garbled the ending ("hableábamos" for *hablábamos*). That is an ending mistake. Without
  // this branch it fell through to step 4 and was reported as a wrong stem, contradicting the
  // Stem row, which reads ✓.
  if (inputStem !== expectedStem && hasExpectedStem) {
    return { status: 'wrong_ending', hint: endingWrongHint, highlight: expectedStem }
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

// The mirror of PP_STRUCTURE_HINT for the tenses that are a single word: it names the
// compound-tense mistake ("he mirado" where *miré* belongs) without giving the form away.
const SINGLE_TOKEN_STRUCTURE_HINT =
  "Careful! This tense is **one single word** — no helper verb in front of it."

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
    if (!isParticipleCorrect(partToken, phrase)) {
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
    // "all letters before part_ending" — part_ending is the trailing -ado/-ido, already
    // confirmed valid above. When the student wrote no stem at all ("he ido" for *he sido*)
    // that range is empty and nothing renders red, leaving the hint pointing at a part of the
    // word the student cannot see; highlight the whole token instead, which is what is wrong.
    const stemEnd = partRaw.length - expectedEnding.length
    return {
      status: 'part_stem_invalid',
      hint: PP_PART_STEM_INVALID_HINT,
      ppHighlight: stemEnd > 0
        ? { token: 'part', start: 0, end: stemEnd }
        : { token: 'part', start: 0, end: partRaw.length },
    }
  }

  return { status: 'correct' }
}

/** Is this token a correct participle for the phrase's verb? Shared by the cascade and the row check. */
function isParticipleCorrect(partToken: string, phrase: Phrase): boolean {
  if (phrase.type === 'PP_irreg') {
    return partToken === deaccentToken(phrase.expected_stem ?? '')
  }
  const isAR = phrase.verb.toLowerCase().endsWith('ar')
  const expectedEnding = isAR ? 'ado' : 'ido'
  if (!partToken.endsWith(expectedEnding)) return false
  const expectedStem = phrase.expected_stem ?? deaccent(phrase.verb.toLowerCase()).slice(0, -2)
  return partToken.slice(0, partToken.length - expectedEnding.length) === expectedStem
}

/**
 * Which Pretérito Perfecto checks the answer passes. The `validate` cascade above
 * stops at the first failing step (so it can pick one hint), but the status rows
 * must judge every dimension independently — a wrong auxiliary must not make a
 * correct participle read as wrong.
 *
 * That independence has to hold for an incomplete answer too. Typing just "hemos"
 * for *nosotros* used to fail all four rows, because anything other than two tokens
 * returned early: the student had written a real haber form, in the right person,
 * and was told the auxiliary was wrong. Structure fails (the participle is missing),
 * but every piece the answer *does* contain is still judged on its own merits.
 *
 * A missing token fails its rows rather than passing them — nothing was written, so
 * there is nothing to credit. Which slot a lone token fills is decided by its shape,
 * not its position: see the assignment below.
 */
export function ppStatusRows(input: string, phrase: Phrase): {
  structure: boolean
  auxiliary: boolean
  personNumber: boolean
  participle: boolean
} {
  const rawTokens = input.trim().split(/\s+/).filter(Boolean)

  // Pretérito perfecto is exactly "aux + participle". With a different token count the
  // structure is wrong, but the tokens that are present still get judged below.
  const structure = rawTokens.length === 2

  // With two tokens the slots are positional: auxiliary first, participle second.
  //
  // With one token, position cannot decide which slot it fills. Treating it as the auxiliary
  // was right for "hemos" but wrong for "tenido": a lone correct participle was judged as a
  // haber form, so Auxiliary and Person/Number failed, and Participle failed too because the
  // slot had been left empty — four ✗ for an answer that got the hard half right and only
  // omitted "he". So a single token is assigned to the slot it actually fits: the auxiliary
  // when it is a haber form, the participle otherwise.
  const soleToken = rawTokens.length === 1 ? deaccentToken(rawTokens[0]) : ''
  const soleIsAux = soleToken !== '' && HABER_FORMS.includes(soleToken)

  const auxToken =
    rawTokens.length >= 2 ? deaccentToken(rawTokens[0]) :
    soleIsAux            ? soleToken :
    ''
  // The last token, not the second: with a stray extra word ("he he comido") the participle
  // is still the word at the end, and crediting it costs nothing — Structure already reports
  // that the answer is not two tokens.
  const partToken =
    rawTokens.length >= 2      ? deaccentToken(rawTokens[rawTokens.length - 1]) :
    (soleToken !== '' && !soleIsAux) ? soleToken :
    ''

  return {
    structure,
    auxiliary: auxToken !== '' && HABER_FORMS.includes(auxToken),
    personNumber: auxToken !== '' && auxToken === deaccentToken(HABER_PERSON_MAP[phrase.person] ?? ''),
    participle: partToken !== '' && isParticipleCorrect(partToken, phrase),
  }
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

  const isPP = phrase.type === 'PP_irreg' || phrase.type === 'PP_reg' || phrase.type === 'PP_reg_gustar'

  // Indefinido and imperfecto are a single word, so a multi-token answer is a structure
  // mistake and has to be reported as one before anything else is examined.
  //
  // Without this gate the cascade fell through to the stem check, which compares the whole
  // string to the expected stem: "he repetimos" was told its *stem* was wrong ("...just drop
  // the last two letters of the infinitive... good job there!") when the stem, the ending and
  // the person inside "repetimos" were all correct and the only error was writing a compound
  // tense. The Structure row already said so; the hint contradicted it.
  //
  // PP is excluded — it is legitimately two tokens and runs its own structure check.
  if (!isPP && input.trim().split(/\s+/).filter(Boolean).length > 1) {
    return { status: 'structure_incomplete', hint: SINGLE_TOKEN_STRUCTURE_HINT }
  }

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

// ─── Status rows (shared by singleplayer and multiplayer) ─────────────────────

/** One labelled check shown next to the correct answer after a wrong attempt. */
export type StatusRow = { label: string; ok: boolean }

/**
 * The per-dimension breakdown of a wrong answer, as the feedback UI renders it.
 *
 * Which rows exist depends on the tense: Pretérito Perfecto is built from two tokens
 * (auxiliary + participle) and is judged on Structure/Auxiliary/Person-Number/Participle,
 * while indefinido and imperfecto are single tokens judged on Stem/Tense ending/Person-Number.
 * The fully-irregular forms have no decomposable stem at all, so they only report Form and
 * Person/Number.
 *
 * Multiplayer used to hardcode the indefinido rows for every phrase type, so a Pretérito
 * Perfecto question reported "Tense ending / Person-Number / Stem" — labels that do not exist
 * in that tense. Both modes now derive their rows here, from the phrase and the raw answer,
 * so the two can no longer drift apart.
 */
export function statusRowsFor(input: string, phrase: Phrase): StatusRow[] {
  const normalized = deaccent(input.trim().toLowerCase())

  if (phrase.type === 'PP_irreg' || phrase.type === 'PP_reg' || phrase.type === 'PP_reg_gustar') {
    const rows = ppStatusRows(input, phrase)
    return [
      { label: 'Structure',     ok: rows.structure },
      { label: 'Auxiliary',     ok: rows.auxiliary },
      { label: 'Person/Number', ok: rows.personNumber },
      { label: 'Participle',    ok: rows.participle },
    ]
  }

  if (phrase.type === 'Indef_stem_irreg') {
    // 3pl is the one person with two possible endings in this group (-ieron / -eron), but a
    // given verb takes exactly one, and `phrase.answer` says which. Passing both let "tuveron"
    // for *tuvieron* score Person/Number ✓ on the wrong variant — and because the longest-first
    // scan then stripped "eron" down to a stem that matched, the only row left to carry the
    // error was Stem, which was the part the student had actually got right.
    const expectedStem = phrase.expected_stem ?? ''
    const answerEnding = deaccent(phrase.answer.toLowerCase()).slice(expectedStem.length)
    const persons = STEM_IRREG_PERSON_MAP[phrase.person] ?? []
    const narrowed = persons.includes(answerEnding) ? [answerEnding] : persons

    return singleTokenRows(input, phrase.answer, expectedStem, STEM_IRREG_ENDINGS, narrowed)
  }

  if (
    phrase.type === 'Indef_reg' || phrase.type === 'Indef_reg_gustar' ||
    phrase.type === 'Imp_reg'   || phrase.type === 'Imp_reg_gustar'
  ) {
    const isAR = phrase.verb.toLowerCase().endsWith('ar')
    const isImp = phrase.type === 'Imp_reg' || phrase.type === 'Imp_reg_gustar'
    const endings = isImp
      ? (isAR ? AR_IMP_ENDINGS : ERIR_IMP_ENDINGS)
      : (isAR ? AR_ENDINGS : ERER_ENDINGS)
    const personMap = isImp
      ? (isAR ? AR_IMP_PERSON_MAP : ERIR_IMP_PERSON_MAP)
      : (isAR ? AR_PERSON_MAP : ERER_PERSON_MAP)
    const expectedStem = phrase.expected_stem
      ?? deaccent(phrase.verb.toLowerCase()).slice(0, -2)

    return singleTokenRows(
      input,
      phrase.answer,
      expectedStem,
      endings.map(deaccent),
      [deaccent(personMap[phrase.person] ?? '')],
    )
  }

  // indef_full_irreg_A/B and imp_irreg_A/B/C: a single memorised form with nothing to
  // decompose, so the only questions are "is this a real form of the verb?" and "is it
  // the right person?".
  const forms = (VALID_FORMS[phrase.type] ?? IMP_IRREG_FORMS[phrase.type] ?? []).map(deaccent)
  return [
    { label: 'Form',          ok: forms.includes(normalized) },
    { label: 'Person/Number', ok: normalized === deaccent(phrase.answer.toLowerCase()) },
  ]
}

/**
 * Status rows for the single-token tenses (indefinido and imperfecto), judged one
 * dimension at a time.
 *
 * Deriving these from `validate`'s status was wrong for the same reason it was wrong in
 * Pretérito Perfecto: the cascade stops at the first failure, so whatever it never got to
 * inspect was reported as failing. Typing "tuvex" for *tuve* got Stem marked wrong even
 * though `tuv-` — the hard part of that exercise — was right, while Tense ending and
 * Person/Number were marked correct despite "x" being neither.
 *
 * Each row now answers its own question against the input:
 *  - Stem: does the answer start with the expected stem?
 *  - Tense ending: is what follows a real ending for this tense?
 *  - Person/Number: is that ending the one this person takes?
 */
function singleTokenRows(
  rawInput: string,
  answer: string,
  expectedStem: string,
  endings: readonly string[],
  expectedEndings: readonly string[],
): StatusRow[] {
  const tokens = rawInput.trim().split(/\s+/).filter(Boolean)
  const isSingleToken = tokens.length === 1

  // The three morphology rows judge the *verb* the student wrote, not the raw string.
  //
  // Writing "han miramos" for *miramos* is one mistake — a compound tense where a simple one
  // belongs — and Structure is the row that says so. Judging the other three against the whole
  // string turned that single mistake into four ✗: "han miramos" does not start with `mir-`,
  // so Stem failed, and with it the ending and person checks that hang off it. The student had
  // the stem, the ending and the person all right inside the token that carries the verb, and
  // was told they got everything wrong.
  //
  // The last token is the verb slot: a compound attempt puts the auxiliary first and the
  // participle-shaped word last ("han miramos", "he desayunado"), and a stray pronoun does the
  // same ("nos fuimos"). This mirrors ppStatusRows, which already credits each piece an answer
  // actually contains instead of failing them all on a structure error.
  const verbToken = tokens.length > 0 ? deaccent(tokens[tokens.length - 1].toLowerCase()) : ''

  // Longest ending first, so "isteis" is not read as "iste".
  const sorted = [...endings].sort((a, b) => b.length - a.length)
  const inputEnding = sorted.find(e => verbToken.endsWith(e) && verbToken.length > e.length) ?? null

  const stemOk = expectedStem !== '' && verbToken.startsWith(expectedStem)
  // The ending only counts when it is what actually follows the expected stem: for "tuvo"
  // the stem is `tuv-` and the ending `-o`.
  //
  // This used to fall back to a bare suffix match whenever the stem was wrong
  // (`!stemOk || …`), to avoid penalising the same mistake twice. But indefinido has
  // single-letter endings ("o", "e", "i"), so any word ending in one of those letters
  // collected a ✓ — "he desayunado" was told its tense ending was right, because of the
  // final "o" of a participle. The row has to answer its own question against the
  // expected stem, or it cannot be trusted at all.
  const endingOk = inputEnding !== null && verbToken === expectedStem + inputEnding
  const personOk = endingOk && inputEnding !== null && expectedEndings.includes(inputEnding)

  // Indefinido and imperfecto are a single word. Writing "he desayunado" is a compound-tense
  // mistake, and without this row the breakdown had no way to say so: every check was judged
  // against a two-token string as if it were one, and the student was left reading three
  // verdicts that never named the actual error.
  // Every row green on a wrong answer means the derived stem disagrees with `phrase.answer`
  // — the vowel-changing verbs stored as Indef_reg (*seguir* → derived `segu-`, real
  // `sigu-`). The breakdown only ever renders for an answer that was already judged wrong,
  // so a full set of ticks is never a truthful outcome: the stem is the part that differs.
  // A *wrong* answer must never show four ticks: the derived stem can disagree with
  // `phrase.answer` for the vowel-changing verbs stored as Indef_reg (*seguir* → derived
  // `segu-`, real `sigu-`), so "seguieron" reconstructs perfectly while *siguieron* is the
  // real form. There the stem is the part that differs, and the row has to say so.
  //
  // This is keyed off the answer rather than blanket-suppressing a full set of ticks: the
  // guard used to fire on the *correct* answer too, so "tuve" for *tuve* reported Stem ✗.
  // Only the UI's isError check kept that off the screen.
  const matchesAnswer = verbToken === deaccent(answer.toLowerCase())
  const falselyAllGreen = stemOk && endingOk && personOk && isSingleToken && !matchesAnswer

  return [
    { label: 'Structure',     ok: isSingleToken },
    { label: 'Tense ending',  ok: endingOk },
    { label: 'Person/Number', ok: personOk },
    { label: 'Stem',          ok: stemOk && !falselyAllGreen },
  ]
}
