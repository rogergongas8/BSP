# BSP · Aprende español jugando

Aplicación web estilo Duolingo para aprender español. Combina lecciones de teoría, práctica por tiempos verbales y salas multijugador.

**En producción:** [miaustico.com](https://miaustico.com)

## Qué incluye

- **Modo individual**
  - `Escribiendo…`: práctica escrita a tu ritmo.
  - `Lío de tiempos`: ejercicios para distinguir tiempos verbales (pretérito perfecto, indefinido, imperfecto…).
- **Lecciones de teoría** con ejemplos por cada tiempo verbal.
- **Modo multijugador**: salas con código, varios jugadores a la vez y marcador en directo.
- **Perfil** con estadísticas por usuario.
- **Acceso sencillo**: usuario y PIN de 4 dígitos, sin correo ni contraseña.

## Tecnologías

| Área | Herramientas |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Lenguaje | TypeScript (modo estricto) |
| Estilos | Tailwind CSS v4, shadcn/ui |
| Backend y datos | Supabase (PostgreSQL, Auth, Realtime) |
| Estado | Zustand |
| Validación | Zod |
| Despliegue | Vercel |

## Puesta en marcha

Necesitas Node.js y [pnpm](https://pnpm.io).

```bash
git clone https://github.com/rogergongas8/BSP.git
cd BSP
pnpm install
cp .env.example .env.local   # rellena tus claves de Supabase
pnpm dev                     # http://localhost:3000
```

Variables de entorno principales (ver `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (solo en servidor, nunca en el navegador)
- `NEXT_PUBLIC_SITE_URL`

La base de datos se define en `supabase/migrations/`. Para cargar las frases de ejercicios:

```bash
pnpm db:seed-all
```

## Scripts útiles

```bash
pnpm lint          # análisis estático
pnpm type-check    # comprobación de tipos
pnpm build         # compilación de producción
```

## Estructura

```
src/app/        rutas (inicio, aprender, practicar, salas, perfil, acceso)
supabase/       migraciones de la base de datos
scripts/        carga de datos y pruebas de carga
docs/           contenido de las lecciones
```

## Estado

Proyecto en desarrollo activo.
