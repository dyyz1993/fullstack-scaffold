import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import {
  rateLimitMiddleware,
  strictRateLimitMiddleware,
  mediumRateLimitMiddleware,
  standardRateLimitMiddleware,
} from '../rate-limit'

describe('rateLimitMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createApp(options?: Parameters<typeof rateLimitMiddleware>[0]) {
    const app = new Hono()
    app.use('*', rateLimitMiddleware(options))
    app.get('/test', c => c.json({ ok: true }))
    return app
  }

  it('should pass through in test environment', async () => {
    const app = createApp()
    const res = await app.request('/test')
    expect(res.status).toBe(200)
    const json = (await res.json()) as { ok: boolean }
    expect(json.ok).toBe(true)
  })

  it('should return response with custom options', async () => {
    const app = createApp({ windowMs: 1000, max: 5, message: 'Too many' })
    const res = await app.request('/test')
    expect(res.status).toBe(200)
  })

  it('should export preset middlewares', () => {
    expect(typeof strictRateLimitMiddleware).toBe('function')
    expect(typeof mediumRateLimitMiddleware).toBe('function')
    expect(typeof standardRateLimitMiddleware).toBe('function')
  })

  it('strictRateLimitMiddleware should pass through in test env', async () => {
    const app = new Hono()
    app.use('*', strictRateLimitMiddleware)
    app.get('/test', c => c.json({ ok: true }))
    const res = await app.request('/test')
    expect(res.status).toBe(200)
  })

  it('mediumRateLimitMiddleware should pass through in test env', async () => {
    const app = new Hono()
    app.use('*', mediumRateLimitMiddleware)
    app.get('/test', c => c.json({ ok: true }))
    const res = await app.request('/test')
    expect(res.status).toBe(200)
  })

  it('standardRateLimitMiddleware should pass through in test env', async () => {
    const app = new Hono()
    app.use('*', standardRateLimitMiddleware)
    app.get('/test', c => c.json({ ok: true }))
    const res = await app.request('/test')
    expect(res.status).toBe(200)
  })

  it('should pass through multiple requests in test env', async () => {
    const app = createApp({ windowMs: 1000, max: 1 })
    for (let i = 0; i < 10; i++) {
      const res = await app.request('/test')
      expect(res.status).toBe(200)
    }
  })
})
