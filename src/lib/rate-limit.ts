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
 * Per-IP login attempts: max 10/5min. The username+4-digit-PIN scheme has only 10,000
 * possible PINs per account, so this is the primary defense against brute force beyond
 * whatever Supabase Auth's own project-level rate limit provides.
 */
export const loginLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '5 m'), prefix: 'rl:auth:login' })
  : null

/** Returns a 429 response if the identifier is over its limit, otherwise null. */
export async function enforceRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<NextResponse | null> {
  if (!limiter) return null
  const { success } = await limiter.limit(identifier)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  return null
}

/** Best-effort client IP from standard proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}
