# CLAUDE.md — BSP App

> Senior React/TypeScript standards for a production-grade Next.js 14 + Supabase app.
> Read this file before touching any code. No exceptions.

---

## Project Overview

**BSP** is a Duolingo-style Spanish learning app for IESE students. Two modes:
- **Singleplayer** — self-paced practice organized by verb tense (`/learn` "Escribiendo…", `/practice` "Lío de tiempos")
- **Multiplayer** — real-time competitive rooms with live scoring (`/room/[code]` lobby, `/play/[code]` live game "Battle")

**Stack:** Next.js **16** App Router · TypeScript (strict) · Tailwind CSS **v4** · shadcn/ui · Supabase (PostgreSQL + Auth + Realtime) · Zustand · Vercel

### Design (Figma — Mobile Hi-fi)

All screens are mobile-first at **402px wide** (iPhone frame). Key screens confirmed:

| Screen | Figma node | Notes |
|--------|-----------|-------|
| Log in | `725:4566` | Username + 4-digit PIN (not email/password) |
| Create account | `725:4899` | Same pattern — username + PIN |
| Home | `725:5485` | Header w/ streak pill + level pill, activity cards, bottom nav |
| Escribiendo… home | `745:5512` | Singleplayer writing mode entry |
| Lío de tiempos home | `745:5513` | Singleplayer tense battle entry |
| Activity screens | `745:5520+` | Practice flow with Correct/Incorrect states |
| Battle (lobby) | `759:5677` | Multiplayer room |
| Dashboard (per question) | `774:5694` | Live scoreboard after each round |
| Dashboard (final) | `774:5697` | End-of-game results |
| Profile | `777:5699` | User stats |
| Lessons | `777:6839+` | Pretérito Perfecto, Indefinido, Imperfecto, etc. |

**Auth pattern from Figma:** Login is **username + 4-digit PIN** — simpler than email/password, fits the student context. Supabase Auth email field stores a generated internal email (`{username}@bsp.internal`); the PIN maps to the password. This avoids exposing emails and simplifies the UX.

**UI tokens observed:**
- Strike pill: fire emoji + count (streak)
- Level pill: star icon + "Lvl N."
- Bottom nav: fixed, 261px wide, centered
- Cards: "Card 1" (Escribiendo…), "Card 2" (Lío de tiempos), "Card 3" (third mode/Battle)
- Header background: custom shape vector (wave/curve), not a flat color
- Correct state: green feedback; Incorrect: red feedback

---

## Non-Negotiable Rules

### TypeScript

- `strict: true` always. No `any`, no `// @ts-ignore`, no `as unknown as X`.
- Use `satisfies` over `as` when narrowing types.
- All Supabase queries use generated types from `src/types/database.types.ts`. Regenerate after every migration:
  ```bash
  pnpm dlx supabase gen types typescript --linked > src/types/database.types.ts
  ```
- Prefer `type` over `interface` for shapes. Use `interface` only for things meant to be extended.
- Never use `enum` — use `as const` objects and derive the type:
  ```ts
  const ROOM_STATUS = { waiting: 'waiting', playing: 'playing', finished: 'finished' } as const;
  type RoomStatus = typeof ROOM_STATUS[keyof typeof ROOM_STATUS];
  ```

### React / Next.js

- **Server Components by default.** Only add `'use client'` when the component needs browser APIs, event handlers, or React hooks.
- Never call Supabase from a Client Component directly. Data flows: Server Component → prop / Server Action → mutation.
- Colocate page-specific components next to their `page.tsx`. Only promote to `src/components/` when shared by 2+ routes.
- Route handlers (`app/api/**/route.ts`) validate all inputs with Zod before any DB call.
- Use `next/navigation` (`redirect`, `notFound`, `useRouter`) — never `next/router`.
- Image assets always use `next/image` with explicit `width`/`height` or `fill`.
- Never use `useEffect` to fetch data. Use Server Components, `use()`, or SWR for client-side revalidation.

### Supabase Clients — Three, Never Mixed

| File | Used in | Key |
|------|---------|-----|
| `src/lib/supabase/client.ts` | Client Components, browser | anon |
| `src/lib/supabase/server.ts` | Server Components, Route Handlers, Middleware | anon + cookies |
| `src/lib/supabase/admin.ts` | Server only — game orchestration, scoring | service role |

- `admin.ts` (service role) **never** imported from a Client Component. ESLint rule enforces this.
- `SUPABASE_SERVICE_ROLE_KEY` is never prefixed with `NEXT_PUBLIC_`. If you see it, stop and fix it.

### Security

This project follows OWASP Top 10 mitigations by default. Every rule below is mandatory — not optional hardening.

#### SQL Injection

- **Never interpolate user input into SQL strings.** Supabase's client library uses parameterized queries internally — this is non-negotiable.
- All custom SQL lives in RPC functions inside migrations, never constructed at runtime:
  ```ts
  // NEVER
  supabase.rpc('exec', { sql: `SELECT * FROM phrases WHERE category = '${input}'` })

  // ALWAYS
  supabase.from('phrases').select('*').eq('category', validatedCategory)
  // or a named RPC with typed params:
  supabase.rpc('get_phrases_by_category', { p_category: validatedCategory })
  ```
- Zod validates and narrows all external values before they reach any query. A `string` input must be narrowed to a known union type whenever possible.

#### Cross-Site Scripting (XSS)

- React's JSX escapes all dynamic content by default — **never use `dangerouslySetInnerHTML`**. If lesson content ever needs rich HTML, sanitize it server-side with `DOMPurify` (server build) before storing, and store the sanitized version in the DB, not raw user HTML.
- `username` and `display_name` are rendered as text nodes, never injected as HTML.
- CSP header in `next.config.mjs` blocks inline scripts and restricts `script-src` to `'self'`:
  ```ts
  // next.config.mjs
  const securityHeaders = [
    { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' *.supabase.co wss://*.supabase.co;" },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ];
  ```

#### Cross-Site Request Forgery (CSRF)

- Next.js Route Handlers with `SameSite=Lax` cookies (Supabase default) mitigate CSRF for same-site requests.
- Mutating Route Handlers (`POST`, `PATCH`, `DELETE`) check the `Origin` header and reject requests from unexpected origins:
  ```ts
  const origin = request.headers.get('origin');
  if (origin && origin !== process.env.NEXT_PUBLIC_SITE_URL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  ```

#### Authentication & Session Security

- **Anti-cheat invariant:** `phrase.is_correct` and `points_awarded` are **never sent to the client** during an active round. Only the server (service role) writes these fields.
- Row-Level Security is enabled on every table. The admin client bypasses RLS — only use it in server-side orchestration (scoring, round close, finalization).
- All Route Handlers that mutate state verify the session before proceeding:
  ```ts
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  ```
- Verify `session.user.id` matches the resource being mutated — never trust a user-supplied `user_id` in the request body.
- Auth tokens live in `httpOnly` cookies managed by `@supabase/ssr`. Never store tokens in `localStorage`.
- `SUPABASE_SERVICE_ROLE_KEY` is never prefixed with `NEXT_PUBLIC_`. If you see it, stop and fix it immediately.

#### Input Validation & Injection Prevention

- All external input — request body, search params, route params, Realtime payloads — is validated with Zod before any business logic runs. Unknown fields are stripped with `.strict()` or `.strip()`.
- Enum-like fields (e.g., `answer`, `tense`, `category`) are validated against an explicit Zod `z.enum([...])` — never passed through as raw strings.
- `room_code` path parameter is validated as `/^[A-Z0-9]{6}$/` before any DB lookup. Anything that doesn't match → 400.
- File uploads are not supported. If added in the future: validate MIME type server-side (never trust `Content-Type`), scan with a library, store in Supabase Storage with signed URLs only.

#### Rate Limiting & Abuse Prevention

- Route Handlers that create rooms, submit answers, or authenticate are rate-limited. Use Vercel's Edge Middleware with an in-memory or Upstash Redis counter:
  - `/api/rooms` (POST): max 10 rooms/user/hour
  - `/api/rounds/[id]/answer` (POST): max 1 answer/round/user (enforced by DB `UNIQUE` constraint as the last line of defense)
  - `/api/rooms/[code]/join` (POST): max 20 attempts/IP/minute
- Supabase Auth has built-in rate limiting on signup/login — do not disable it.

#### Sensitive Data Exposure

- No PII beyond `email` and `username` is stored. `display_name` is optional.
- Leaderboard and profile pages show only `username` and `total_points` — never email.
- Error responses never leak DB schema details, stack traces, or internal IDs to the client. Map all errors to generic user-facing strings.
- Logs (Vercel, Supabase) must not contain session tokens, passwords, or answer keys.

#### Dependency Security

- Run `pnpm audit` before every deploy. No known high/critical vulnerabilities ship to production.
- Pin major versions in `package.json`. Review changelogs before upgrading auth-related packages (`@supabase/ssr`, `@supabase/supabase-js`).
- No `eval()`, `new Function()`, or dynamic `require()` anywhere in the codebase.

#### Security Checklist Before Every PR

- [ ] No `dangerouslySetInnerHTML` introduced
- [ ] No raw string interpolation in Supabase queries
- [ ] All new Route Handlers have session check + Zod validation
- [ ] New tables have RLS enabled with explicit policies
- [ ] No secrets in code or committed `.env` files
- [ ] `pnpm audit` passes with no high/critical issues

### Database & Migrations

- Migrations live in `supabase/migrations/` with sequential naming: `0001_init.sql`, `0002_rls.sql`, etc.
- Every new table has RLS enabled and explicit policies. No table is created without them.
- Never run raw SQL in application code. Use Supabase RPC functions for complex queries.
- Scoring logic is **server-only** (`src/lib/scoring.ts`). Formula:
  ```
  if (!is_correct) → points = 0
  ratio = response_time_ms / (duration_seconds * 1000)
  points = round(1000 * (0.5 + 0.5 * max(0, 1 - ratio)))   // 500–1000 pts
  ```

### State Management

- **Zustand** (`src/stores/game-store.ts`) for multiplayer game state only: `lobby | round_active | round_result | finished`, current phrase, countdown, live scoreboard.
- Do not put server-fetched data in Zustand. Server data belongs in Server Components or SWR cache.
- Zustand stores use the `immer` middleware for complex state updates.

### Styling

- Tailwind utility classes only. No custom CSS files unless absolutely unavoidable.
- shadcn/ui primitives as the base layer — never override their internal structure, only wrap them.
- Design tokens: `green-*` = correct, `red-*` = incorrect, `yellow-*/amber-*` = points/achievements.
- Mobile-first. Every layout is tested at 375px before desktop. `sm:` is the desktop breakpoint here.
- `cn()` from `lib/utils.ts` for conditional classes. Never string concatenation.
- Animations respect `prefers-reduced-motion`. The countdown ring has a reduced-motion fallback.

### Forms

- All forms use `react-hook-form` + `@hookform/resolvers/zod`. No uncontrolled inputs.
- Validation schema defined once in a shared file — reused on both client (form) and server (Route Handler).

### Error Handling

- Validate at boundaries: user input, Supabase responses, Realtime events.
- Propagate errors to the nearest Next.js `error.tsx`. Don't swallow with empty `catch {}`.
- Never show raw Supabase/Postgres error messages to the user. Map them to user-friendly strings.
- Route Handlers always return typed JSON: `{ data: T } | { error: string }`.

### Testing Philosophy

- Unit test: pure logic (`scoring.ts`, Zod schemas, utility functions).
- Integration test: Route Handlers with a real Supabase local instance (`supabase start`).
- No mocking the database — past incidents showed mock/prod divergence masks broken migrations.
- E2E (Playwright) for critical flows: auth, room creation/join, answer submission.

---

## Directory Structure

```
BSP/
├─ supabase/
│  ├─ migrations/         # sequential SQL, RLS required per table
│  ├─ functions/          # Edge Functions (round-close timer)
│  └─ seed/               # phrases.ts, lessons.ts — seeded via scripts/seed.ts
├─ scripts/seed.ts        # uses admin client, zod-validated upsert
├─ src/
│  ├─ app/
│  │  ├─ (auth)/          # login, signup — public routes
│  │  ├─ (app)/           # protected routes (middleware enforces session)
│  │  │  ├─ page.tsx                    # home — choose mode
│  │  │  ├─ learn/[tense]/page.tsx      # lesson + theory
│  │  │  ├─ practice/[tense]/page.tsx   # singleplayer session
│  │  │  ├─ room/[code]/page.tsx        # multiplayer lobby
│  │  │  └─ play/[code]/page.tsx        # live game
│  │  └─ api/             # Route Handlers — validate → auth check → service logic → respond
│  ├─ components/
│  │  ├─ ui/              # shadcn primitives only
│  │  └─ game/            # AnswerButton, CountdownRing, Scoreboard, PhraseCard, RoomCodeBadge
│  ├─ lib/
│  │  ├─ supabase/        # client.ts · server.ts · admin.ts
│  │  ├─ scoring.ts       # server-only, pure function
│  │  ├─ rooms.ts
│  │  └─ realtime.ts
│  ├─ stores/
│  │  └─ game-store.ts    # Zustand — multiplayer UI state only
│  ├─ types/
│  │  └─ database.types.ts  # generated — do not edit manually
│  └─ middleware.ts         # session refresh, protect /play /room /profile /leaderboard
```

---

## Implementation Order

Do not skip phases. Each phase is a prerequisite for the next.

| Phase | Scope |
|-------|-------|
| **0 — Setup** | Next.js scaffold, Tailwind, shadcn/ui, Supabase CLI, env vars |
| **1 — UI (Figma-first)** | All screens mocked with static data. Match Figma pixel-perfect before adding logic. |
| **2 — Auth + DB** | Migrations, RLS, profile trigger, three Supabase clients, middleware, auth pages |
| **3 — Data seed** | Phrases (from PDF transcription) + lessons content |
| **4 — Singleplayer** | `/learn` theory pages + `/practice` full flow with session saving |
| **5 — Multiplayer** | Room creation/join, Realtime lobby, game engine, server-side scoring |
| **6 — Profile & Stats** | History, per-tense accuracy, aggregated stats |
| **7 — Leaderboard** | RPC queries, windowed period tabs |
| **8 — Deploy & QA** | Vercel + Supabase prod, RLS audit, rate-limiting, mobile QA |

**Current phase: 0 — Setup / 1 — UI**

---

## Key Risks

1. **Serverless timers** — Vercel API routes can't hold long-lived timers. Use Supabase Edge Function (`supabase/functions/round-close/`) with `pg_cron` to close rounds. For MVP: host-driven is acceptable as a fallback.
2. **Anti-cheat** — `is_correct` and `points_awarded` must never reach the client during an active round. Only the service role writes these.
3. **PDF transcription** — phrase data must be transcribed manually from `logica_frases.pdf`. Budget time for Phase 3.
4. **Type drift** — regenerate `database.types.ts` after every migration or types will lie.

---

## Commands

```bash
pnpm dev              # start dev server
pnpm build            # production build — must pass with 0 errors
pnpm lint             # ESLint — fix before committing
pnpm type-check       # tsc --noEmit
pnpm db:seed          # run scripts/seed.ts
supabase start        # local Supabase instance for tests
supabase db reset     # re-run all migrations + seed locally
```

---

## Commit Rules

- Commits are scoped: `feat(auth):`, `fix(game):`, `chore(db):`, `style(ui):`.
- Do not commit `.env.local` or any file containing secrets.
- `pnpm build` and `pnpm type-check` must pass before every PR.
- PRs that touch DB schema must include the migration file **and** updated `database.types.ts`.
