import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import {
  captchaMiddleware,
  verifyCaptchaMiddleware,
  markCaptchaVerifiedMiddleware,
  clearCaptchaSessionMiddleware,
} from '../captcha'

describe('captchaMiddleware', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should skip in test environment', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    const app = new Hono()
    const handler = vi.fn().mockResolvedValue(new Response('ok'))
    app.use('*', captchaMiddleware())
    app.get('/api/test', handler)

    const res = await app.request('/api/test')
    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalled()
  })

  it('should skip configured skip paths', async () => {
    const app = new Hono()
    const handler = vi.fn().mockResolvedValue(new Response('ok'))
    app.use('*', captchaMiddleware())
    app.get('/api/captcha', handler)
    app.post('/api/verify-captcha', handler)
    app.post('/api/admin/login', handler)
    app.post('/api/admin/register', handler)

    let res = await app.request('/api/captcha')
    expect(res.status).toBe(200)

    res = await app.request('/api/verify-captcha', { method: 'POST' })
    expect(res.status).toBe(200)

    res = await app.request('/api/admin/login', { method: 'POST' })
    expect(res.status).toBe(200)

    res = await app.request('/api/admin/register', { method: 'POST' })
    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalledTimes(4)
  })

  it('should skip custom skip paths', async () => {
    const app = new Hono()
    const handler = vi.fn().mockResolvedValue(new Response('ok'))
    app.use('*', captchaMiddleware({ skipPaths: ['/api/custom'] }))
    app.get('/api/custom', handler)

    const res = await app.request('/api/custom')
    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalled()
  })

  it('should allow requests within rate limit', async () => {
    const app = new Hono()
    let callCount = 0
    app.use('*', captchaMiddleware({ maxRequests: 10, windowMs: 60000 }))
    app.get('/api/data', c => {
      callCount++
      return c.json({ ok: true })
    })

    for (let i = 0; i < 5; i++) {
      const res = await app.request('/api/data', {
        headers: { 'User-Agent': 'Mozilla/5.0 Test Browser Normal' },
      })
      expect(res.status).toBe(200)
    }
    expect(callCount).toBe(5)
  })

  it('should block requests exceeding rate limit', async () => {
    const app = new Hono()
    app.use('*', captchaMiddleware({ maxRequests: 3, windowMs: 60000 }))
    app.get('/api/data', c => c.json({ ok: true }))

    const ua = 'Mozilla/5.0 Test Browser For Rate Limit Testing'
    let sessionId = ''
    for (let i = 0; i < 3; i++) {
      const r = await app.request('/api/data', {
        headers: { 'User-Agent': ua, ...(sessionId ? { Cookie: `session_id=${sessionId}` } : {}) },
      })
      const setCookie = r.headers.get('set-cookie')
      if (setCookie) {
        const match = setCookie.match(/session_id=([^;]+)/)
        if (match) sessionId = match[1]
      }
    }

    const res = await app.request('/api/data', {
      headers: { 'User-Agent': ua, Cookie: `session_id=${sessionId}` },
    })
    expect(res.status).toBe(429)
    const body = (await res.json()) as { needCaptcha: boolean; success: boolean }
    expect(body.needCaptcha).toBe(true)
    expect(body.success).toBe(false)
  })

  it('should block suspicious requests with short User-Agent', async () => {
    const app = new Hono()
    app.use('*', captchaMiddleware())
    app.get('/api/data', c => c.json({ ok: true }))

    const res = await app.request('/api/data', {
      headers: { 'User-Agent': 'short' },
    })
    expect(res.status).toBe(403)
    const body = (await res.json()) as { needCaptcha: boolean }
    expect(body.needCaptcha).toBe(true)
  })

  it('should block requests with bot in User-Agent', async () => {
    const app = new Hono()
    app.use('*', captchaMiddleware())
    app.get('/api/data', c => c.json({ ok: true }))

    const res = await app.request('/api/data', {
      headers: { 'User-Agent': 'Some bot crawler tool for testing' },
    })
    expect(res.status).toBe(403)
  })

  it('should block requests with crawler in User-Agent', async () => {
    const app = new Hono()
    app.use('*', captchaMiddleware())
    app.get('/api/data', c => c.json({ ok: true }))

    const res = await app.request('/api/data', {
      headers: { 'User-Agent': 'Google crawler bot for web scraping tests here' },
    })
    expect(res.status).toBe(403)
  })

  it('should block requests with empty User-Agent', async () => {
    const app = new Hono()
    app.use('*', captchaMiddleware())
    app.get('/api/data', c => c.json({ ok: true }))

    const res = await app.request('/api/data')
    expect(res.status).toBe(403)
  })

  it('should reset rate limit after window expires', async () => {
    vi.useFakeTimers()
    const app = new Hono()
    app.use('*', captchaMiddleware({ maxRequests: 2, windowMs: 1000 }))
    app.get('/api/data', c => c.json({ ok: true }))

    const ua = 'Mozilla/5.0 Window Reset Test Browser'
    let sessionId = ''
    for (let i = 0; i < 2; i++) {
      const r = await app.request('/api/data', {
        headers: { 'User-Agent': ua, ...(sessionId ? { Cookie: `session_id=${sessionId}` } : {}) },
      })
      const setCookie = r.headers.get('set-cookie')
      if (setCookie) {
        const match = setCookie.match(/session_id=([^;]+)/)
        if (match) sessionId = match[1]
      }
    }

    const blocked = await app.request('/api/data', {
      headers: { 'User-Agent': ua, Cookie: `session_id=${sessionId}` },
    })
    expect(blocked.status).toBe(429)

    vi.advanceTimersByTime(1001)

    const allowed = await app.request('/api/data', {
      headers: { 'User-Agent': ua, Cookie: `session_id=${sessionId}` },
    })
    expect(allowed.status).toBe(200)

    vi.useRealTimers()
  })

  it('should allow verified session within verification window', async () => {
    vi.useFakeTimers()
    const sessionId = 'verified-session-test'
    markCaptchaVerifiedMiddleware(sessionId)

    const app = new Hono()
    app.use('*', captchaMiddleware({ maxRequests: 1, windowMs: 60000 }))
    app.get('/api/data', c => c.json({ ok: true }))

    const res = await app.request('/api/data', {
      headers: {
        'User-Agent': 'Mozilla/5.0 Verified Session Test',
        Cookie: `session_id=${sessionId}`,
      },
    })
    expect(res.status).toBe(200)

    vi.useRealTimers()
  })
})

describe('verifyCaptchaMiddleware', () => {
  it('should return 400 if no session cookie', async () => {
    const app = new Hono()
    app.use('*', verifyCaptchaMiddleware())
    app.post('/api/verify', c => c.json({ ok: true }))

    const res = await app.request('/api/verify', { method: 'POST' })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('Session not found')
  })

  it('should mark session as verified when session exists', async () => {
    const sessionId = 'verify-test-session'
    markCaptchaVerifiedMiddleware(sessionId)

    const app = new Hono()
    app.use('*', verifyCaptchaMiddleware())
    app.post('/api/verify', c => c.json({ ok: true }))

    const res = await app.request('/api/verify', {
      method: 'POST',
      headers: { Cookie: `session_id=${sessionId}` },
    })
    expect(res.status).toBe(200)
  })
})

describe('markCaptchaVerifiedMiddleware', () => {
  it('should mark session as verified', () => {
    const sessionId = 'test-session-123'
    markCaptchaVerifiedMiddleware(sessionId)
  })

  it('should handle non-existent session gracefully', () => {
    expect(() => markCaptchaVerifiedMiddleware('non-existent')).not.toThrow()
  })
})

describe('clearCaptchaSessionMiddleware', () => {
  it('should clear session', () => {
    const sessionId = 'test-session-clear'
    markCaptchaVerifiedMiddleware(sessionId)
    clearCaptchaSessionMiddleware(sessionId)
  })

  it('should handle non-existent session gracefully', () => {
    expect(() => clearCaptchaSessionMiddleware('non-existent')).not.toThrow()
  })
})
