import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

vi.mock('@server/core', () => ({
  setRealtimeEnv: vi.fn(),
}))

import { realtimeEnvMiddleware } from '../realtime-env'
import { setRealtimeEnv } from '@server/core'

describe('realtimeEnvMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call setRealtimeEnv with env when REALTIME_DO exists', async () => {
    const app = new Hono()
    app.use('*', realtimeEnvMiddleware())
    app.get('/test', c => c.json({ ok: true }))

    const realtimeDo = { idFromName: vi.fn(), get: vi.fn() }
    const res = await app.request('/test', {}, { REALTIME_DO: realtimeDo } as never)
    expect(res.status).toBe(200)
    expect(setRealtimeEnv).toHaveBeenCalledWith({ REALTIME_DO: realtimeDo })
  })

  it('should not call setRealtimeEnv when no env is present', async () => {
    const app = new Hono()
    app.use('*', realtimeEnvMiddleware())
    app.get('/test', c => c.json({ ok: true }))

    const res = await app.request('/test')
    expect(res.status).toBe(200)
    expect(setRealtimeEnv).not.toHaveBeenCalled()
  })

  it('should call setRealtimeEnv even when env has no REALTIME_DO', async () => {
    const app = new Hono()
    app.use('*', realtimeEnvMiddleware())
    app.get('/test', c => c.json({ ok: true }))

    const res = await app.request('/test', {}, {} as never)
    expect(res.status).toBe(200)
    expect(setRealtimeEnv).toHaveBeenCalledWith({})
  })

  it('should pass through to next handler', async () => {
    const app = new Hono()
    app.use('*', realtimeEnvMiddleware())
    app.get('/test', c => c.json({ ok: true }))

    const res = await app.request('/test')
    const json = (await res.json()) as { ok: boolean }
    expect(json.ok).toBe(true)
  })
})
