import type { MiddlewareHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'

interface RateLimitEntry {
  count: number
  resetTime: number
}

const stores = new Map<string, Map<string, RateLimitEntry>>()

function getStore(key: string): Map<string, RateLimitEntry> {
  let store = stores.get(key)
  if (!store) {
    store = new Map()
    stores.set(key, store)
  }
  return store
}

function cleanup(store: Map<string, RateLimitEntry>, now: number) {
  for (const [k, entry] of store) {
    if (now > entry.resetTime) {
      store.delete(k)
    }
  }
}

function getClientIp(c: { req: { header: (n: string) => string | undefined } }): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'unknown'
  )
}

export interface RateLimitOptions {
  windowMs: number
  maxRequests: number
  key?: string
}

export function rateLimitMiddleware(options: RateLimitOptions): MiddlewareHandler {
  const { windowMs, maxRequests, key = 'default' } = options
  const store = getStore(key)

  return async (c, next) => {
    const now = Date.now()
    const ip = getClientIp(c)

    if (Math.random() < 0.01) {
      cleanup(store, now)
    }

    let entry = store.get(ip)
    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + windowMs }
      store.set(ip, entry)
    }

    entry.count++

    c.header('X-RateLimit-Limit', maxRequests.toString())
    c.header('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count).toString())
    c.header('X-RateLimit-Reset', new Date(entry.resetTime).toISOString())

    if (entry.count > maxRequests) {
      throw new HTTPException(429, {
        message: 'Too many requests, please try again later',
      })
    }

    await next()
  }
}

export function globalRateLimitMiddleware(): MiddlewareHandler {
  return rateLimitMiddleware({ windowMs: 60_000, maxRequests: 100, key: 'global' })
}

export function loginRateLimitMiddleware(): MiddlewareHandler {
  return rateLimitMiddleware({ windowMs: 60_000, maxRequests: 5, key: 'login' })
}

export function apiRateLimitMiddleware(): MiddlewareHandler {
  return rateLimitMiddleware({ windowMs: 60_000, maxRequests: 60, key: 'api' })
}
