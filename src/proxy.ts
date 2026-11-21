import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_ROUTES = [
  '/play',
  '/leaderboard',
  '/learn',
  '/profile',
  '/escribiendo',
  '/practice',
  '/room',
  '/join',
  '/admin',
]

// Public landing, served at "/" through a rewrite for signed-out visitors.
const LANDING_ROUTE = '/welcome'

// Layout/preview-only routes: useful while building screens, never reachable in production.
const DEV_ONLY_ROUTES = ['/dev-scoreboard', '/preview']

export async function proxy(request: NextRequest) {
  // Checked before anything else so these routes never exist on the public domain,
  // regardless of session state. They stay available with `pnpm dev`.
  if (
    process.env.NODE_ENV === 'production' &&
    DEV_ONLY_ROUTES.some((route) => request.nextUrl.pathname.startsWith(route))
  ) {
    return new NextResponse('Not Found', { status: 404 })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route))

  // The landing page only lives at "/". Hitting /welcome directly would publish a duplicate
  // of it, so send it home (the landing for visitors, the app for signed-in users).
  if (pathname === LANDING_ROUTE) {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = '/'
    return NextResponse.redirect(homeUrl, 308)
  }

  // "/" is the app home for signed-in users and the public landing for everyone else. A rewrite,
  // not a redirect, so crawlers get a 200 with real content at the root URL instead of a hop to
  // /login (which left Google with nothing to index).
  if (pathname === '/' && !user) {
    const landingUrl = request.nextUrl.clone()
    landingUrl.pathname = LANDING_ROUTE
    const rewrite = NextResponse.rewrite(landingUrl, { request })
    supabaseResponse.cookies.getAll().forEach((cookie) => rewrite.cookies.set(cookie))
    return rewrite
  }

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = '/'
    return NextResponse.redirect(homeUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
