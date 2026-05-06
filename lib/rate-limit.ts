import { Ratelimit } from '@upstash/ratelimit'
import { redis } from './redis'

// ── AUTH RATE LIMITERS ──────────────────────────────────────────
export const authRegisterLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 m'),
  prefix: 'ratelimit:auth:register',
})

export const authLoginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  prefix: 'ratelimit:auth:login',
})

export const employeeLoginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '15 m'),
  prefix: 'ratelimit:employee:login',
})

// ── API RATE LIMITERS ───────────────────────────────────────────
export const apiGeneralLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  prefix: 'ratelimit:api:general',
})

export const apiWriteLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  prefix: 'ratelimit:api:write',
})

// ── HELPER ──────────────────────────────────────────────────────
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'
  )
}
