import { describe, it, expect } from 'vitest'
import { createTestClient } from '../../test-utils/test-client'

describe('Dispute Routes', () => {
  describe('GET /api/disputes', () => {
    it('should return list of disputes', async () => {
      const client = createTestClient()
      const res = await client.api['disputes'].$get()
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
      const client = createTestClient()
      const res = await client.api['disputes'][':id'].$get({
        param: { id: 'non-existent' },
      })
      expect(res.status).toBe(404)
      expect(typeof res.status).toBe('number')
    })
  })
})
