import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { AppError } from '@server/utils/app-error'

vi.mock('@server/db', () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  }),
}))

vi.mock('@server/db/schema', () => ({
  tenants: { slug: 'slug' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col, val) => val),
}))

vi.mock('@server/utils/logger', () => ({
  createModuleLoggerSync: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

import { tenantIsolationMiddleware } from '../tenant-isolation'
import { getDb } from '@server/db'

describe('tenantIsolationMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function mockDbResult(rows: unknown[]) {
    vi.mocked(getDb).mockResolvedValueOnce({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(rows),
    } as never)
  }

  function createApp() {
    const app = new Hono()
    app.onError((err, c) => {
      if (AppError.isAppError(err)) {
        return c.json({ success: false, error: err.message }, err.statusCode as 400)
      }
      return c.json({ success: false, error: 'Internal error' }, 500)
    })
    app.use('*', tenantIsolationMiddleware())
    app.get('/api/test', c => {
      const tenant = c.get('tenant')
      return c.json({ ok: true, tenantId: tenant.id, tenantSlug: tenant.slug })
    })
    return app
  }

  it('should return error when no tenant header or subdomain', async () => {
    const app = createApp()
    const res = await app.request('/api/test')
    expect(res.status).toBe(404)
  })

  it('should return error when tenant header is empty string', async () => {
    const app = createApp()
    const res = await app.request('/api/test', {
      headers: { 'X-Tenant-Slug': '' },
    })
    expect(res.status).toBe(404)
  })

  it('should pass with valid tenant from header', async () => {
    mockDbResult([
      { id: 1, slug: 'test-tenant', name: 'Test', status: 'active', plan: 'free', maxUsers: 10, settings: null },
    ])
    const app = createApp()
    const res = await app.request('/api/test', {
      headers: { 'X-Tenant-Slug': 'test-tenant' },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { ok: boolean; tenantId: number; tenantSlug: string }
    expect(json.ok).toBe(true)
    expect(json.tenantId).toBe(1)
    expect(json.tenantSlug).toBe('test-tenant')
  })

  it('should return 404 for non-existent tenant', async () => {
    mockDbResult([])
    const app = createApp()
    const res = await app.request('/api/test', {
      headers: { 'X-Tenant-Slug': 'nonexistent' },
    })
    expect(res.status).toBe(404)
  })

  it('should extract tenant from subdomain when no header', async () => {
    mockDbResult([
      { id: 2, slug: 'acme', name: 'Acme', status: 'active', plan: 'pro', maxUsers: 100, settings: null },
    ])
    const app = createApp()
    const res = await app.request('/api/test', {
      headers: { Host: 'acme.example.com' },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { tenantSlug: string }
    expect(json.tenantSlug).toBe('acme')
  })

  it('should prefer X-Tenant-Slug header over subdomain', async () => {
    mockDbResult([
      { id: 3, slug: 'header-tenant', name: 'Header', status: 'active', plan: 'free', maxUsers: 5, settings: null },
    ])
    const app = createApp()
    const res = await app.request('/api/test', {
      headers: { Host: 'subdomain.example.com', 'X-Tenant-Slug': 'header-tenant' },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { tenantSlug: string }
    expect(json.tenantSlug).toBe('header-tenant')
  })

  it('should parse tenant settings JSON', async () => {
    mockDbResult([
      { id: 4, slug: 'with-settings', name: 'Settings', status: 'active', plan: 'pro', maxUsers: 50, settings: '{"theme":"dark"}' },
    ])
    const app = createApp()
    const res = await app.request('/api/test', {
      headers: { 'X-Tenant-Slug': 'with-settings' },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { tenantId: number }
    expect(json.tenantId).toBe(4)
  })

  it('should handle null settings gracefully', async () => {
    mockDbResult([
      { id: 5, slug: 'no-settings', name: 'NoSettings', status: 'active', plan: 'free', maxUsers: 5, settings: null },
    ])
    const app = createApp()
    const res = await app.request('/api/test', {
      headers: { 'X-Tenant-Slug': 'no-settings' },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { tenantId: number }
    expect(json.tenantId).toBe(5)
  })
})
