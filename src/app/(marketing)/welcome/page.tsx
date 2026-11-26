import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import JsonLd from './JsonLd'
import { FAQ, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site'

/**
 * Public landing page. It is never visited at /welcome: the proxy rewrites "/" here for
 * signed-out visitors (signed-in users get the app home at the same URL), and sends direct hits
 * on /welcome back to "/". That is why the canonical points at "/".
 *
 * It exists for search engines and AI answer engines as much as for people: before it, "/" was a
 * redirect to /login, so Google indexed one page and nothing an assistant could quote.
 */
export const metadata: Metadata = {
  title: { absolute: 'Miaustico: practise the Spanish past tenses' },
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
}

const TENSES = [
  {
    name: 'Indefinido',
    cat: 'Zas',
    image: { src: '/images/escribiendo/zas.png', width: 342, height: 328 },
    color: '#4A5BB5',
    use: 'For finished actions at a specific moment in the past: yesterday, last year, in 2019.',
    example: 'Ayer comí paella con mis compañeros.',
    translation: 'Yesterday I ate paella with my classmates.',
  },
  {
    name: 'Imperfecto',
    cat: 'Mimo',
    image: { src: '/images/escribiendo/mimo.png', width: 296, height: 438 },
    color: '#E8922A',
    use: 'For habits, descriptions and the background of a story: what used to happen, what was going on.',
    example: 'De pequeño, comía paella todos los domingos.',
    translation: 'As a child, I used to eat paella every Sunday.',
  },
  {
    name: 'Pretérito perfecto',
    cat: 'Javi Tostado',
    image: { src: '/images/escribiendo/javi-tostado.png', width: 329, height: 416 },
    color: '#C85C6E',
    use: 'For the past that still touches the present: today, this week, ever, never.',
    example: 'Hoy he comido paella en la cafetería.',
    translation: 'Today I have eaten paella in the cafeteria.',
  },
] as const

const MODES = [
  {
    name: 'Escribiendo…',
    image: { src: '/images/home/escribiendo.png', width: 752, height: 1363 },
    text: 'Type the right form of the verb in real sentences, one tense at a time, and see straight away what was wrong.',
  },
  {
    name: 'Lío de tiempos',
    image: { src: '/images/home/liodetiempos.png', width: 752, height: 1359 },
    text: 'The tenses get mixed up. Choose which one each sentence needs, and learn to tell them apart.',
  },
  {
    name: 'Battle',
    image: { src: '/images/home/multiplayer.png', width: 1498, height: 1104 },
    text: 'Join a room with a six-character code and answer the same questions as your classmates, with a live scoreboard after every round.',
  },
] as const

function PrimaryCta() {
  return (
    <Link
      href="/signup"
      className="inline-flex items-center justify-center rounded-full bg-bsp-orange px-6 py-3 text-sm font-bold text-black shadow-md transition-transform hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
    >
      Create account
    </Link>
  )
}

function LoginLink() {
  return (
    <Link
      href="/login"
      className="rounded-full px-4 py-3 text-sm font-semibold text-white underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      Log in
    </Link>
  )
}

export default function WelcomePage() {
  return (
    // The app's body defaults (0.75rem, weight 600, line-height 1) are tuned for dense game
    // screens; reading copy needs a normal base, so this page resets it once at the root.
    <div lang="en" className="flex min-h-dvh flex-col bg-gray-100 text-base font-normal leading-normal text-gray-900">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebApplication',
              name: SITE_NAME,
              url: SITE_URL,
              description: SITE_DESCRIPTION,
              applicationCategory: 'EducationalApplication',
              operatingSystem: 'Web',
              inLanguage: ['en', 'es'],
              audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
              teaches: TENSES.map(t => `Spanish ${t.name.toLowerCase()} tense`),
            },
            {
              '@type': 'FAQPage',
              mainEntity: FAQ.map(({ q, a }) => ({
                '@type': 'Question',
                name: q,
                acceptedAnswer: { '@type': 'Answer', text: a },
              })),
            },
          ],
        }}
      />

      {/* ── Hero ── */}
      <header className="relative overflow-hidden bg-bsp-blue">
        <div className="relative z-10 mx-auto max-w-3xl px-6 pb-14 pt-12 sm:pb-16 sm:pt-16">
          <Image
            src="/images/login/logo.png"
            alt="Miaustico BSP"
            width={310}
            height={66}
            priority
            className="mb-10 h-auto w-28"
          />
          <h1 className="max-w-[13ch] text-[2.5rem] font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
            Practise the Spanish past tenses, one cat at a time.
          </h1>
          <p className="mt-5 max-w-[34ch] text-base leading-relaxed text-white/85 sm:max-w-[46ch] sm:text-lg">
            Miaustico is a practice app for students learning Spanish. Write sentences in the
            indefinido, imperfecto and pretérito perfecto, learn when each one fits, and play live
            quizzes against your class.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <PrimaryCta />
            <LoginLink />
          </div>
          <p className="mt-4 max-w-[30ch] text-xs text-white/70">
            Sign up with a username and a 4-digit PIN. No email needed.
          </p>
        </div>

        {/* Same peeking cat as the login screen: the art is cropped down its right edge, so it
            only reads correctly flush against the right of the viewport. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-4 bottom-0 w-[28%] max-w-[300px] sm:right-0 sm:w-[30%]"
        >
          <Image
            src="/images/login/logincat.png"
            alt=""
            width={637}
            height={1004}
            priority
            className="h-auto w-full"
          />
        </div>
      </header>

      {/* ── Wave separator (same curve as the app home) ── */}
      <div className="-mb-px -mt-px bg-bsp-blue" aria-hidden>
        <svg viewBox="0 0 402 36" preserveAspectRatio="none" className="block h-9 w-full">
          <path d="M0,0 C67,36 134,0 201,18 C268,36 335,0 402,18 L402,36 L0,36 Z" fill="#F3F4F6" />
        </svg>
      </div>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6">
        {/* ── The cast ── */}
        <section aria-labelledby="tenses" className="pt-8">
          <h2 id="tenses" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Three past tenses, three cats
          </h2>
          <p className="mt-3 max-w-[52ch] leading-relaxed text-gray-600">
            Each tense has its own character, so you remember which is which. Here is the same verb,
            <span lang="es"> comer</span>, in all three.
          </p>

          <ul className="mt-10 flex flex-col gap-12">
            {TENSES.map(t => (
              <li key={t.name} className="flex items-start gap-5 sm:gap-8">
                <div className="flex w-20 shrink-0 justify-center sm:w-28">
                  <Image
                    src={t.image.src}
                    alt={`${t.cat}, the ${t.name.toLowerCase()} cat`}
                    width={t.image.width}
                    height={t.image.height}
                    className="h-auto max-h-28 w-auto object-contain sm:max-h-36"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold leading-tight" lang="es">
                    {t.name}
                  </h3>
                  <p className="text-sm font-semibold" style={{ color: t.color }}>
                    with {t.cat}
                  </p>
                  <p className="mt-2 max-w-[48ch] leading-relaxed text-gray-700">{t.use}</p>
                  <blockquote
                    className="mt-4 rounded-2xl border-l-4 bg-white px-4 py-3"
                    style={{ borderColor: t.color }}
                  >
                    <p lang="es" className="font-semibold text-gray-900">{t.example}</p>
                    <p className="mt-1 text-sm text-gray-500">{t.translation}</p>
                  </blockquote>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Modes ── */}
        <section aria-labelledby="modes" className="pt-20">
          <h2 id="modes" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Three ways to practise
          </h2>
          <ul className="mt-8 flex flex-col divide-y divide-gray-200">
            {MODES.map(m => (
              <li key={m.name} className="flex items-center gap-5 py-5">
                <div className="relative h-20 w-20 shrink-0">
                  <Image
                    src={m.image.src}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold" lang="es">{m.name}</h3>
                  <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-gray-700">{m.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-[56ch] text-sm leading-relaxed text-gray-600">
            Every tense comes with a short theory lesson, and your mistakes are saved so you can redo
            exactly the sentences you got wrong. Daily challenges, streaks, levels and badges keep you
            coming back.
          </p>
        </section>

        {/* ── FAQ (mirrored in the FAQPage JSON-LD above) ── */}
        <section aria-labelledby="faq" className="pb-16 pt-20">
          <h2 id="faq" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Questions
          </h2>
          <dl className="mt-6 flex flex-col gap-6">
            {FAQ.map(({ q, a }) => (
              <div key={q}>
                <dt className="font-bold">{q}</dt>
                <dd className="mt-1 max-w-[60ch] leading-relaxed text-gray-700">{a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      {/* ── Closing CTA ── */}
      <footer className="bg-bsp-blue">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <p className="max-w-[20ch] text-2xl font-extrabold leading-tight text-white">
            Zas, Mimo and Javi are waiting for you.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <PrimaryCta />
            <LoginLink />
          </div>
          <p className="mt-10 text-xs text-white/60">Miaustico BSP</p>
        </div>
      </footer>
    </div>
  )
}
