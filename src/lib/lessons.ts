export type PillColor = 'orange' | 'green' | 'pink' | 'wine' | 'lavender'

export type LessonBlock =
  | { type: 'formula'; parts: { tag: string; label: string; color: 'blue' | 'orange' }[]; compareEn?: [string, string]; character?: string }
  | { type: 'example'; es: string; en: string; highlights: { word: string; color: 'blue' | 'orange' }[] }
  | { type: 'examples'; color: PillColor; items: { text: string; highlights: string[] }[] }
  | { type: 'table'; rows: [string, string][]; note?: string; character?: string }
  | { type: 'note'; text: string; variant?: 'boxed'; character?: string }
  | { type: 'rule-cards'; items: { suffix: string; result: string; examples: [string, string][] }[] }
  | { type: 'pill-pairs'; items: [string, string][]; color: PillColor }
  | { type: 'word-pills'; groups: { words: string[]; color: PillColor }[] }
  | { type: 'correction-pairs'; items: [wrong: string, correct: string][] }
  | { type: 'stem-formula'; stems: [string, string][]; endings: string[] }
  | { type: 'infinitive-table'; headers: [string, string]; rows: [string, string][] }
  | { type: 'trio-table'; headers: [string, string, string]; rows: [string, string, string][] }
  | { type: 'boxed-pairs'; rows: [string, string][]; highlightIndex?: number; accent?: 'orange' | 'green' }
  | { type: 'example-words'; color: PillColor; words: string[] }
  | {
      type: 'dual-conjugation'
      style?: 'solid' | 'pastel'
      groups: { label: string; color: PillColor; rows: [string, string][]; highlightIndex?: number }[]
    }
  | { type: 'accent-table'; rows: [string, string][]; color: PillColor; underline: string }
  | { type: 'stem-cards'; items: [string, string][] }
  | {
      type: 'uses-list'
      items: { icon: 'repeat' | 'file' | 'cloud'; image?: string; title: string; desc: string; examples: string[] }[]
    }
  | {
      type: 'validity-note'
      text: string
      correct: string
      incorrect: string
      caption: string
    }
  | {
      type: 'now-then-list'
      groups: { label: string; now: string; then: string }[]
      character?: string
    }
  | { type: 'main-action-example'; sentence: string; backgroundPhrase: string; actionPhrase: string; character?: string }
  | { type: 'narration-chain'; imperfectoLines: string[]; indefinidoLine: string; closingIcon?: string }
  | { type: 'toggle-pair'; simple: string; progressive: string }
  | { type: 'exception-pairs'; items: [correct: string, wrong: string][] }
  | {
      type: 'dual-card'
      cards: { label: string; color: 'blue' | 'blueLight' | 'red'; text: string; example: string; icon?: string }[]
    }
  | {
      type: 'time-unit-card'
      variant: 'perfecto' | 'indefinido'
      desc?: string
      timeUnits?: string[]
      diagram?: { eventIcon: string; youIcon: string; times?: [string, string, string] }
      durations: { label: string; variant: 'perfecto' | 'indefinido' }[]
      example?: string
      exampleUnderline?: string
      exampleBold?: string
    }
  | { type: 'ejemplo-lines'; items: { underline: string; rest: string }[] }
  | {
      type: 'consequence-grid'
      items: { variant: 'perfecto' | 'indefinido'; quote: string; icon: string; caption: string }[]
    }
  | { type: 'tag-cloud'; groups: { variant: 'perfecto' | 'indefinido'; words: string[] }[] }
  | {
      type: 'mix-scenario'
      label: string
      backgroundPhrase: string
      actionPhrase: string
      actionVariant: 'perfecto' | 'indefinido'
      timeline: [string] | [string, string]
      character?: string
    }
  | {
      type: 'decision-tree'
      steps: (
        | { number: number; question: string; result: 'single'; label: string; hint: string }
        | { number: number; question: string; result: 'split'; options: { label: string; variant: 'perfecto' | 'indefinido'; hint: string }[] }
      )[]
      tip?: string
    }

export type LessonStep = {
  number: string
  title: string
  subtitle?: string
  richSubtitle?: { text: string; bold?: boolean; color?: 'red' | 'blue' | 'orange' }[]
  section?: 'haber' | 'participio'
  badgeColor?: 'blue' | 'green'
  blocks: LessonBlock[]
}

export type Lesson = {
  tenseId: string
  title: string
  subtitle?: string
  steps: LessonStep[]
  /** Overrides the auto-generated (steps-based) summary page when the summary doesn't map 1:1 to steps. */
  summarySteps?: LessonStep[]
}

export const LESSONS: Record<string, Lesson> = {
  'pretérito-perfecto': {
    tenseId: 'pretérito-perfecto',
    title: 'Pretérito Perfecto',
    steps: [
      {
        number: '1',
        title: 'A two-part tense',
        subtitle: 'Pretérito perfecto has two parts:',
        blocks: [
          {
            type: 'formula',
            character: '/images/teoria/Two - Javi Tostado.png',
            parts: [
              { tag: 'haber', label: 'auxiliar', color: 'blue' },
              { tag: 'participio', label: 'participle', color: 'orange' },
            ],
            compareEn: ['have', 'participle'],
          },
          {
            type: 'example',
            es: 'Esta semana (yo) he comido mucho.',
            en: 'This week, I have eaten a lot.',
            highlights: [
              { word: 'he', color: 'blue' },
              { word: 'comido', color: 'orange' },
              { word: 'have', color: 'blue' },
              { word: 'eaten', color: 'orange' },
            ],
          },
        ],
      },
      {
        number: '2',
        title: 'Conjugating the auxiliary: haber',
        subtitle: 'Haber changes to match the subject.',
        section: 'haber',
        blocks: [
          {
            type: 'table',
            character: '/images/teoria/Review - Javi Tostado.png',
            rows: [
              ['yo', 'he'],
              ['tú', 'has'],
              ['él/ella', 'ha'],
              ['nosotros', 'hemos'],
              ['vosotros', 'habéis'],
              ['ellos/ellas', 'han'],
            ],
            note: 'This is one of those conjugations you just have to memorize. ¡Tú puedes!',
          },
          {
            type: 'note',
            text: 'Notice how the auxiliar "have" matches the subject in English as well: I have eaten // She has eaten.',
          },
          {
            type: 'note',
            text: 'HABER and HAVE are visually similar too!',
          },
        ],
      },
      {
        number: '3.1',
        title: 'The participle: regular verbs',
        subtitle: 'After conjugating haber, we need the participle. To make it, replace the infinitive ending:',
        section: 'participio',
        blocks: [
          {
            type: 'rule-cards',
            items: [
              { suffix: '-ar', result: '-ado', examples: [['comprar', 'comprado']] },
              { suffix: '-er / -ir', result: '-ido', examples: [['comer', 'comido'], ['vivir', 'vivido']] },
            ],
          },
          {
            type: 'note',
            text: 'English uses -ed for regular participles (talk → talked). Spanish keeps the d and adds a final o, so it sounds more español-ish.',
          },
        ],
      },
      {
        number: '3.2',
        title: 'The participle: irregular verbs',
        subtitle: "Some don't follow the rule and have to be memorised. Here are some of the most common ones:",
        section: 'participio',
        blocks: [
          {
            type: 'pill-pairs',
            color: 'orange',
            items: [
              ['hacer', 'hecho'],
              ['decir', 'dicho'],
              ['ver', 'visto'],
              ['volver', 'vuelto'],
              ['poner', 'puesto'],
              ['abrir', 'abierto'],
              ['escribir', 'escrito'],
              ['romper', 'roto'],
            ],
          },
        ],
      },
      {
        number: '4',
        title: 'Small spelling detail: -ído',
        subtitle: 'Some regular participles have an accent in -ído.',
        badgeColor: 'green',
        blocks: [
          {
            type: 'note',
            variant: 'boxed',
            text: 'When the stem ends in a vowel and the participle uses -ido, we add an accent to show how the word is pronounced.',
          },
          {
            type: 'pill-pairs',
            color: 'green',
            items: [
              ['leer', 'leído'],
              ['oír', 'oído'],
              ['caer', 'caído'],
              ['traer', 'traído'],
            ],
          },
        ],
      },
    ],
  },
  'indefinido-regular': {
    tenseId: 'indefinido-regular',
    title: 'Indefinido',
    subtitle: 'regular',
    steps: [
      {
        number: '1',
        title: 'Stem: the main bit',
        subtitle: 'Most of the time, just **remove -ar / -er / -ir** to get the stem, then add the regular indefinido ending.',
        blocks: [
          {
            type: 'stem-cards',
            items: [['hablar', 'habl-'], ['comer', 'com-'], ['vivir', 'viv-']],
          },
        ],
      },
      {
        number: '2',
        title: 'Stem: vowel change in "él/ella/ellos/ellas"',
        subtitle: 'Some -ir verbs have a vowel change in the stem, but only in **él/ella** and **ellos/ellas** forms.',
        blocks: [
          { type: 'pill-pairs', color: 'lavender', items: [['e', 'i']] },
          {
            type: 'trio-table',
            headers: ['INFINITIVE', 'STEM', 'ÉL/ELLA · ELLOS/ELLAS'],
            rows: [
              ['repetir', 'repit-', 'repitió / repitieron'],
              ['sentir', 'sint-', 'sintió / sintieron'],
              ['seguir', 'sigu-', 'siguió / siguieron'],
              ['preferir', 'prefir-', 'prefirió / prefirieron'],
              ['mentir', 'mint-', 'mintió / mintieron'],
              ['competir', 'compit-', 'compitió / compitieron'],
              ['elegir', 'elig-', 'eligió / eligieron'],
              ['medir', 'mid-', 'midió / midieron'],
            ],
          },
          { type: 'pill-pairs', color: 'lavender', items: [['o', 'u']] },
          {
            type: 'trio-table',
            headers: ['INFINITIVE', 'STEM', 'ÉL/ELLA · ELLOS/ELLAS'],
            rows: [
              ['dormir', 'durm-', 'durmió / durmieron'],
              ['morir', 'mur-', 'murió / murieron'],
            ],
          },
        ],
      },
      {
        number: '3',
        title: 'Stem: spelling change in "yo"',
        subtitle: 'Verbs ending in **-car**, **-gar** or **-zar** need a spelling change in the **yo** form to keep the sound.',
        badgeColor: 'green',
        blocks: [
          { type: 'pill-pairs', color: 'green', items: [['c', 'qu']] },
          {
            type: 'infinitive-table',
            headers: ['INFINITIVE', 'YO'],
            rows: [
              ['explicar', 'expliqué'],
              ['buscar', 'busqué'],
              ['practicar', 'practiqué'],
              ['publicar', 'publiqué'],
            ],
          },
          { type: 'pill-pairs', color: 'green', items: [['g', 'gu']] },
          {
            type: 'infinitive-table',
            headers: ['INFINITIVE', 'YO'],
            rows: [
              ['llegar', 'llegué'],
              ['pagar', 'pagué'],
              ['jugar', 'jugué'],
            ],
          },
          { type: 'pill-pairs', color: 'green', items: [['z', 'c']] },
          {
            type: 'infinitive-table',
            headers: ['INFINITIVE', 'YO'],
            rows: [
              ['comenzar', 'comencé'],
              ['organizar', 'organicé'],
              ['utilizar', 'utilicé'],
            ],
          },
        ],
      },
      {
        number: '4',
        title: 'The ending',
        subtitle: 'Once you have the stem, add the regular indefinido ending:',
        blocks: [
          {
            type: 'dual-conjugation',
            style: 'pastel',
            groups: [
              {
                label: '-AR', color: 'lavender', highlightIndex: 2,
                rows: [['yo', '-é'], ['tú', '-aste'], ['él/ella', '-ó'], ['nosotros', '-amos'], ['vosotros', '-asteis'], ['ellos/ellas', '-aron']],
              },
              {
                label: '-ER/-IR', color: 'orange', highlightIndex: 2,
                rows: [['yo', '-í'], ['tú', '-iste'], ['él/ella', '-ió'], ['nosotros', '-imos'], ['vosotros', '-isteis'], ['ellos/ellas', '-ieron']],
              },
            ],
          },
        ],
      },
    ],
    summarySteps: [
      {
        number: '1',
        title: 'The stem',
        blocks: [
          {
            type: 'stem-cards',
            items: [['hablar', 'habl-'], ['comer', 'com-'], ['vivir', 'viv-']],
          },
          { type: 'pill-pairs', color: 'lavender', items: [['e', 'i']] },
          {
            type: 'pill-pairs',
            color: 'lavender',
            items: [
              ['sentir', 'sint-'], ['medir', 'mid-'], ['competir', 'compit-'], ['elegir', 'elig-'],
              ['mentir', 'mint-'], ['preferir', 'prefir-'], ['seguir', 'sigu-'], ['repetir', 'repit-'],
            ],
          },
          { type: 'pill-pairs', color: 'lavender', items: [['o', 'u']] },
          {
            type: 'pill-pairs',
            color: 'lavender',
            items: [['dormir', 'durm-'], ['morir', 'mur-']],
          },
        ],
      },
      {
        number: '2',
        title: 'The ending',
        blocks: [
          {
            type: 'dual-conjugation',
            style: 'pastel',
            groups: [
              {
                label: '-AR', color: 'lavender', highlightIndex: 2,
                rows: [['yo', '-é'], ['tú', '-aste'], ['él/ella', '-ó'], ['nosotros', '-amos'], ['vosotros', '-asteis'], ['ellos/ellas', '-aron']],
              },
              {
                label: '-ER/-IR', color: 'orange', highlightIndex: 2,
                rows: [['yo', '-í'], ['tú', '-iste'], ['él/ella', '-ió'], ['nosotros', '-imos'], ['vosotros', '-isteis'], ['ellos/ellas', '-ieron']],
              },
            ],
          },
        ],
      },
    ],
  },
  'indefinido-fully-irregular': {
    tenseId: 'indefinido-fully-irregular',
    title: 'Indefinido',
    subtitle: 'fully irregular',
    steps: [
      {
        number: '1',
        title: '3 fully irregular verbs',
        subtitle: "Good news! There aren't many fully irregular verbs!",
        blocks: [
          {
            type: 'word-pills',
            groups: [{ words: ['ser', 'ir'], color: 'pink' }, { words: ['dar'], color: 'pink' }],
          },
        ],
      },
      {
        number: '2',
        title: 'The twins: ser/ir',
        subtitle: 'Good news again! Ser and ir share the same forms. Context tells you which verb it is.',
        blocks: [
          {
            type: 'word-pills',
            groups: [{ words: ['ser', 'ir'], color: 'pink' }],
          },
          {
            type: 'table',
            rows: [
              ['yo', 'fui'],
              ['tú', 'fuiste'],
              ['él/ella', 'fue'],
              ['nosotros', 'fuimos'],
              ['vosotros', 'fuisteis'],
              ['ellos/ellas', 'fueron'],
            ],
          },
          {
            type: 'examples',
            color: 'pink',
            items: [
              { text: 'Marcos no fue a la fiesta ayer. (IR)', highlights: ['fue'] },
              { text: 'El camarero fue muy amable con nosotros ayer. (SER)', highlights: ['fue'] },
            ],
          },
        ],
      },
      {
        number: '3',
        title: 'The traitor: dar',
        subtitle: "It looks like an -ar verb, but conjugates like an -er/-ir verb. Traitor? Identity crisis? Who knows.",
        blocks: [
          {
            type: 'word-pills',
            groups: [{ words: ['dar'], color: 'pink' }],
          },
          {
            type: 'table',
            rows: [
              ['yo', 'di'],
              ['tú', 'diste'],
              ['él/ella', 'dio'],
              ['nosotros', 'dimos'],
              ['vosotros', 'disteis'],
              ['ellos/ellas', 'dieron'],
            ],
          },
          {
            type: 'examples',
            color: 'pink',
            items: [
              { text: '¡Me diste una idea genial el otro día!', highlights: ['diste'] },
              { text: 'Le dí un abrazo a mi madre porque estaba triste.', highlights: ['dí'] },
            ],
          },
        ],
      },
      {
        number: '4',
        title: 'Spelling detail: no accents',
        subtitle: "Monosyllabic indefinido forms don't take accents.",
        badgeColor: 'green',
        blocks: [
          {
            type: 'correction-pairs',
            items: [
              ['dí', 'di'],
              ['dió', 'dio'],
              ['ví', 'vi'],
              ['vió', 'vio'],
              ['fuí', 'fui'],
              ['fué', 'fue'],
            ],
          },
        ],
      },
    ],
  },
  'indefinido-semi-irregular': {
    tenseId: 'indefinido-semi-irregular',
    title: 'Indefinido',
    subtitle: 'semi-irregular',
    steps: [
      {
        number: '1',
        title: 'Different stems, shared endings',
        subtitle: 'Some verbs **change their stem**. They need to be memorised, but the reward is worth it: **same endings** for all of them!',
        blocks: [
          {
            type: 'stem-formula',
            stems: [['tener', 'tuv-'], ['estar', 'estuv-'], ['poder', 'pud-']],
            endings: ['-e', '-iste', '-o', '-imos', '-isteis', '-ieron'],
          },
        ],
      },
      {
        number: '2',
        title: 'Different stems',
        subtitle: 'Some of the most common verbs and their stems are:',
        blocks: [
          {
            type: 'infinitive-table',
            headers: ['INFINITIVE', 'STEM'],
            rows: [
              ['tener', 'tuv-'],
              ['estar', 'estuv-'],
              ['poder', 'pud-'],
              ['poner', 'pus-'],
              ['saber', 'sup-'],
              ['querer', 'quis-'],
              ['venir', 'vin-'],
              ['hacer', 'hic-'],
            ],
          },
        ],
      },
      {
        number: '3.1',
        title: 'Shared endings',
        subtitle: 'If the stem changes, you need to add one of these endings.',
        blocks: [
          {
            type: 'boxed-pairs',
            accent: 'orange',
            rows: [
              ['yo', '-e'],
              ['tú', '-iste'],
              ['él/ella', '-o'],
              ['nosotros', '-imos'],
              ['vosotros', '-isteis'],
              ['ellos/ellas', '-ieron/-eron'],
            ],
          },
          {
            type: 'note',
            text: 'Notice: **no accents here**, unlike regular indefinido forms.',
          },
          {
            type: 'example-words',
            color: 'orange',
            words: ['tuve', 'tuviste', 'tuvo', 'tuvimos', 'tuvisteis', 'tuvieron'],
          },
        ],
      },
      {
        number: '3.2',
        title: 'Shared endings: plot twist',
        subtitle: 'Watch out with ellos/ellas',
        blocks: [
          {
            type: 'boxed-pairs',
            accent: 'orange',
            highlightIndex: 5,
            rows: [
              ['yo', '-e'],
              ['tú', '-iste'],
              ['él/ella', '-o'],
              ['nosotros', '-imos'],
              ['vosotros', '-isteis'],
              ['ellos/ellas', '-ieron/-eron'],
            ],
          },
          {
            type: 'note',
            character: '/images/teoria/Point - Zas.png',
            text: "Remember the two stems highlighted in Section 2? They both end in \"j\". With **j-stems**, ellos/ellas uses **-eron** instead of -ieron.",
          },
          {
            type: 'trio-table',
            headers: ['INFINITIVE', 'STEM', 'ELLOS/ELLAS'],
            rows: [
              ['decir', 'dij-', 'dijeron'],
              ['traer', 'traj-', 'trajeron'],
            ],
          },
        ],
      },
      {
        number: '4',
        title: 'Spelling detail: hacer',
        subtitle: 'Hacer uses the stem *hic-*, but in **él/ella** it changes to *hiz-* to keep the sound.',
        badgeColor: 'green',
        blocks: [
          {
            type: 'boxed-pairs',
            accent: 'green',
            rows: [
              ['yo', 'hice'],
              ['tú', 'hiciste'],
              ['él/ella', 'hizo'],
              ['nosotros', 'hicimos'],
              ['vosotros', 'hicisteis'],
              ['ellos/ellas', 'hicieron'],
            ],
          },
        ],
      },
    ],
  },
  'imperfecto-irregular': {
    tenseId: 'imperfecto-irregular',
    title: 'Imperfecto',
    subtitle: 'irregular',
    steps: [
      {
        number: '1',
        title: '3 irregular verbs',
        subtitle: "Good news! There aren't many irregular verbs!",
        blocks: [
          {
            type: 'word-pills',
            groups: [
              { words: ['ser'], color: 'wine' },
              { words: ['ir'], color: 'wine' },
              { words: ['ver'], color: 'pink' },
            ],
          },
        ],
      },
      {
        number: '2',
        title: 'Pure memory: ser / ir',
        subtitle: 'These are the **only two** imperfecto verbs you really have to **learn by heart**: ir and ser. ¡Tú puedes!',
        blocks: [
          {
            type: 'dual-conjugation',
            groups: [
              {
                label: 'ser', color: 'wine',
                rows: [['yo', 'era'], ['tú', 'eras'], ['él/ella', 'era'], ['nosotros', 'éramos'], ['vosotros', 'erais'], ['ellos/ellas', 'eran']],
              },
              {
                label: 'ir', color: 'wine',
                rows: [['yo', 'iba'], ['tú', 'ibas'], ['él/ella', 'iba'], ['nosotros', 'íbamos'], ['vosotros', 'ibais'], ['ellos/ellas', 'iban']],
              },
            ],
          },
        ],
      },
      {
        number: '3',
        title: 'The tiny rebel: ver',
        subtitle: 'Ver barely breaks the rule: it uses the **regular -er endings**, but **keeps the e** in the stem.',
        blocks: [
          {
            type: 'word-pills',
            groups: [{ words: ['ver'], color: 'pink' }],
          },
          {
            type: 'accent-table',
            color: 'pink',
            underline: 'e',
            rows: [
              ['yo', 'veía'],
              ['tú', 'veías'],
              ['él/ella', 'veía'],
              ['nosotros', 'veíamos'],
              ['vosotros', 'veíais'],
              ['ellos/ellas', 'veían'],
            ],
          },
          {
            type: 'note',
            text: 'Since *ver* takes the regular **-ía endings**, remember to keep the **accent**.',
          },
        ],
      },
    ],
  },
  'imperfecto-regular': {
    tenseId: 'imperfecto-regular',
    title: 'Imperfecto',
    subtitle: 'regular',
    steps: [
      {
        number: '1',
        title: 'Classic stem',
        subtitle: 'For regular verbs, **remove -ar / -er / -ir** and add the imperfecto endings.',
        blocks: [
          {
            type: 'stem-cards',
            items: [['hablar', 'habl-'], ['comer', 'com-'], ['vivir', 'viv-']],
          },
        ],
      },
      {
        number: '2',
        title: 'The ending',
        subtitle: 'Once you have the stem, add the regular imperfecto ending:',
        blocks: [
          {
            type: 'dual-conjugation',
            style: 'pastel',
            groups: [
              {
                label: '-AR', color: 'lavender', highlightIndex: 3,
                rows: [['yo', '-aba'], ['tú', '-abas'], ['él/ella', '-aba'], ['nosotros', '-ábamos'], ['vosotros', '-abais'], ['ellos/ellas', '-aban']],
              },
              {
                label: '-ER/-IR', color: 'orange', highlightIndex: 0,
                rows: [['yo', '-ía'], ['tú', '-ías'], ['él/ella', '-ía'], ['nosotros', '-íamos'], ['vosotros', '-íais'], ['ellos/ellas', '-ían']],
              },
            ],
          },
        ],
      },
    ],
  },
  'imperfecto-indefinido': {
    tenseId: 'imperfecto-indefinido',
    title: 'Imperfecto - Indefinido',
    steps: [
      {
        number: '1',
        title: '3 uses of Imperfecto',
        richSubtitle: [
          { text: 'While ' },
          { text: 'Perfecto', bold: true, color: 'red' },
          { text: ' and ' },
          { text: 'Indefinido', bold: true, color: 'blue' },
          { text: ' tell us ' },
          { text: 'what happened', bold: true },
          { text: ', ' },
          { text: 'Imperfecto', bold: true, color: 'orange' },
          { text: ' paints ' },
          { text: 'what things were like', bold: true },
          { text: ' around it.' },
        ],
        blocks: [
          {
            type: 'uses-list',
            items: [
              {
                icon: 'repeat', image: '/images/teoria/liodetiempos/Habit - Mimo.png', title: 'Habits', desc: 'How things **were** or **used to be like**.',
                examples: ['Cuando era joven **bebía** café cada mañana.', 'Antes **vivía** en Londres.'],
              },
              {
                icon: 'file', image: '/images/teoria/liodetiempos/Description - Mimo.png', title: 'Descriptions', desc: '**People**, **places** and **things** from the past.',
                examples: ['Mi jefe anterior **hablaba** mucho.', 'Mi primer coche **era** rojo.'],
              },
              {
                icon: 'cloud', image: '/images/teoria/liodetiempos/Ongoing background - Mimo.png', title: 'Ongoing background', desc: '**What was taking place** when something happened.',
                examples: ['Llegué tarde porque el metro **no funcionaba**.'],
              },
            ],
          },
          {
            type: 'validity-note',
            text: 'Imperfecto **does not** mark an endpoint. As soon as you add closed limits, it stops working.',
            correct: 'Antes vivía en Barcelona.',
            incorrect: 'Vivía en Barcelona entre 2023 y 2024.',
            caption: 'If you add closed limits, like "between 2023 and 2024", it is no longer background; it needs Indefinido.',
          },
        ],
      },
      {
        number: '2',
        title: 'Imperfecto: almost like the present',
        subtitle: 'Imperfecto is the **present**, but in the past. What you\'d say in the present now, you say in imperfecto when it\'s "back then".',
        blocks: [
          {
            type: 'now-then-list',
            groups: [
              { label: 'Habits', now: 'Ahora **vivo** en Barcelona.', then: 'Antes **vivía** en Singapur.' },
              { label: 'Descriptions', now: 'Mi actual jefe **es** muy inteligente.', then: 'Mi primer jefe **era** muy inteligente.' },
              { label: 'Ongoing background', now: 'Está **lloviendo**.', then: '**Estaba lloviendo** cuando salí.' },
            ],
          },
        ],
      },
      {
        number: '3',
        title: 'Ongoing background',
        subtitle: "Let's focus on this specific use now, because it **often appears together** with Indefinido or Perfecto.",
        blocks: [
          {
            type: 'now-then-list',
            character: '/images/teoria/liodetiempos/Front - Mimo.png',
            groups: [
              { label: 'Ongoing background', now: 'Está **lloviendo**.', then: '**Estaba lloviendo** cuando salí.' },
            ],
          },
        ],
      },
      {
        number: '4',
        title: 'Background vs. Main action',
        richSubtitle: [
          { text: 'Ongoing present works on its own. But ongoing imperfecto doesn\'t: it works as ' },
          { text: 'background', bold: true, color: 'orange' },
          { text: ', so it needs a ' },
          { text: 'main action', bold: true, color: 'blue' },
          { text: '. That\'s where Indefinido or Perfecto comes in.' },
        ],
        blocks: [
          {
            type: 'main-action-example',
            character: '/images/teoria/liodetiempos/Hungry - Mimo.png',
            sentence: 'Tenía hambre, por eso comí algo.',
            backgroundPhrase: 'tenía hambre',
            actionPhrase: 'comí',
          },
          {
            type: 'main-action-example',
            sentence: 'Estaba lloviendo cuando salí de clase.',
            backgroundPhrase: 'estaba lloviendo',
            actionPhrase: 'salí',
          },
        ],
      },
      {
        number: '5',
        title: 'Simple vs. progressive',
        badgeColor: 'green',
        subtitle: 'For ongoing background, you can often use **both simple and progressive forms**. But there are **a few exceptions**.',
        blocks: [
          { type: 'toggle-pair', simple: 'llovía', progressive: 'estaba lloviendo' },
          {
            type: 'note',
            variant: 'boxed',
            text: 'But some verbs only work in the simple form: **querer, ser, poder, tener**',
          },
          {
            type: 'exception-pairs',
            items: [
              ['quería', 'estaba queriendo'],
              ['era', 'estaba siendo'],
              ['podía', 'estaba pudiendo'],
              ['tenía', 'estaba teniendo'],
            ],
          },
        ],
      },
      {
        number: '6',
        title: 'Closing Indefinido',
        subtitle: 'After a chain of imperfectos that set the **background**, an **indefinido closes the narration**.',
        blocks: [
          {
            type: 'narration-chain',
            closingIcon: '/images/teoria/liodetiempos/Wake up - Zas.png',
            imperfectoLines: ['había mucha gente', 'la música era fantástica', 'el ambiente era estupendo'],
            indefinidoLine: 'lo pasé muy bien',
          },
        ],
      },
    ],
    summarySteps: [
      {
        number: '1',
        title: '3 uses of Imperfecto',
        blocks: [
          {
            type: 'uses-list',
            items: [
              { icon: 'repeat', image: '/images/teoria/liodetiempos/Habit - Mimo.png', title: 'Habits', desc: 'How things **were** or **used to be like**.', examples: ['Antes **vivía** en Londres.'] },
              { icon: 'file', image: '/images/teoria/liodetiempos/Description - Mimo.png', title: 'Descriptions', desc: '**People**, **places** and **things** from the past.', examples: ['Mi primer jefe **hablaba** mucho.'] },
              { icon: 'cloud', image: '/images/teoria/liodetiempos/Ongoing background - Mimo.png', title: 'Ongoing background', desc: '**What was taking place** when something happened.', examples: ['Llegué tarde porque el metro **no funcionaba**.'] },
            ],
          },
        ],
      },
      {
        number: '3',
        title: 'Indefinido: main action and closing',
        blocks: [
          {
            type: 'dual-card',
            cards: [
              { label: 'MAIN ACTION', color: 'blue', text: 'Ongoing imperfecto works as **background**, so it needs a **main action**.', example: 'Tenía hambre, por eso comí algo.' },
              { label: 'CLOSING', color: 'blueLight', text: 'After a chain of imperfectos that set the **background**, an indefinido **closes the narration**.', example: 'En la fiesta había mucha gente, la música era fantástica y el ambiente era estupendo. Lo pasé muy bien.' },
            ],
          },
        ],
      },
      {
        number: '4',
        title: 'Ongoing background: simple & progressive forms',
        badgeColor: 'green',
        blocks: [
          { type: 'toggle-pair', simple: 'llovía', progressive: 'estaba lloviendo' },
          {
            type: 'exception-pairs',
            items: [
              ['quería', 'estaba queriendo'],
              ['era', 'estaba siendo'],
              ['podía', 'estaba pudiendo'],
              ['tenía', 'estaba teniendo'],
            ],
          },
        ],
      },
    ],
  },
  'perfecto-indefinido': {
    tenseId: 'perfecto-indefinido',
    title: 'Pretérito perfecto - Indefinido',
    steps: [
      {
        number: '1',
        title: 'The main idea: time unit',
        subtitle: 'Everything depends on the **time unit**: did the action happen in a time unit **you are still in**, or in one that is already **closed**?',
        blocks: [
          {
            type: 'time-unit-card',
            variant: 'perfecto',
            desc: 'The event happened in a time unit that is **not over yet**.',
            timeUnits: ['hoy', 'esta semana', 'este mes', 'este año'],
            diagram: {
              eventIcon: '/images/teoria/liodetiempos/perfectovsindefinido/Fish - Javi Tostado.png',
              youIcon: '/images/teoria/liodetiempos/perfectovsindefinido/Baby - Javi Tostado.png',
              times: ['9:00', '15:00', '23:00'],
            },
            durations: [{ label: 'hoy', variant: 'perfecto' }],
            example: 'Hoy he perdido a mi pez.',
            exampleUnderline: 'Hoy',
            exampleBold: 'he perdido',
          },
          {
            type: 'time-unit-card',
            variant: 'indefinido',
            diagram: {
              eventIcon: '/images/teoria/liodetiempos/perfectovsindefinido/Fish - Javi Tostado.png',
              youIcon: '/images/teoria/liodetiempos/perfectovsindefinido/Baby - Javi Tostado.png',
            },
            durations: [{ label: 'ayer', variant: 'indefinido' }, { label: 'hoy', variant: 'perfecto' }],
            example: 'Ayer perdí a mi pez.',
            exampleUnderline: 'Ayer',
            exampleBold: 'perdí',
          },
        ],
      },
      {
        number: '2.1',
        title: 'P.Perfecto: ya · todavía no · alguna vez',
        subtitle: '*Ya*, *todavía no* and *alguna vez* often use perfecto because the time unit they refer to is **your life up to now** (which is not over yet).',
        blocks: [
          {
            type: 'time-unit-card',
            variant: 'perfecto',
            diagram: {
              eventIcon: '/images/teoria/liodetiempos/perfectovsindefinido/Travel - Javi Tostadi.png',
              youIcon: '/images/teoria/liodetiempos/perfectovsindefinido/Baby - Javi Tostado.png',
            },
            durations: [{ label: 'mi vida', variant: 'perfecto' }],
          },
          {
            type: 'ejemplo-lines',
            items: [
              { underline: 'Ya', rest: 'he viajado en avión.' },
              { underline: 'Todavía no', rest: 'he viajado en avión.' },
              { underline: 'Alguna vez', rest: 'he viajado en avión.' },
            ],
          },
        ],
      },
      {
        number: '2.2',
        title: 'P.Perfecto: este/esta',
        subtitle: 'Este/esta often points to a time unit **connected to now**. That is why it often goes with perfecto.',
        blocks: [
          {
            type: 'time-unit-card',
            variant: 'perfecto',
            diagram: {
              eventIcon: '/images/teoria/liodetiempos/perfectovsindefinido/Play - Javi Tostado.png',
              youIcon: '/images/teoria/liodetiempos/perfectovsindefinido/Baby - Javi Tostado.png',
            },
            durations: [{ label: 'esta mañana', variant: 'indefinido' }, { label: 'hoy', variant: 'perfecto' }],
          },
          {
            type: 'ejemplo-lines',
            items: [
              { underline: 'Esta mañana', rest: 'he jugado mucho.' },
              { underline: 'Esta semana', rest: 'he tenido tres exámenes.' },
              { underline: 'Esta noche', rest: 'no he dormido bien.' },
            ],
          },
        ],
      },
      {
        number: '3',
        title: 'What about the consequences?',
        subtitle: "When there's no explicit time unit, perfecto shows that the action **still matters** now, while indefinido presents the event as **finished and closed**.",
        blocks: [
          {
            type: 'consequence-grid',
            items: [
              { variant: 'perfecto', quote: 'He perdido el pasaporte', icon: '/images/teoria/liodetiempos/perfectovsindefinido/Sad - Javi Tostado.png', caption: 'Ahora no lo tengo' },
              { variant: 'indefinido', quote: 'Perdí el pasaporte', icon: '/images/teoria/liodetiempos/perfectovsindefinido/Passport - Javi Tostado.png', caption: 'Ya lo recuperé/Tengo otro' },
              { variant: 'perfecto', quote: 'Me he roto la pierna', icon: '/images/teoria/liodetiempos/perfectovsindefinido/Leg hurt - Javi Tostadi.png', caption: 'Sigo con la pierna mal' },
              { variant: 'indefinido', quote: 'Me rompí la pierna', icon: '/images/teoria/liodetiempos/perfectovsindefinido/Leg - Javi Tostado.png', caption: 'Ya estoy bien' },
            ],
          },
        ],
      },
    ],
    summarySteps: [
      {
        number: '1',
        title: 'Main difference',
        blocks: [
          {
            type: 'dual-card',
            cards: [
              { label: 'PERFECTO', color: 'red', icon: '/images/teoria/liodetiempos/Eating - Javi Tostado.png', text: 'The event happened in a time unit that is **not over yet**.', example: 'Hoy he comido sushi.' },
              { label: 'INDEFINIDO', color: 'blue', icon: '/images/teoria/liodetiempos/Eating - Zas.png', text: 'The event happened in a time unit that is **already over**.', example: 'Ayer comí sushi.' },
            ],
          },
        ],
      },
      {
        number: '2',
        title: 'Time unit',
        blocks: [
          {
            type: 'tag-cloud',
            groups: [
              { variant: 'perfecto', words: ['hoy', 'esta semana', 'este mes', 'este año', 'este verano', 'estas vacaciones', 'todavía no', 'ya', 'alguna vez', 'en mi vida'] },
              { variant: 'indefinido', words: ['ayer', 'anoche', 'la semana pasada', 'en 2020'] },
            ],
          },
        ],
      },
    ],
  },
  'perfecto-imperfecto-indefinido': {
    tenseId: 'perfecto-imperfecto-indefinido',
    title: 'Perfecto - Imperfecto - Indefinido',
    steps: [
      {
        number: '1',
        title: 'Remember',
        richSubtitle: [
          { text: 'Imperfecto', bold: true, color: 'orange' },
          { text: ' paints ' },
          { text: 'what things were like', bold: true },
          { text: ' around the action. ' },
          { text: 'Perfecto', bold: true, color: 'red' },
          { text: ' and ' },
          { text: 'Indefinido', bold: true, color: 'blue' },
          { text: ' both tell us ' },
          { text: 'what happened', bold: true },
          { text: '. The difference is when it happened: the ' },
          { text: 'time unit', bold: true },
          { text: '.' },
        ],
        blocks: [
          {
            type: 'mix-scenario',
            label: 'AYER',
            character: '/images/teoria/liodetiempos/Hungry - Mimo.png',
            backgroundPhrase: 'Tenía hambre',
            actionPhrase: 'comí',
            actionVariant: 'indefinido',
            timeline: ['ayer', 'hoy'],
          },
          {
            type: 'mix-scenario',
            label: 'ESTA MAÑANA (HOY)',
            character: '/images/teoria/liodetiempos/Hungry - Mimo.png',
            backgroundPhrase: 'Tenía hambre',
            actionPhrase: 'he comido',
            actionVariant: 'perfecto',
            timeline: ['hoy'],
          },
        ],
      },
    ],
    summarySteps: [
      {
        number: '1',
        title: 'So... which tense do I choose?',
        subtitle: "Two questions and you've got it. First, the **background**; then, if it's an event, look at the **time unit**.",
        blocks: [
          {
            type: 'decision-tree',
            steps: [
              { number: 1, question: 'Is it background, habit or description?', result: 'single', label: 'Imperfecto', hint: 'había, era, llovía, vivía...' },
              {
                number: 2, question: 'Is it an action/event? What time unit is it in?', result: 'split',
                options: [
                  { label: 'Perfecto', variant: 'perfecto', hint: 'open time unit · this...' },
                  { label: 'Indefinido', variant: 'indefinido', hint: 'closed time unit · yesterday' },
                ],
              },
            ],
            tip: "Struggling with the first question? Some sentences mix both — split them: imperfecto sets the background, perfecto or indefinido says what happened.",
          },
        ],
      },
    ],
  },
}
