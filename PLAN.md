# BSP App — Plan de Implementación

## Context
Aplicación web estilo Duolingo para aprendizaje de español, orientada inicialmente a estudiantes del IESE. Tiene dos modos principales:

1. **Singleplayer** — el usuario practica solo, con ejercicios organizados por tiempos verbales (presente, pasado, futuro, subjuntivo…). Incluye documentación/teoría para que aprendan las reglas antes de practicar.
2. **Multijugador en tiempo real** — los usuarios crean salas con un código, múltiples jugadores se unen y compiten simultáneamente respondiendo si frases son correctas o incorrectas dentro de un temporizador.

Ambos modos comparten el mismo banco de frases. Incluye historial, estadísticas por usuario y leaderboard global. La lógica de evaluación proviene de `logica_frases.pdf` (árbol de decisión, transcripción manual).

**Stack:** Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui → **Supabase** (PostgreSQL + Auth + Realtime) → **Vercel**

---

## 1. Project Setup

> ✅ **Scaffold completado** — Next.js **16.2.9** + Tailwind **v4** + TypeScript strict instalados en `/`.
> ⚠️ Stack real difiere del plan original: **Next.js 16** (no 14) y **Tailwind v4** (no v3, sin `tailwind.config.ts`, configuración CSS-based).

### Pendiente de ejecutar (en orden):

```bash
# 1. shadcn/ui — Tailwind v4 compatible
pnpm dlx shadcn@latest init   # New York style, zinc base, CSS vars

# 2. Componentes shadcn necesarios
pnpm dlx shadcn@latest add button card input label dialog avatar badge progress sonner tabs skeleton dropdown-menu form table separator

# 3. Dependencias de la app
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add zod react-hook-form @hookform/resolvers zustand date-fns lucide-react clsx tailwind-merge

# 4. Supabase CLI (dev dependency)
pnpm add -D supabase

# 5. Supabase local
pnpm dlx supabase init
pnpm dlx supabase login
pnpm dlx supabase link --project-ref <ref>
```

**Variables de entorno** (`.env.local` + Vercel):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # solo server-side, NUNCA en NEXT_PUBLIC
NEXT_PUBLIC_SITE_URL=        # para validación CSRF de Origin header
```

### Auth — Username + 4-digit PIN

El Figma confirma que el login usa **username + PIN de 4 dígitos** (no email/password). Implementación sobre Supabase Auth:
- Email interno generado: `{username}@bsp.app` (invisible al usuario)
- Password = el PIN
- Rate limiting nativo de Supabase Auth activo (no desactivar)
- Tabla `profiles` vinculada a `auth.users` via trigger

---

## 2. Database Schema (`supabase/migrations/0001_init.sql`)

```sql
create type room_status as enum ('waiting','playing','finished');
create type answer_choice as enum ('correct','incorrect');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  total_points int not null default 0,
  games_played int not null default 0,
  games_won int not null default 0,
  created_at timestamptz not null default now()
);

create table phrases (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  is_correct boolean not null,
  explanation text not null,
  category text not null,
  difficulty smallint not null default 1 check (difficulty between 1 and 3),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table game_rooms (
  id uuid primary key default gen_random_uuid(),
  room_code char(6) unique not null,
  host_id uuid not null references profiles(id),
  status room_status not null default 'waiting',
  max_players int not null default 20,
  rounds_total int not null default 10,
  round_duration_seconds int not null default 15,
  current_round int not null default 0,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create table game_players (
  room_id uuid not null references game_rooms(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  score int not null default 0,
  rank int,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references game_rooms(id) on delete cascade,
  phrase_id uuid not null references phrases(id),
  round_number int not null,
  started_at timestamptz not null default now(),
  duration_seconds int not null,
  unique (room_id, round_number)
);

create table round_answers (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  answer answer_choice not null,
  is_correct boolean not null,
  response_time_ms int not null,
  points_awarded int not null default 0,
  created_at timestamptz not null default now(),
  unique (round_id, user_id)
);

create table game_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  game_room_id uuid not null references game_rooms(id) on delete cascade,
  final_score int not null,
  final_rank int not null,
  total_players int not null,
  played_at timestamptz not null default now(),
  unique (user_id, game_room_id)
);
```

**RLS** (`0002_rls.sql`): `profiles` select público autenticado, update solo propio. `phrases` select solo. `game_rooms/players` select si participas. `round_answers` insert solo propio; **lectura de respuestas ajenas bloqueada hasta cierre de ronda** (via RPC `security definer`). `points_awarded` e `is_correct` se escriben **solo desde el servidor** (service role).

---

## 3. Autenticación

- **Supabase Auth directo** — sin NextAuth.
- Métodos: email+password; magic link / OAuth Google opcional para escalar.
- Tres clientes Supabase:
  - `src/lib/supabase/client.ts` — browser, anon key
  - `src/lib/supabase/server.ts` — server components / route handlers, cookies
  - `src/lib/supabase/admin.ts` — service role, solo server, para orquestación de juego
- `src/middleware.ts` — refresca sesión, protege rutas `/play`, `/room/*`, `/profile`, `/leaderboard`.
- **Trigger de perfil** (`0003_profile_trigger.sql`): crea fila en `profiles` automáticamente al registrarse.
- Restricción opcional a dominio IESE: flag de config para habilitar/deshabilitar.

---

## 4. Seed de Frases

El PDF no es machine-readable → transcripción manual al archivo:

- `supabase/seed/phrases.ts` — array de `{ text, is_correct, explanation, category, difficulty, tense }`. Categorías desde ramas del árbol: `concordancia_genero`, `concordancia_numero`, `tiempo_verbal`, `ser_vs_estar`, `preposiciones`, `semantica`. Campo `tense` para filtrado singleplayer: `presente`, `preterito_indefinido`, `preterito_imperfecto`, `preterito_perfecto`, `futuro_simple`, `condicional`, `subjuntivo_presente`, `subjuntivo_pasado`, etc.
- `scripts/seed.ts` — usa cliente service-role, upsert idempotente, validación con zod.
- `pnpm db:seed` script en package.json.

---

## 5. Modo Singleplayer

Dos subsecciones dentro de la app:

### 5a. Documentación / Aprendizaje (`/learn`)
- Sección de referencia teórica organizada por tiempo verbal.
- Cada tiempo verbal tiene su propia página: explicación de la formación, usos principales, ejemplos correctos e incorrectos (los mismos del banco de frases), y un enlace directo a practicar ese tiempo.
- Contenido almacenado en Supabase tabla `lessons`:
  ```sql
  create table lessons (
    id uuid primary key default gen_random_uuid(),
    tense text unique not null,        -- mismo valor que phrases.tense
    title text not null,
    description text not null,         -- explicación del tiempo verbal
    formation_rules jsonb not null,    -- conjugación por persona
    common_errors text[],              -- errores típicos
    sort_order int not null,
    active boolean not null default true
  );
  ```
- Ruta: `/learn` (índice de tiempos) → `/learn/[tense]` (lección + botón "Practicar").
- Puede enriquecerse con ejemplos de frases del banco (join `phrases` por `tense`).

### 5b. Práctica Singleplayer (`/practice`)
- El usuario elige un tiempo verbal (o "todos") y una dificultad.
- El juego presenta frases una por una; el usuario decide "Correcto" / "Incorrecto".
- Sin competición, sin presión: puede haber timer opcional o modo libre.
- Feedback inmediato tras cada respuesta: si acertó, la explicación de la regla (`phrase.explanation`).
- Al terminar: resumen con % de acierto, frases falladas con su explicación.
- Progreso guardado en `solo_sessions`:
  ```sql
  create table solo_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references profiles(id) on delete cascade,
    tense text,                        -- null = todos
    total_phrases int not null,
    correct int not null,
    finished_at timestamptz not null default now()
  );
  ```
- Stats de singleplayer se reflejan en el perfil del usuario (% acierto por tiempo verbal).

---

## 6. Sistema de Salas Multijugador (Lobby)

- `POST /api/rooms` — crea sala, genera código 6 chars, inserta host en `game_players`.
- `POST /api/rooms/[code]/join` — valida status `waiting` y capacidad, inserta membresía.
- `/room/[code]` — server component + cliente con Realtime Postgres-changes en `game_players` y `game_rooms`. Host ve botón "Start" (activo con ≥2 jugadores). Todos navegan a `/play/[code]` cuando status cambia a `playing`.
- Host puede elegir filtrar la partida por tiempo verbal (igual que singleplayer).

---

## 7. Motor de Juego en Tiempo Real

**Canal Realtime:** `room:{room_id}` — broadcast events del servidor + Postgres-changes para scores.

**Orquestación server-authoritative (recomendada):**

1. `POST /api/rooms/[id]/start` — setea status `playing`, inserta primera `rounds` con `starts_at` + `ends_at`, broadcast `round_start` ({ round_number, phrase_id, **text** }) — ⚠️ **nunca enviar `is_correct` al cliente**.
2. Clientes cuentan regresiva hasta `ends_at` (timestamp absoluto del servidor → todos sincronizados). Envían respuesta a `POST /api/rounds/[id]/answer` con `{ answer }`.
3. Servidor calcula `response_time_ms`, resuelve `is_correct`, calcula puntos, escribe `round_answers`, actualiza `game_players.score`.
4. **Cierre de ronda:** Supabase Edge Function (`supabase/functions/round-close/`) programada en `ends_at`. Broadcast `round_result` con resultado + scoreboard actualizado. Si hay más rondas: avanza. Si no: finaliza.
5. **Finalizar:** calcula ranks, setea status `finished`, escribe `game_history`, incrementa stats en `profiles`. Broadcast `game_over`.

**Estado cliente:** Zustand store (`src/stores/game-store.ts`) con fases: `lobby | round_active | round_result | finished`, frase actual, countdown, scoreboard en vivo.

> ⚠️ **Riesgo principal:** funciones serverless en Vercel no pueden mantener timers long-lived. La Edge Function de Supabase o `pg_cron` resuelve esto. Para MVP se puede usar Option A (host-driven) y migrar luego.

---

## 8. Scoring (solo server-side — `src/lib/scoring.ts`)

```
if (!is_correct) → points = 0
else:
  ratio = response_time_ms / (duration_seconds * 1000)
  speed_factor = max(0, 1 - ratio)
  points = round(1000 * (0.5 + 0.5 * speed_factor))   // 500–1000 pts por respuesta correcta
```

Correcta pero lenta = 500 pts mínimo. Correcta e instantánea = 1000 pts. Configurable en `lib/scoring.ts`.

---

## 9. Historial & Stats

- `/profile` y `/profile/[username]` — server components, datos de `profiles` + `game_history` + `solo_sessions`.
- Stats multijugador: total partidas, victorias, win rate, score promedio, mejor rank.
- Stats singleplayer: % acierto global y **desglosado por tiempo verbal** (útil para saber qué tiempos le cuestan más al usuario).
- Vista SQL `user_stats` (security definer) para agregados rápidos.
- Lista de partidas recientes: paginada, tabla en desktop / cards en mobile.

---

## 10. Leaderboard

- `/leaderboard` con tabs: Todo el tiempo / Este mes / Esta semana.
- All-time: `profiles.total_points desc` (denormalizado → O(log n)).
- Windowed: RPC `leaderboard(period, limit, offset)` con `security definer`.
- Para escala: materialized view + `pg_cron`.

---

## 11. UI/UX

- Duolingo-inspired: rounded cards, tipografía bold, paleta saturada (verde = correcto, rojo = incorrecto, dorado = puntos).
- Mobile-first: botones grandes, timer visual (SVG ring o progress bar), scoreboard compacto.
- shadcn/ui como base primitiva; componentes del juego: `AnswerButton`, `CountdownRing`, `Scoreboard`, `PhraseCard`, `RoomCodeBadge`.
- Sonner para toasts. Reduced-motion fallback para animaciones del timer.
- Figma BSP App como referencia visual cuando esté accesible.

---

## 12. Fases de Implementación

El orden acordado es: **instalar dependencias → montar el diseño Figma → lógica**.

| Fase | Contenido | Depende de |
|------|-----------|-----------|
| **0 — Setup** | Scaffold Next.js + pnpm, Tailwind, shadcn/ui, Supabase CLI, env vars, estructura de carpetas | — |
| **1 — Diseño UI (Figma)** | Implementar todas las pantallas del diseño Figma: home, /learn, /practice, lobby, live game, perfil, leaderboard. Solo maquetación con datos mockeados (sin lógica real). Verificar en Figma MCP para cada pantalla. | 0 |
| **2 — Auth + DB** | Migraciones + RLS + trigger de perfil; tres clientes Supabase; middleware; páginas login/signup funcionales | 1 |
| **3 — Datos: frases + lecciones** | Seed de frases (transcripción PDF, campo `tense`) + contenido de lecciones por tiempo verbal | 2 |
| **4 — Singleplayer** | `/learn` con teoría real; `/practice` con flujo completo, feedback por frase, sesión guardada | 3 |
| **5 — Multijugador** | Crear/unirse a sala, lobby Realtime, motor de juego, scoring server-side, historial | 3 |
| **6 — Perfil & Stats** | Historial solo + multi, stats por tiempo verbal en perfil | 4, 5 |
| **7 — Leaderboard** | RPCs all-time + windowed, UI | 5 |
| **8 — Deploy & QA** | Deploy Vercel + Supabase prod, auditoría RLS, rate-limiting, mobile QA | todos |

---

## 13. Estructura de Carpetas

```
BSP/
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/
│  │  ├─ 0001_init.sql
│  │  ├─ 0002_rls.sql
│  │  ├─ 0003_profile_trigger.sql
│  │  └─ 0004_views_rpcs.sql
│  ├─ functions/round-close/index.ts
│  ├─ seed/phrases.ts
│  └─ seed/lessons.ts
├─ scripts/seed.ts
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login/page.tsx
│  │  ├─ (auth)/signup/page.tsx
│  │  ├─ (app)/page.tsx                    # home: elegir modo
│  │  ├─ (app)/learn/page.tsx              # índice de tiempos verbales
│  │  ├─ (app)/learn/[tense]/page.tsx      # lección + teoría + ejemplos
│  │  ├─ (app)/practice/page.tsx           # selección tiempo / dificultad
│  │  ├─ (app)/practice/[tense]/page.tsx   # sesión singleplayer
│  │  ├─ (app)/room/[code]/page.tsx        # lobby multijugador
│  │  ├─ (app)/play/[code]/page.tsx        # live game
│  │  ├─ (app)/profile/page.tsx
│  │  ├─ (app)/profile/[username]/page.tsx
│  │  ├─ (app)/leaderboard/page.tsx
│  │  └─ api/
│  │     ├─ rooms/route.ts
│  │     ├─ rooms/[id]/start/route.ts
│  │     ├─ rooms/[code]/join/route.ts
│  │     ├─ rounds/[id]/answer/route.ts
│  │     └─ practice/sessions/route.ts     # crear/terminar sesión solo
│  ├─ components/
│  │  ├─ ui/                               # shadcn primitives
│  │  └─ game/                             # AnswerButton, CountdownRing, Scoreboard, PhraseCard
│  ├─ lib/
│  │  ├─ supabase/{client,server,admin}.ts
│  │  ├─ scoring.ts
│  │  ├─ rooms.ts
│  │  └─ realtime.ts
│  ├─ stores/game-store.ts
│  ├─ types/database.types.ts              # generado: supabase gen types
│  └─ middleware.ts
├─ .env.example
└─ next.config.mjs
```

Generar tipos tras cada migración:
```bash
pnpm dlx supabase gen types typescript --linked > src/types/database.types.ts
```

---

## Riesgos Clave

1. **Timers en serverless** — Next.js API routes en Vercel no mantienen estado. Resolver con Supabase Edge Function + `pg_cron`. Para MVP: host-driven (Option A) es aceptable.
2. **Anti-cheat** — `phrase.is_correct` y `points_awarded` nunca llegan al cliente mid-round. Solo service role escribe estos campos.
3. **Transcripción del PDF** — requiere trabajo manual; el árbol de decisión tiene múltiples ramas. Planificar tiempo en la Fase 2.
4. **Escalado IESE → público** — restricción de dominio IESE como flag de config. Supabase escala con pgBouncer + read replicas sin cambiar código.
