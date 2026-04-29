import type { MiddlewareHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { MemoryRateLimitStore, type RateLimitStore } from './rate-limit-store'

const stores = new Map<string, RateLimitStore>()

function getStore(key: string): RateLimitStore {
  let store = stores.get(key)
  if (!store) {
    store = new MemoryRateLimitStore()
    stores.set(key, store)
  }
  return store
}

export function setRateLimitStore(key: string, newStore: RateLimitStore) {
  stores.set(key, newStore)
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
  const windowSeconds = Math.ceil(windowMs / 1000)

  return async (c, next) => {
    const ip = getClientIp(c)
    const count = await store.increment(`${key}:${ip}`, windowSeconds)

    c.header('X-RateLimit-Limit', maxRequests.toString())
    c.header('X-RateLimit-Remaining', Math.max(0, maxRequests - count).toString())

    if (count > maxRequests) {
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
