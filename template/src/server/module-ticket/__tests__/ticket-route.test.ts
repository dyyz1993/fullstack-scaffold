import { describe, it, expect } from 'vitest'
import { createTestClient } from '../../test-utils/test-client'

describe('Ticket Routes', () => {
  describe('GET /api/tickets', () => {
    it('should return list of tickets', async () => {
      const client = createTestClient()
      const res = await client.api['tickets'].$get()
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(Array.isArray(data.data)).toBe(true)
      }
    })
  })

  describe('GET /api/tickets/:id', () => {
    it('should return 404 for non-existent ticket', async () => {
      const client = createTestClient()
      const res = await client.api['tickets'][':id'].$get({
        param: { id: 'non-existent' },
      })
      expect(res.status).toBe(404)
      expect(typeof res.status).toBe('number')
    })
  })
})
