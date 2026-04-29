/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { jwtAuthMiddleware, hashPassword, verifyPassword, generateToken } from '../jwt-auth'

describe('JWT Auth', () => {
  describe('hashPassword / verifyPassword', () => {
    it('should hash password and verify correctly', async () => {
      const hash = await hashPassword('mypassword123')
      expect(hash).not.toBe('mypassword123')
      const isValid = await verifyPassword('mypassword123', hash)
      expect(isValid).toBe(true)
    })

    it('should reject wrong password', async () => {
      const hash = await hashPassword('mypassword123')
      const isValid = await verifyPassword('wrongpassword', hash)
      expect(isValid).toBe(false)
    })
  })

  describe('generateToken / jwtAuthMiddleware', () => {
    it('should generate valid JWT token', async () => {
      const token = await generateToken({ userId: 'user-1', role: 'admin', tenantId: 'tenant-1' })
      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
    })

    it('should extract user from valid token', async () => {
      const app = new Hono()
      app.use('/*', jwtAuthMiddleware)
      app.get('/protected', c => c.json({ user: c.get('user') }))

      const token = await generateToken({ userId: 'user-1', role: 'admin', tenantId: 'tenant-1' })
      const res = await app.request('/protected', {
        headers: { Authorization: `Bearer ${token}` },
      })

      expect(res.status).toBe(200)
      const body = (await res.json()) as { user: { userId: string } }
      expect(body.user.userId).toBe('user-1')
    })

    it('should reject request without token', async () => {
      const app = new Hono()
      app.use('/*', jwtAuthMiddleware)
      app.get('/protected', c => c.json({ ok: true }))

      const res = await app.request('/protected')
      expect(res.status).toBe(401)
    })

    it('should reject request with invalid token', async () => {
      const app = new Hono()
      app.use('/*', jwtAuthMiddleware)
      app.get('/protected', c => c.json({ ok: true }))

      const res = await app.request('/protected', {
        headers: { Authorization: 'Bearer invalid-token' },
      })
      expect(res.status).toBe(401)
    })
  })
})
