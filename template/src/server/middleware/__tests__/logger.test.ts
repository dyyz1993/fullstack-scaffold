import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

const mockLog = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  fatal: vi.fn(),
  child: () => mockLog,
}

vi.mock('@server/utils/logger', () => ({
  createModuleLoggerSync: () => mockLog,
  logger: {
    api: () => mockLog,
    app: () => mockLog,
    db: () => mockLog,
    ws: () => mockLog,
    bootstrap: () => mockLog,
    module: () => mockLog,
  },
}))

import { loggerMiddleware } from '../logger'

describe('loggerMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createApp(options?: Parameters<typeof loggerMiddleware>[0]) {
    const app = new Hono()
    app.use('*', loggerMiddleware(options))
    app.get('/test', c => c.json({ ok: true }))
    app.get('/health', c => c.json({ status: 'ok' }))
    return app
  }

  it('should pass through and return response', async () => {
    const app = createApp()
    const res = await app.request('/test')
    expect(res.status).toBe(200)
    const json = (await res.json()) as { ok: boolean }
    expect(json.ok).toBe(true)
  })

  it('should log request and response for non-excluded paths', async () => {
    const app = createApp()
    await app.request('/test')
    expect(mockLog.info).toHaveBeenCalled()
    const calls = mockLog.info.mock.calls.map(c => c[1])
    expect(calls).toContain('Request started')
    expect(calls).toContain('Request completed')
  })

  it('should skip logging for default excludePaths /health', async () => {
    const app = createApp()
    await app.request('/health')
    expect(mockLog.info).not.toHaveBeenCalled()
  })

  it('should skip request logging when logRequests is false', async () => {
    const app = createApp({ logRequests: false })
    await app.request('/test')
    const calls = mockLog.info.mock.calls.map(c => c[1])
    expect(calls).not.toContain('Request started')
    expect(calls).toContain('Request completed')
  })

  it('should skip response logging when logResponses is false', async () => {
    const app = createApp({ logResponses: false })
    await app.request('/test')
    const calls = mockLog.info.mock.calls.map(c => c[1])
    expect(calls).toContain('Request started')
    expect(calls).not.toContain('Request completed')
  })

  it('should handle custom excludePaths', async () => {
    const app = createApp({ excludePaths: ['/custom', '/health'] })
    app.get('/custom', c => c.json({ ok: true }))
    await app.request('/custom')
    expect(mockLog.info).not.toHaveBeenCalled()
  })

  it('should re-throw errors after logging', async () => {
    const app = new Hono()
    app.use('*', loggerMiddleware())
    app.get('/boom', () => {
      throw new Error('boom')
    })

    const res = await app.request('/boom')
    expect(res.status).toBe(500)
  })

  it('should skip error logging when logErrors is false', async () => {
    const app = createApp({ logErrors: false })
    app.get('/boom', () => {
      throw new Error('boom')
    })
    app.onError((err, c) => c.json({ error: err.message }, 500))

    await app.request('/boom')
    expect(mockLog.error).not.toHaveBeenCalled()
  })

  it('should include duration in response log', async () => {
    const app = createApp()
    await app.request('/test')
    const completedCall = mockLog.info.mock.calls.find(c => c[1] === 'Request completed')
    expect(completedCall).toBeDefined()
    const fields = completedCall![0] as Record<string, unknown>
    expect(fields.duration).toBeDefined()
  })
})
