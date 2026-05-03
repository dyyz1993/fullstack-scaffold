/**
 * @vitest-environment node
 */
/* eslint-disable local-rules/require-type-safe-test-client */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApp } from '../app'

describe('Health Endpoint', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.doUnmock('../db')
  })

  it('should return 200 when database is connected', async () => {
    const app = createApp()
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    const data = (await res.json()) as Record<string, unknown>
    expect(data.status).toBe('ok')
    expect(data.database).toBe('connected')
  })

  it('should return 503 when database is unreachable', async () => {
    vi.doMock('../db', () => ({
      getDb: vi.fn().mockRejectedValue(new Error('Connection refused')),
      getRawClient: vi.fn().mockResolvedValue(null),
      runMigrations: vi.fn(),
      closeDb: vi.fn(),
      getDatabaseConfig: vi.fn().mockReturnValue({}),
    }))

    const { createApp: createMockedApp } = await import('../app')
    const app = createMockedApp()
    const res = await app.request('/health')
    expect(res.status).toBe(503)
    const data = (await res.json()) as Record<string, unknown>
    expect(data.status).toBe('error')
    expect(data.database).toBe('disconnected')

    vi.doUnmock('../db')
  })
})
