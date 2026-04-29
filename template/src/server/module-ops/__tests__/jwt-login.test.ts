/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, generateToken } from '../../middleware/jwt-auth'
import { createTestClient } from '../../test-utils/test-client'

describe('JWT Login Flow', () => {
  describe('Password hashing', () => {
    it('should hash and verify password correctly', async () => {
      const hash = await hashPassword('123456')
      expect(hash).not.toBe('123456')
      const valid = await verifyPassword('123456', hash)
      expect(valid).toBe(true)
    })

    it('should reject wrong password', async () => {
      const hash = await hashPassword('123456')
      const valid = await verifyPassword('wrong', hash)
      expect(valid).toBe(false)
    })
  })

  describe('Token generation', () => {
    it('should generate JWT with user claims', async () => {
      const token = await generateToken({
        userId: '1',
        role: 'super_admin',
        tenantId: 'default',
      })
      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3)
    })
  })

  describe('Login endpoint integration', () => {
    it('should return JWT token on successful login with real credentials', async () => {
      const client = createTestClient()
      const res = await client.api.admin.login.$post({
        json: { username: 'superadmin', password: '123456' },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      if (body.success) {
        expect(body.data.token).toBeTruthy()
        expect(body.data.token.split('.').length).toBe(3)
      }
    })

    it('should reject invalid credentials', async () => {
      const client = createTestClient()
      const res = await client.api.admin.login.$post({
        json: { username: 'superadmin', password: 'wrongpassword' },
      })

      expect(res.status).toBe(401)
    })

    it('should reject non-existent user', async () => {
      const client = createTestClient()
      const res = await client.api.admin.login.$post({
        json: { username: 'nonexistent', password: '123456' },
      })

      expect(res.status).toBe(401)
    })

    it('should generate JWT that contains correct user claims', async () => {
      const client = createTestClient()
      const res = await client.api.admin.login.$post({
        json: { username: 'superadmin', password: '123456' },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      if (body.success) {
        expect(body.data.user.username).toBe('superadmin')
        expect(body.data.user.role).toBe('super_admin')
        expect(body.data.user.id).toBe('1')
      }
    })

    it('should return JWT that can be decoded and contains userId', async () => {
      const { verify } = await import('hono/jwt')
      const client = createTestClient()
      const res = await client.api.admin.login.$post({
        json: { username: 'superadmin', password: '123456' },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      if (body.success) {
        const token = body.data.token
        const decoded = (await verify(
          token,
          process.env.JWT_SECRET || 'dev-secret-change-in-production',
          'HS256'
        )) as Record<string, unknown>
        expect(decoded.userId).toBe('1')
        expect(decoded.role).toBe('super_admin')
        expect(decoded.tenantId).toBe('default')
      }
    })
  })
})
