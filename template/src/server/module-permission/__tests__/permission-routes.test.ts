import { describe, it, expect } from 'vitest'
import { createTestClient } from '../../test-utils/test-client'

describe('Permission Routes', () => {
  describe('GET /api/permissions', () => {
    it('should return list of permissions', async () => {
      const client = createTestClient()
      const res = await client.api.permissions.$get()
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(Array.isArray(data.data)).toBe(true)
        expect(data.data.length).toBeGreaterThan(0)
      }
    })

    it('should return permissions with correct structure', async () => {
      const client = createTestClient()
      const res = await client.api.permissions.$get()
      expect(res.status).toBe(200)

      const data = await res.json()
      if (data.success && data.data.length > 0) {
        const firstPermission = data.data[0]
        expect(firstPermission).toHaveProperty('permission')
        expect(firstPermission).toHaveProperty('label')
        expect(firstPermission).toHaveProperty('category')
      }
    })
  })

  describe('GET /api/permissions/roles', () => {
    it('should return list of roles', async () => {
      const client = createTestClient()
      const res = await client.api.permissions.roles.$get()
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(Array.isArray(data.data)).toBe(true)
        expect(data.data.length).toBe(3)
      }
    })

    it('should return roles with correct structure', async () => {
      const client = createTestClient()
      const res = await client.api.permissions.roles.$get()
      expect(res.status).toBe(200)

      const data = await res.json()
      if (data.success && data.data.length > 0) {
        const firstRole = data.data[0]
        expect(firstRole).toHaveProperty('role')
        expect(firstRole).toHaveProperty('label')
        expect(firstRole).toHaveProperty('permissions')
        expect(Array.isArray(firstRole.permissions)).toBe(true)
      }
    })
  })

  describe('Error Scenarios', () => {
    it('should handle unauthorized access to /permissions/me', async () => {
      const client = createTestClient()
      const res = await client.api.permissions.me.$get()
      expect(res.status).toBe(401)
    })

    it('should handle unauthorized access to /permissions', async () => {
      const client = createTestClient()
      const res = await client.api.permissions.$get()
      expect(res.status).toBe(401)
    })

    it('should handle unauthorized access to /permissions/roles', async () => {
      const client = createTestClient()
      const res = await client.api.permissions.roles.$get()
      expect(res.status).toBe(401)
    })
  })
})
