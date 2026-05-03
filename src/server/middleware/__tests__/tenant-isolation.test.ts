/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { tenantIsolationMiddleware } from '../tenant-isolation'
import type { AuthUser } from '../auth'
import { Role } from '@platform/shared/permission'

function makeAuthUser(
  overrides: Partial<AuthUser> & { tenantId?: string }
): AuthUser & { tenantId?: string } {
  return {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    role: Role.USER,
    permissions: [],
    ...overrides,
  }
}

describe('tenantIsolationMiddleware', () => {
  it('should set tenantId in context from authUser claims', async () => {
    const app = new Hono()
    app.use('/*', async (c, next) => {
      c.set('authUser', makeAuthUser({ tenantId: 'tenant-abc' }))
      await next()
    })
    app.use('/*', tenantIsolationMiddleware)
    app.get('/test', c => c.json({ tenantId: c.get('tenantId') }))

    const res = await app.request('/test')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { tenantId: string }
    expect(body.tenantId).toBe('tenant-abc')
  })

  it('should reject request without authUser context', async () => {
    const app = new Hono()
    app.use('/*', tenantIsolationMiddleware)
    app.get('/test', c => c.json({ ok: true }))

    const res = await app.request('/test')
    expect(res.status).toBe(403)
  })

  it('should reject request with empty tenantId', async () => {
    const app = new Hono()
    app.use('/*', async (c, next) => {
      c.set('authUser', makeAuthUser({ tenantId: '' }))
      await next()
    })
    app.use('/*', tenantIsolationMiddleware)
    app.get('/test', c => c.json({ ok: true }))

    const res = await app.request('/test')
    expect(res.status).toBe(403)
  })

  it('should reject request with undefined tenantId', async () => {
    const app = new Hono()
    app.use('/*', async (c, next) => {
      c.set('authUser', makeAuthUser({}))
      await next()
    })
    app.use('/*', tenantIsolationMiddleware)
    app.get('/test', c => c.json({ ok: true }))

    const res = await app.request('/test')
    expect(res.status).toBe(403)
  })

  it('should allow super admin to bypass tenant isolation', async () => {
    const app = new Hono()
    app.use('/*', async (c, next) => {
      c.set(
        'authUser',
        makeAuthUser({ id: 'super-admin-1', role: Role.SUPER_ADMIN, tenantId: 'tenant-abc' })
      )
      await next()
    })
    app.use('/*', tenantIsolationMiddleware)
    app.get('/test', c => c.json({ tenantId: c.get('tenantId'), bypassed: c.get('tenantBypass') }))

    const res = await app.request('/test')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { tenantId: string; bypassed: boolean }
    expect(body.bypassed).toBe(true)
    expect(body.tenantId).toBe('tenant-abc')
  })

  it('should allow super admin even without tenantId', async () => {
    const app = new Hono()
    app.use('/*', async (c, next) => {
      c.set('authUser', makeAuthUser({ id: 'super-admin-1', role: Role.SUPER_ADMIN }))
      await next()
    })
    app.use('/*', tenantIsolationMiddleware)
    app.get('/test', c => c.json({ tenantId: c.get('tenantId'), bypassed: c.get('tenantBypass') }))

    const res = await app.request('/test')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { tenantId: string; bypassed: boolean }
    expect(body.bypassed).toBe(true)
    expect(body.tenantId).toBe('global')
  })
})
