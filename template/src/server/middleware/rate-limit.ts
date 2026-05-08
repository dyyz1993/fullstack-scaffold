import type { Context, Next } from 'hono'

type RateLimitEntry = { count: number; resetAt: number }

const rateLimitStore = new Map<string, RateLimitEntry>()

let lastCleanup = Date.now()

function cleanupExpired() {
  const now = Date.now()
  if (now - lastCleanup < 60_000) return
  lastCleanup = now
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key)
    }
  }
}

export type RateLimitOptions = {
  windowMs?: number
  max?: number
  message?: string
}

export function rateLimitMiddleware(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs ?? 60_000
  const max = options.max ?? 100
  const message = options.message ?? 'Too many requests'

  return async (c: Context, next: Next) => {
    if (process.env.NODE_ENV === 'test') {
      return next()
    }

    cleanupExpired()
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      c.req.header('x-real-ip') ||
      'unknown'
    const now = Date.now()
    const entry = rateLimitStore.get(ip)

    if (entry && entry.resetAt > now && entry.count >= max) {
      c.header('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)))
      return c.json({ success: false as const, error: message }, 429)
    }

    if (!entry || entry.resetAt <= now) {
      rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs })
    } else {
      entry.count++
    }

    await next()
  }
}

export const strictRateLimitMiddleware = rateLimitMiddleware({
  windowMs: 15 * 60_000,
  max: 5,
  message: 'Too many attempts, please try again later',
})

export const mediumRateLimitMiddleware = rateLimitMiddleware({
  windowMs: 60_000,
  max: 20,
  message: 'Too many upload requests, please slow down',
})

export const standardRateLimitMiddleware = rateLimitMiddleware({
  windowMs: 60_000,
  max: 100,
})
