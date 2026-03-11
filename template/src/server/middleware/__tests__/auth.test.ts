import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import {
  authMiddleware,
  requireAdminMiddleware,
  requirePermissionsMiddleware,
  type AuthUser,
} from '../auth'

describe('Auth Middleware', () => {
  let app: Hono<{ Variables: { authUser: AuthUser } }>

  beforeEach(() => {
    app = new Hono<{ Variables: { authUser: AuthUser } }>()
  })

  describe('authMiddleware', () => {
    it('should reject request without Authorization header', async () => {
      app.use('/protected', authMiddleware())
      app.get('/protected', c => c.json({ success: true }))

      const res = await app.request('/protected')
      expect(res.status).toBe(401)
    })

    it('should reject request with invalid Authorization format', async () => {
      app.use('/protected', authMiddleware())
      app.get('/protected', c => c.json({ success: true }))

      const res = await app.request('/protected', {
        headers: { Authorization: 'InvalidFormat token' },
      })
      expect(res.status).toBe(401)
    })

    it('should reject request with invalid token', async () => {
      app.use('/protected', authMiddleware())
      app.get('/protected', c => c.json({ success: true }))

      const res = await app.request('/protected', {
        headers: { Authorization: 'Bearer invalid-token' },
      })
      expect(res.status).toBe(401)
    })

    it('should allow request with valid admin token', async () => {
      app.use('/protected', authMiddleware())
      app.get('/protected', c => {
        const user = c.get('authUser')
        return c.json({ success: true, user })
      })

      const res = await app.request('/protected', {
        headers: { Authorization: 'Bearer admin-token' },
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; user: AuthUser }
      expect(data.success).toBe(true)
      expect(data.user).toMatchObject({
        id: 'admin-1',
        role: 'admin',
      })
    })

    it('should allow request with valid user token', async () => {
      app.use('/protected', authMiddleware())
      app.get('/protected', c => {
        const user = c.get('authUser')
        return c.json({ success: true, user })
      })

      const res = await app.request('/protected', {
        headers: { Authorization: 'Bearer user-token' },
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; user: AuthUser }
      expect(data.success).toBe(true)
      expect(data.user).toMatchObject({
        id: 'user-1',
        role: 'user',
      })
    })
  })

  describe('requireAdminMiddleware', () => {
    it('should reject non-admin user', async () => {
      app.use('/admin', requireAdminMiddleware())
      app.get('/admin', c => c.json({ success: true }))

      const res = await app.request('/admin', {
        headers: { Authorization: 'Bearer user-token' },
      })
      expect(res.status).toBe(403)
    })

    it('should allow admin user', async () => {
      app.use('/admin', requireAdminMiddleware())
      app.get('/admin', c => c.json({ success: true }))

      const res = await app.request('/admin', {
        headers: { Authorization: 'Bearer admin-token' },
      })
      expect(res.status).toBe(200)
    })
  })

  describe('requirePermissionsMiddleware', () => {
    it('should reject user without required permissions', async () => {
      app.use('/delete', requirePermissionsMiddleware('delete'))
      app.delete('/delete', c => c.json({ success: true }))

      const res = await app.request('/delete', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer user-token' },
      })
      expect(res.status).toBe(403)
    })

    it('should allow user with required permissions', async () => {
      app.use('/read', requirePermissionsMiddleware('read'))
      app.get('/read', c => c.json({ success: true }))

      const res = await app.request('/read', {
        headers: { Authorization: 'Bearer user-token' },
      })
      expect(res.status).toBe(200)
    })

    it('should allow admin with all permissions', async () => {
      app.use('/delete', requirePermissionsMiddleware('delete'))
      app.delete('/delete', c => c.json({ success: true }))

      const res = await app.request('/delete', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer admin-token' },
      })
      expect(res.status).toBe(200)
    })

    it('should check multiple permissions', async () => {
      app.use('/manage', requirePermissionsMiddleware('read', 'write', 'delete'))
      app.post('/manage', c => c.json({ success: true }))

      const res = await app.request('/manage', {
        method: 'POST',
        headers: { Authorization: 'Bearer user-token' },
      })
      expect(res.status).toBe(403)
    })
  })

  describe('Test tokens', () => {
    it('should accept test-admin-* tokens', async () => {
      app.use('/protected', authMiddleware())
      app.get('/protected', c => {
        const user = c.get('authUser')
        return c.json({ success: true, user })
      })

      const res = await app.request('/protected', {
        headers: { Authorization: 'Bearer test-admin-123' },
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; user: AuthUser }
      expect(data.user.role).toBe('admin')
    })

    it('should accept test-user-* tokens', async () => {
      app.use('/protected', authMiddleware())
      app.get('/protected', c => {
        const user = c.get('authUser')
        return c.json({ success: true, user })
      })

      const res = await app.request('/protected', {
        headers: { Authorization: 'Bearer test-user-456' },
      })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean; user: AuthUser }
      expect(data.user.role).toBe('user')
    })
  })
})
