import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestClient } from '@server/test-utils/test-client'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'

describe('Dispute Routes', () => {
  const authHeaders = { Authorization: 'Bearer admin-token' }

  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  describe('GET /api/disputes', () => {
    it('should return list of disputes', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })
      const res = await client.api['disputes'].$get({ query: {} })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(Array.isArray(data.data)).toBe(true)
      }
    })
  })

  describe('GET /api/disputes/:id', () => {
    it('should return 404 for non-existent dispute', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })
      const res = await client.api['disputes'][':id'].$get(
        {
          param: { id: 'non-existent' },
        },
        { headers: authHeaders }
      )
      expect(res.status).toBe(404)
      expect(typeof res.status).toBe('number')
    })
  })
})
