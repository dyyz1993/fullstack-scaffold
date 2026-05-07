import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { permissionMiddleware } from '../permission'

vi.mock('@server/utils/auth', () => ({
  getAuthUser: vi.fn(),
}))

vi.mock('@server/module-permission/services/permission-service-impl', () => ({
  permissionService: {
    hasPermission: vi.fn(),
  },
}))

vi.mock('@server/module-permission/services/role-service', () => ({
  roleService: {
    getUserRoles: vi.fn(),
  },
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

import { getAuthUser } from '@server/utils/auth'
import { permissionService } from '@server/module-permission/services/permission-service-impl'
import { roleService } from '@server/module-permission/services/role-service'

const mockGetAuthUser = vi.mocked(getAuthUser)
const mockHasPermission = vi.mocked(permissionService.hasPermission)
const mockGetUserRoles = vi.mocked(roleService.getUserRoles)

describe('permissionMiddleware', () => {
  let app: Hono

  beforeEach(() => {
    vi.clearAllMocks()
    app = new Hono()
    app.use('*', permissionMiddleware())
    app.get('/api/admin/users', (c) => c.json({ success: true }))
    app.post('/api/admin/users', (c) => c.json({ success: true }))
    app.put('/api/admin/users/:id', (c) => c.json({ success: true }))
    app.delete('/api/admin/users/:id', (c) => c.json({ success: true }))
    app.get('/api/content', (c) => c.json({ success: true }))
    app.post('/api/content', (c) => c.json({ success: true }))
    app.put('/api/content/:id', (c) => c.json({ success: true }))
    app.delete('/api/content/:id', (c) => c.json({ success: true }))
    app.get('/api/admin/settings', (c) => c.json({ success: true }))
    app.put('/api/admin/settings', (c) => c.json({ success: true }))
    app.get('/api/admin/logs', (c) => c.json({ success: true }))
    app.post('/api/admin/login', (c) => c.json({ success: true }))
    app.post('/api/admin/register', (c) => c.json({ success: true }))
    app.get('/api/permissions', (c) => c.json({ success: true }))
    app.get('/api/permissions/roles', (c) => c.json({ success: true }))
    app.get('/api/permissions/categories', (c) => c.json({ success: true }))
    app.get('/api/permissions/role-labels', (c) => c.json({ success: true }))
    app.get('/api/permissions/permission-labels', (c) => c.json({ success: true }))
    app.get('/api/permissions/menu-config', (c) => c.json({ success: true }))
    app.get('/api/permissions/page-permissions', (c) => c.json({ success: true }))
  })

  describe('public routes', () => {
    it('should allow POST /api/admin/login without auth', async () => {
      mockGetAuthUser.mockReturnValue(undefined as never)
      const res = await app.request('/api/admin/login', { method: 'POST' })
      expect(res.status).toBe(200)
    })

    it('should allow POST /api/admin/register without auth', async () => {
      mockGetAuthUser.mockReturnValue(undefined as never)
      const res = await app.request('/api/admin/register', { method: 'POST' })
      expect(res.status).toBe(200)
    })

    it('should allow GET /api/permissions without auth', async () => {
      mockGetAuthUser.mockReturnValue(undefined as never)
      const res = await app.request('/api/permissions')
      expect(res.status).toBe(200)
    })

    it('should allow GET /api/permissions/roles without auth', async () => {
      mockGetAuthUser.mockReturnValue(undefined as never)
      const res = await app.request('/api/permissions/roles')
      expect(res.status).toBe(200)
    })

    it('should allow GET /api/permissions/categories without auth', async () => {
      mockGetAuthUser.mockReturnValue(undefined as never)
      const res = await app.request('/api/permissions/categories')
      expect(res.status).toBe(200)
    })

    it('should allow GET /api/permissions/role-labels without auth', async () => {
      mockGetAuthUser.mockReturnValue(undefined as never)
      const res = await app.request('/api/permissions/role-labels')
      expect(res.status).toBe(200)
    })

    it('should allow GET /api/permissions/permission-labels without auth', async () => {
      mockGetAuthUser.mockReturnValue(undefined as never)
      const res = await app.request('/api/permissions/permission-labels')
      expect(res.status).toBe(200)
    })

    it('should allow GET /api/permissions/menu-config without auth', async () => {
      mockGetAuthUser.mockReturnValue(undefined as never)
      const res = await app.request('/api/permissions/menu-config')
      expect(res.status).toBe(200)
    })

    it('should allow GET /api/permissions/page-permissions without auth', async () => {
      mockGetAuthUser.mockReturnValue(undefined as never)
      const res = await app.request('/api/permissions/page-permissions')
      expect(res.status).toBe(200)
    })
  })

  describe('unmatched routes', () => {
    it('should allow unmatched routes through', async () => {
      app.get('/api/todos', (c) => c.json({ success: true }))
      mockGetAuthUser.mockReturnValue(undefined as never)
      const res = await app.request('/api/todos')
      expect(res.status).toBe(200)
    })
  })

  describe('unauthenticated requests to protected routes', () => {
    it('should pass through when no user (let auth middleware handle)', async () => {
      mockGetAuthUser.mockReturnValue(undefined as never)
      const res = await app.request('/api/admin/users')
      expect(res.status).toBe(200)
    })
  })

  describe('super admin bypass', () => {
    it('should allow super admin access to any protected route', async () => {
      mockGetAuthUser.mockReturnValue({ id: '1' } as never)
      mockGetUserRoles.mockResolvedValue([{ code: 'super_admin' }] as never)
      mockHasPermission.mockResolvedValue(false)

      const res = await app.request('/api/admin/users')
      expect(res.status).toBe(200)
    })
  })

  describe('permission-based access', () => {
    it('should allow user with correct permission (user:view)', async () => {
      mockGetAuthUser.mockReturnValue({ id: '2' } as never)
      mockGetUserRoles.mockResolvedValue([{ code: 'user' }] as never)
      mockHasPermission.mockResolvedValue(true)

      const res = await app.request('/api/admin/users')
      expect(res.status).toBe(200)
      expect(mockHasPermission).toHaveBeenCalledWith('2', 'user:view')
    })

    it('should allow user with correct permission (content:view)', async () => {
      mockGetAuthUser.mockReturnValue({ id: '2' } as never)
      mockGetUserRoles.mockResolvedValue([{ code: 'user' }] as never)
      mockHasPermission.mockResolvedValue(true)

      const res = await app.request('/api/content')
      expect(res.status).toBe(200)
      expect(mockHasPermission).toHaveBeenCalledWith('2', 'content:view')
    })

    it('should allow user with correct permission (system:settings)', async () => {
      mockGetAuthUser.mockReturnValue({ id: '2' } as never)
      mockGetUserRoles.mockResolvedValue([{ code: 'user' }] as never)
      mockHasPermission.mockResolvedValue(true)

      const res = await app.request('/api/admin/settings')
      expect(res.status).toBe(200)
      expect(mockHasPermission).toHaveBeenCalledWith('2', 'system:settings')
    })

    it('should allow user with correct permission (system:logs)', async () => {
      mockGetAuthUser.mockReturnValue({ id: '2' } as never)
      mockGetUserRoles.mockResolvedValue([{ code: 'user' }] as never)
      mockHasPermission.mockResolvedValue(true)

      const res = await app.request('/api/admin/logs')
      expect(res.status).toBe(200)
      expect(mockHasPermission).toHaveBeenCalledWith('2', 'system:logs')
    })

    it('should block user without required permission', async () => {
      mockGetAuthUser.mockReturnValue({ id: '3' } as never)
      mockGetUserRoles.mockResolvedValue([{ code: 'user' }] as never)
      mockHasPermission.mockResolvedValue(false)

      const res = await app.request('/api/admin/users')
      expect(res.status).toBe(403)
      const body: any = await res.json()
      expect(body.success).toBe(false)
      expect(body.error).toContain('Forbidden')
    })
  })

  describe('parameterized routes', () => {
    it('should match PUT /api/admin/users/:id with user:edit permission', async () => {
      mockGetAuthUser.mockReturnValue({ id: '2' } as never)
      mockGetUserRoles.mockResolvedValue([{ code: 'user' }] as never)
      mockHasPermission.mockResolvedValue(true)

      const res = await app.request('/api/admin/users/123', { method: 'PUT' })
      expect(res.status).toBe(200)
      expect(mockHasPermission).toHaveBeenCalledWith('2', 'user:edit')
    })

    it('should match DELETE /api/admin/users/:id with user:delete permission', async () => {
      mockGetAuthUser.mockReturnValue({ id: '2' } as never)
      mockGetUserRoles.mockResolvedValue([{ code: 'user' }] as never)
      mockHasPermission.mockResolvedValue(true)

      const res = await app.request('/api/admin/users/456', { method: 'DELETE' })
      expect(res.status).toBe(200)
      expect(mockHasPermission).toHaveBeenCalledWith('2', 'user:delete')
    })

    it('should match PUT /api/content/:id with content:edit permission', async () => {
      mockGetAuthUser.mockReturnValue({ id: '2' } as never)
      mockGetUserRoles.mockResolvedValue([{ code: 'user' }] as never)
      mockHasPermission.mockResolvedValue(true)

      const res = await app.request('/api/content/789', { method: 'PUT' })
      expect(res.status).toBe(200)
      expect(mockHasPermission).toHaveBeenCalledWith('2', 'content:edit')
    })

    it('should match DELETE /api/content/:id with content:delete permission', async () => {
      mockGetAuthUser.mockReturnValue({ id: '2' } as never)
      mockGetUserRoles.mockResolvedValue([{ code: 'user' }] as never)
      mockHasPermission.mockResolvedValue(true)

      const res = await app.request('/api/content/999', { method: 'DELETE' })
      expect(res.status).toBe(200)
      expect(mockHasPermission).toHaveBeenCalledWith('2', 'content:delete')
    })

    it('should not match wrong method for parameterized route', async () => {
      mockGetAuthUser.mockReturnValue({ id: '2' } as never)
      mockGetUserRoles.mockResolvedValue([{ code: 'user' }] as never)

      app.patch('/api/admin/users/:id', (c) => c.json({ success: true }))
      const res = await app.request('/api/admin/users/123', { method: 'PATCH' })
      expect(res.status).toBe(200)
      expect(mockHasPermission).not.toHaveBeenCalled()
    })

    it('should not match wrong path segment length', async () => {
      mockGetAuthUser.mockReturnValue({ id: '2' } as never)
      mockGetUserRoles.mockResolvedValue([{ code: 'user' }] as never)

      app.get('/api/admin/users/extra/segment', (c) => c.json({ success: true }))
      const res = await app.request('/api/admin/users/extra/segment')
      expect(res.status).toBe(200)
      expect(mockHasPermission).not.toHaveBeenCalled()
    })
  })

  describe('POST routes with permissions', () => {
    it('should match POST /api/admin/users with user:create permission', async () => {
      mockGetAuthUser.mockReturnValue({ id: '2' } as never)
      mockGetUserRoles.mockResolvedValue([{ code: 'user' }] as never)
      mockHasPermission.mockResolvedValue(true)

      const res = await app.request('/api/admin/users', { method: 'POST' })
      expect(res.status).toBe(200)
      expect(mockHasPermission).toHaveBeenCalledWith('2', 'user:create')
    })

    it('should match POST /api/content with content:create permission', async () => {
      mockGetAuthUser.mockReturnValue({ id: '2' } as never)
      mockGetUserRoles.mockResolvedValue([{ code: 'user' }] as never)
      mockHasPermission.mockResolvedValue(true)

      const res = await app.request('/api/content', { method: 'POST' })
      expect(res.status).toBe(200)
      expect(mockHasPermission).toHaveBeenCalledWith('2', 'content:create')
    })

    it('should match PUT /api/admin/settings with system:settings permission', async () => {
      mockGetAuthUser.mockReturnValue({ id: '2' } as never)
      mockGetUserRoles.mockResolvedValue([{ code: 'user' }] as never)
      mockHasPermission.mockResolvedValue(true)

      const res = await app.request('/api/admin/settings', { method: 'PUT' })
      expect(res.status).toBe(200)
      expect(mockHasPermission).toHaveBeenCalledWith('2', 'system:settings')
    })
  })

  describe('route with no required permissions', () => {
    it('should allow access when route has empty permissions array', async () => {
      mockGetAuthUser.mockReturnValue({ id: '2' } as never)

      const testApp = new Hono()
      testApp.use('*', permissionMiddleware())
      testApp.get('/api/custom', (c) => c.json({ success: true }))

      const res = await testApp.request('/api/custom')
      expect(res.status).toBe(200)
    })
  })
})
