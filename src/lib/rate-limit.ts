import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
        // Telemetry headers crash `fetch()` in this environment (Node 24 + Next 16):
        // a non-ASCII byte ends up in an outgoing header value. Not needed functionally.
        enableTelemetry: false,
      })
    : null

if (!redis) {
  // eslint-disable-next-line no-console
  console.warn(
    '[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting is DISABLED. ' +
    'Set them before shipping to production.'
  )
}

/** Per-user room creation: max 10 rooms/hour, per CLAUDE.md. */
export const roomCreateLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 h'), prefix: 'rl:rooms:create' })
  : null

/** Per-IP room join attempts: max 20/minute, per CLAUDE.md. */
export const roomJoinLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 m'), prefix: 'rl:rooms:join' })
  : null

/**
 * Per-IP signup attempts: max 5/hour. Prevents automated account-creation spam.
 * Deliberately tighter than room creation — accounts are the higher-value target.
 */
export const signupLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 h'), prefix: 'rl:auth:signup' })
  : null

/**
 * Per-account login attempts: max 10/5min, keyed by username.
 *
 * With a 4-digit PIN there are only 10,000 possibilities per account, so throttling the
 * guesses against a *single account* is what actually stops a brute force. Keying this by IP
 * instead would miss the attack entirely (rotate IPs, keep guessing one account) while
 * punishing legitimate users, since a classroom full of students shares one NAT address.
 */
export const loginLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '5 m'), prefix: 'rl:auth:login' })
  : null

/**
 * Per-IP login attempts: max 100/5min. Deliberately loose — every student on the venue WiFi
 * shares one public IP, so a tight per-IP limit would lock out a whole classroom. This is only
 * here to blunt scripted spraying across many accounts; loginLimiter does the real work.
 */
export const loginIpLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, '5 m'), prefix: 'rl:auth:login:ip' })
  : null

/**
 * Returns a 429 response if the identifier is over its limit, otherwise null.
 *
 * Fails open. Upstash's free tier carries no SLA, and `limiter.limit()` throwing would
 * otherwise surface as a 500 from the route — meaning an Upstash outage would take down login
 * for everyone. During a two-week course, locking out the whole class is a worse outcome than
 * briefly losing the rate limit, so an unreachable limiter lets the request through.
 */
export async function enforceRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<NextResponse | null> {
  if (!limiter) return null

  try {
    const { success } = await limiter.limit(identifier)
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[rate-limit] limiter unavailable, allowing request:', error)
    return null
  }

  return null
}

/** Best-effort client IP from standard proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}
