import { describe, it, expect } from 'vitest'
import { createTestClient } from '../../test-utils/test-client'

describe('Order Routes', () => {
  describe('GET /api/orders', () => {
    it('should return list of orders', async () => {
      const client = createTestClient()
      const res = await client.api['orders'].$get()
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(Array.isArray(data.data)).toBe(true)
      }
    })
  })

  describe('GET /api/orders/:id', () => {
    it('should return 404 for non-existent order', async () => {
      const client = createTestClient()
      const res = await client.api['orders'][':id'].$get({
        param: { id: 'non-existent' },
      })
      expect(res.status).toBe(404)
      expect(typeof res.status).toBe('number')
    })
  })
})
