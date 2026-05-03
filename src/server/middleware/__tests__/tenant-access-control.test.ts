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

describe('Tenant Access Control', () => {
  function createTestApp(user: (AuthUser & { tenantId?: string }) | null) {
    const app = new Hono()
    if (user) {
      app.use('/*', async (c, next) => {
        c.set('authUser', user)
        await next()
      })
    }
    app.use('/*', tenantIsolationMiddleware)
    app.get('/api/tenants/:tenantId', c => {
      const userTenantId = c.get('tenantId')
      const requestedTenantId = c.req.param('tenantId')
      if (c.get('tenantBypass')) {
        return c.json({ tenantId: requestedTenantId, access: 'admin' })
      }
      if (userTenantId !== requestedTenantId) {
        return c.json({ success: false, error: 'Cross-tenant access denied' }, 403)
      }
      return c.json({ tenantId: requestedTenantId, access: 'granted' })
    })
    return app
  }

  it('should allow access when tenantId matches user tenant', async () => {
    const app = createTestApp(makeAuthUser({ tenantId: 'tenant-abc' }))
    const res = await app.request('/api/tenants/tenant-abc')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { access: string }
    expect(body.access).toBe('granted')
  })

  it('should deny cross-tenant access', async () => {
    const app = createTestApp(makeAuthUser({ tenantId: 'tenant-abc' }))
    const res = await app.request('/api/tenants/tenant-xyz')
    expect(res.status).toBe(403)
    const body = (await res.json()) as { error: string }
    expect(body.error).toContain('Cross-tenant')
  })

  it('should allow super admin to access any tenant', async () => {
    const app = createTestApp(
      makeAuthUser({ id: 'admin-1', role: Role.SUPER_ADMIN, tenantId: 'tenant-abc' })
    )
    const res = await app.request('/api/tenants/tenant-xyz')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { access: string }
    expect(body.access).toBe('admin')
  })

  it('should reject request without user context', async () => {
    const app = createTestApp(null)
    const res = await app.request('/api/tenants/tenant-abc')
    expect(res.status).toBe(403)
  })
})
