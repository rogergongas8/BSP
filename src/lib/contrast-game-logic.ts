export type ContrastSourceBattleId = 'javi-zas' | 'mimo-zas'
export type ContrastBattleId = ContrastSourceBattleId | 'javi-mimo-zas'

export type ContrastPhrase = {
  id: string
  battle_id: ContrastSourceBattleId
  sentence: string
  infinitive_1: string
  option_a_1: string
  option_b_1: string
  correct_1: 1 | 2
  infinitive_2: string | null
  option_a_2: string | null
  option_b_2: string | null
  correct_2: 1 | 2 | null
}

// Icons depend on the phrase's underlying source battle (javi-zas / mimo-zas), not the
// route battle_id — javi-mimo-zas mixes phrases from both sources at random.
export const CONTRAST_ICON: Record<ContrastSourceBattleId, { a: string; b: string }> = {
  'javi-zas': { a: '/images/loading/small-loading3.png', b: '/images/loading/small-loading1.png' }, // a=Perfecto(Javi), b=Indefinido(Zas)
  'mimo-zas': { a: '/images/loading/small-loading1.png', b: '/images/loading/small-loading2.png' }, // a=Indefinido(Zas), b=Imperfecto(Mimo)
}

export const CONTRAST_META: Record<ContrastBattleId, { color: string; xpAt100: number }> = {
  'javi-zas':      { color: '#C85C6E', xpAt100: 25 },
  'mimo-zas':      { color: '#E8922A', xpAt100: 30 },
  'javi-mimo-zas': { color: '#4A5BB5', xpAt100: 30 },
}

// Fixed per-gap-slot colors (gap 1 = blue, gap 2 = orange): border for the sentence's input
// boxes, bg for the translucent column behind each gap's option cards — matching the Figma
// reference. Independent of battle_id since the convention is shared across all contrast games.
export const GAP_COLORS = {
  1: { border: 'var(--bsp-blue)',   bg: '#567BCA99' },
  2: { border: 'var(--bsp-orange)', bg: '#FF87164D' },
} as const

export function isContrastBattle(id: string): id is ContrastBattleId {
  return id === 'javi-zas' || id === 'mimo-zas' || id === 'javi-mimo-zas'
}

/** A phrase's gap count is intrinsic to the row (does it have a second gap?), not the battle being played. */
export function phraseGapCount(phrase: ContrastPhrase): 1 | 2 {
  return phrase.option_a_2 && phrase.option_b_2 && phrase.correct_2 ? 2 : 1
}

/** Source data stores "infinitivo, persona" (e.g. "estar, nosotros") — the UI only shows the verb. */
export function gapVerbOnly(infinitive: string): string {
  return infinitive.split(',')[0].trim()
}
