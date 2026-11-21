// Shared between the landing page, its JSON-LD, the root metadata and the OG image, so the
// visible copy and what search/answer engines read never drift apart.

export const SITE_URL = 'https://www.miaustico.com'
export const SITE_NAME = 'Miaustico BSP'
export const SITE_DESCRIPTION =
  'Practise the Spanish past tenses (indefinido, imperfecto and pretérito perfecto) with writing drills, mixed-tense quizzes and live class battles. Built for IESE students learning Spanish.'

export const FAQ = [
  {
    q: 'What is Miaustico?',
    a: 'Miaustico (BSP) is a web app for practising Spanish verb tenses. You write and choose verb forms in real sentences, read short theory lessons, and compete in live quizzes with your classmates.',
  },
  {
    q: 'Which Spanish tenses can I practise?',
    a: 'The three past tenses: the indefinido (regular, semi-irregular and fully irregular verbs), the imperfecto (regular and irregular verbs) and the pretérito perfecto. There are also mixed sessions where you decide which tense each sentence needs.',
  },
  {
    q: 'Who is it for?',
    a: 'Students at IESE who are learning Spanish and want to get the past tenses right. It works on any phone or computer browser.',
  },
  {
    q: 'How do I sign up?',
    a: 'Choose a username and a 4-digit PIN. You do not need an email address.',
  },
] as const
