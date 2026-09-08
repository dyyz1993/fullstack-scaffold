import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

vi.mock('@server/utils/auth', () => ({
  getAuthUser: vi.fn(),
}))

vi.mock('@server/module-permission/services/audit-log-service', () => ({
  auditLogService: { create: vi.fn().mockResolvedValue({}) },
}))

vi.mock('@server/utils/logger', () => ({
  logger: {
    api: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}))

vi.mock('@shared/constants', () => ({
  PATH_TO_RESOURCE_TYPE: { users: 'user', orders: 'order', todos: 'todo' },
  ACTION_TYPES: { CREATE: 'create', UPDATE: 'update', DELETE: 'delete' },
}))

import { auditLogMiddleware } from '../audit-log'
import { getAuthUser } from '@server/utils/auth'
import { auditLogService } from '@server/module-permission/services/audit-log-service'

describe('auditLogMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createApp() {
    const app = new Hono()
    app.use('*', auditLogMiddleware())
    app.get('/api/users', c => c.json({ ok: true }))
    app.post('/api/users', c => c.json({ ok: true }))
    app.put('/api/users/:id', c => c.json({ ok: true }))
    app.delete('/api/users/:id', c => c.json({ ok: true }))
    app.patch('/api/users/:id', c => c.json({ ok: true }))
    app.get('/health', c => c.json({ status: 'ok' }))
    app.get('/api/permissions/check', c => c.json({ ok: true }))
    return app
  }

  it('should skip non-API paths', async () => {
    vi.mocked(getAuthUser).mockReturnValue({ id: 'user-1' } as never)
    const app = createApp()
    await app.request('/health')
    expect(auditLogService.create).not.toHaveBeenCalled()
  })

  it('should skip GET requests', async () => {
    vi.mocked(getAuthUser).mockReturnValue({ id: 'user-1' } as never)
    const app = createApp()
    await app.request('/api/users')
    expect(auditLogService.create).not.toHaveBeenCalled()
  })

  it('should skip unauthenticated requests', async () => {
    vi.mocked(getAuthUser).mockReturnValue(undefined as never)
    const app = createApp()
    await app.request('/api/users', { method: 'POST' })
    expect(auditLogService.create).not.toHaveBeenCalled()
  })

  it('should skip /api/permissions/ paths', async () => {
    vi.mocked(getAuthUser).mockReturnValue({ id: 'user-1' } as never)
    const app = createApp()
    await app.request('/api/permissions/check')
    expect(auditLogService.create).not.toHaveBeenCalled()
  })

  it('should create audit log for POST with auth', async () => {
    vi.mocked(getAuthUser).mockReturnValue({ id: 'user-1' } as never)
    const app = createApp()
    const res = await app.request('/api/users', { method: 'POST' })
    expect(res.status).toBe(200)
    expect(auditLogService.create).toHaveBeenCalledTimes(1)
    const call = vi.mocked(auditLogService.create).mock.calls[0][0]
    expect(call.userId).toBe('user-1')
    expect(call.action).toBe('create')
    expect(call.resourceType).toBe('user')
  })

  it('should create audit log for PUT with update action', async () => {
    vi.mocked(getAuthUser).mockReturnValue({ id: 'user-1' } as never)
    const app = createApp()
    await app.request('/api/users/123', { method: 'PUT' })
    const call = vi.mocked(auditLogService.create).mock.calls[0][0]
    expect(call.action).toBe('update')
    expect(call.resourceId).toBe('123')
  })

  it('should create audit log for DELETE with delete action', async () => {
    vi.mocked(getAuthUser).mockReturnValue({ id: 'user-1' } as never)
    const app = createApp()
    await app.request('/api/users/456', { method: 'DELETE' })
    const call = vi.mocked(auditLogService.create).mock.calls[0][0]
    expect(call.action).toBe('delete')
    expect(call.resourceId).toBe('456')
  })

  it('should create audit log for PATCH with update action', async () => {
    vi.mocked(getAuthUser).mockReturnValue({ id: 'user-1' } as never)
    const app = createApp()
    await app.request('/api/users/789', { method: 'PATCH' })
    const call = vi.mocked(auditLogService.create).mock.calls[0][0]
    expect(call.action).toBe('update')
  })

  it('should not throw when auditLogService.create fails', async () => {
    vi.mocked(getAuthUser).mockReturnValue({ id: 'user-1' } as never)
    vi.mocked(auditLogService.create).mockRejectedValueOnce(new Error('DB error'))
    const app = createApp()
    const res = await app.request('/api/users', { method: 'POST' })
    expect(res.status).toBe(200)
  })

  it('should capture IP address from headers', async () => {
    vi.mocked(getAuthUser).mockReturnValue({ id: 'user-1' } as never)
    const app = createApp()
    await app.request('/api/users', {
      method: 'POST',
      headers: { 'X-Forwarded-For': '1.2.3.4' },
    })
    const call = vi.mocked(auditLogService.create).mock.calls[0][0]
    expect(call.ipAddress).toBe('1.2.3.4')
  })

  it('should capture user agent from headers', async () => {
    vi.mocked(getAuthUser).mockReturnValue({ id: 'user-1' } as never)
    const app = createApp()
    await app.request('/api/users', {
      method: 'POST',
      headers: { 'User-Agent': 'TestAgent/1.0' },
    })
    const call = vi.mocked(auditLogService.create).mock.calls[0][0]
    expect(call.userAgent).toBe('TestAgent/1.0')
  })
})
