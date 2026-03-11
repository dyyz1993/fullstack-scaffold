import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createTestClient } from '../../test-utils/test-client'
import { setupTestDatabase, cleanupTestDatabase } from '../../db/test-setup'
import { getRawClient } from '../../db'

describe('Admin Routes', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
  })

  describe('Authentication', () => {
    it('should reject request without token', async () => {
      const client = createTestClient()
      const res = await client.api.admin.stats.$get()
      expect(res.status).toBe(401)
    })

    it('should reject request with invalid token', async () => {
      const client = createTestClient()
      const res = await client.api.admin.stats.$get(undefined, {
        headers: { Authorization: 'Bearer invalid-token' },
      })
      expect(res.status).toBe(401)
    })

    it('should reject non-admin user', async () => {
      const client = createTestClient()
      const res = await client.api.admin.stats.$get(undefined, {
        headers: { Authorization: 'Bearer user-token' },
      })
      expect(res.status).toBe(403)
    })
  })

  describe('GET /api/admin/stats', () => {
    it('should return system stats for admin', async () => {
      const client = createTestClient()
      const res = await client.api.admin.stats.$get(undefined, {
        headers: { Authorization: 'Bearer admin-token' },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.data).toHaveProperty('totalTodos')
        expect(data.data).toHaveProperty('pendingTodos')
        expect(data.data).toHaveProperty('completedTodos')
        expect(data.data).toHaveProperty('lastUpdated')
      }
    })

    it('should return correct todo counts', async () => {
      const rawClient = await getRawClient()
      if (rawClient && 'execute' in rawClient) {
        const now = Date.now()
        await rawClient.execute({
          sql: `INSERT INTO todos (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)`,
          args: ['Pending Todo', 'pending', now, now],
        })
        await rawClient.execute({
          sql: `INSERT INTO todos (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)`,
          args: ['Completed Todo', 'completed', now, now],
        })

        const client = createTestClient()
        const res = await client.api.admin.stats.$get(undefined, {
          headers: { Authorization: 'Bearer admin-token' },
        })

        const data = await res.json()
        expect(data.success).toBe(true)
        if (data.success) {
          expect(data.data.totalTodos).toBe(2)
          expect(data.data.pendingTodos).toBe(1)
          expect(data.data.completedTodos).toBe(1)
        }
      }
    })
  })

  describe('GET /api/admin/health', () => {
    it('should return health status for admin', async () => {
      const client = createTestClient()
      const res = await client.api.admin.health.$get(undefined, {
        headers: { Authorization: 'Bearer admin-token' },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.data).toHaveProperty('database')
        expect(data.data).toHaveProperty('timestamp')
      }
    })
  })

  describe('GET /api/admin/activity', () => {
    it('should return recent activity for admin', async () => {
      const client = createTestClient()
      const res = await client.api.admin.activity.$get(
        { query: {} },
        {
          headers: { Authorization: 'Bearer admin-token' },
        }
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(Array.isArray(data.data)).toBe(true)
      }
    })

    it('should respect limit parameter', async () => {
      const rawClient = await getRawClient()
      if (rawClient && 'execute' in rawClient) {
        const now = Date.now()
        for (let i = 0; i < 5; i++) {
          await rawClient.execute({
            sql: `INSERT INTO todos (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)`,
            args: [`Todo ${i}`, 'pending', now + i, now + i],
          })
        }

        const client = createTestClient()
        const res = await client.api.admin.activity.$get(
          { query: { limit: '3' } },
          {
            headers: { Authorization: 'Bearer admin-token' },
          }
        )

        const data = await res.json()
        expect(data.success).toBe(true)
        if (data.success) {
          expect(data.data.length).toBeLessThanOrEqual(3)
        }
      }
    })
  })

  describe('DELETE /api/admin/todos/all', () => {
    it('should clear all todos for admin', async () => {
      const rawClient = await getRawClient()
      if (rawClient && 'execute' in rawClient) {
        const now = Date.now()
        await rawClient.execute({
          sql: `INSERT INTO todos (title, status, created_at, updated_at) VALUES (?, ?, ?, ?)`,
          args: ['Todo to delete', 'pending', now, now],
        })

        const client = createTestClient()
        const res = await client.api.admin.todos.all.$delete(undefined, {
          headers: { Authorization: 'Bearer admin-token' },
        })

        expect(res.status).toBe(200)
        const data = await res.json()
        expect(data.success).toBe(true)
      }
    })
  })

  describe('GET /api/admin/me', () => {
    it('should return current admin user info', async () => {
      const client = createTestClient()
      const res = await client.api.admin.me.$get(undefined, {
        headers: { Authorization: 'Bearer admin-token' },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.data).toMatchObject({
          id: 'admin-1',
          role: 'admin',
          permissions: expect.arrayContaining(['read', 'write', 'delete', 'manage_users']),
        })
      }
    })

    it('should return current user info for regular user', async () => {
      const client = createTestClient()
      const res = await client.api.admin.me.$get(undefined, {
        headers: { Authorization: 'Bearer user-token' },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.data.role).toBe('user')
      }
    })
  })
})
