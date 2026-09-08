import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { corsMiddleware, createCorsMiddleware } from '../cors'

describe('corsMiddleware', () => {
  function createApp(options?: Parameters<typeof corsMiddleware>[0]) {
    const app = new Hono()
    app.use('*', corsMiddleware(options))
    app.get('/test', c => c.json({ ok: true }))
    app.options('/test', c => c.json({ ok: true }))
    return app
  }

  it('should set Access-Control-Allow-Origin header', async () => {
    const app = createApp()
    const res = await app.request('/test', {
      headers: { Origin: 'http://localhost:5173' },
    })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
  })

  it('should set Access-Control-Allow-Credentials to true', async () => {
    const app = createApp()
    const res = await app.request('/test', {
      headers: { Origin: 'http://localhost:5173' },
    })
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  })

  it('should handle OPTIONS preflight request', async () => {
    const app = createApp()
    const res = await app.request('/test', {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:5173' },
    })
    expect(res.status).toBe(204)
  })

  it('should set allowed methods on preflight', async () => {
    const app = createApp()
    const res = await app.request('/test', {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:5173' },
    })
    const allowMethods = res.headers.get('Access-Control-Allow-Methods')
    expect(allowMethods).toBeTruthy()
    expect(allowMethods).toContain('GET')
    expect(allowMethods).toContain('POST')
    expect(allowMethods).toContain('DELETE')
  })

  it('should set allowed headers on preflight', async () => {
    const app = createApp()
    const res = await app.request('/test', {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:5173' },
    })
    const allowHeaders = res.headers.get('Access-Control-Allow-Headers')
    expect(allowHeaders).toBeTruthy()
    expect(allowHeaders).toContain('Content-Type')
    expect(allowHeaders).toContain('Authorization')
  })

  it('should respect custom origin', async () => {
    const app = createApp({ origin: 'https://custom.example.com' })
    const res = await app.request('/test', {
      headers: { Origin: 'https://custom.example.com' },
    })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://custom.example.com')
  })

  it('should pass through and return response', async () => {
    const app = createApp()
    const res = await app.request('/test')
    expect(res.status).toBe(200)
    const json = (await res.json()) as { ok: boolean }
    expect(json.ok).toBe(true)
  })

  it('createCorsMiddleware should return same middleware', () => {
    const mw = createCorsMiddleware({ origin: '*' })
    expect(typeof mw).toBe('function')
  })
})
