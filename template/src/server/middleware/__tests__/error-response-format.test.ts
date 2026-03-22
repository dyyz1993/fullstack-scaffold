import { describe, it, expect } from 'vitest'
import { createTestClient } from '../../test-utils/test-client'

describe('Error Response Format', () => {
  describe('Authentication Errors', () => {
    it('should return JSON format for missing authentication token', async () => {
      const client = createTestClient()

      const res = await client.api.admin.stats.$get()

      expect(res.status).toBe(401)

      const contentType = res.headers.get('content-type')
      expect(contentType).toContain('application/json')

      const data = await res.json()
      expect(data).toMatchObject({
        success: false,
        error: expect.any(String),
        status: 401,
      })
    })

    it('should return JSON format for invalid authentication token', async () => {
      const client = createTestClient('http://localhost', {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      })

      const res = await client.api.admin.stats.$get()

      expect(res.status).toBe(401)

      const data = await res.json()
      expect(data).toMatchObject({
        success: false,
        error: expect.any(String),
        status: 401,
      })
    })
  })

  describe('Permission Errors', () => {
    it('should return JSON format for insufficient permissions', async () => {
      const client = createTestClient('http://localhost', {
        headers: {
          Authorization: 'Bearer user-token',
        },
      })

      const res = await client.api.admin.stats.$get()

      expect(res.status).toBe(403)

      const contentType = res.headers.get('content-type')
      expect(contentType).toContain('application/json')

      const data = await res.json()
      expect(data).toMatchObject({
        success: false,
        error: expect.any(String),
        status: 403,
      })
    })
  })

  describe('All error responses should be JSON', () => {
    it('should never return plain text error', async () => {
      const client = createTestClient()

      const res = await client.api.admin.stats.$get()

      const text = await res.text()

      expect(() => JSON.parse(text)).not.toThrow()

      expect(text.trim().startsWith('{')).toBe(true)
      expect(text.trim().endsWith('}')).toBe(true)
    })
  })
})
