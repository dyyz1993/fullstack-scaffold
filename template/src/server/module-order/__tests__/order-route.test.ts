import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestClient } from '@server/test-utils/test-client'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'

describe('Order Routes', () => {
  const authHeaders = { Authorization: 'Bearer admin-token' }

  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  describe('GET /api/orders', () => {
    it('should return list of orders', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })
      const res = await client.api['orders'].$get({ query: {} })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(Array.isArray(data.data)).toBe(true)
      }
    })

    it('should filter orders by status', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })

      const res = await client.api['orders'].$get({
        query: { status: 'completed' },
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(Array.isArray(data.data)).toBe(true)
        data.data.forEach((order: { status: string }) => {
          expect(order.status).toBe('completed')
        })
      }
    })

    it('should filter orders by customerName', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })

      const res = await client.api['orders'].$get({
        query: { customerName: '张三' },
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(Array.isArray(data.data)).toBe(true)
        data.data.forEach((order: { customerName: string }) => {
          expect(order.customerName).toContain('张三')
        })
      }
    })

    it('should filter orders by both status and customerName', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })

      const createRes = await client.api['orders'].$post({
        json: {
          customerName: 'Filter Test',
          customerEmail: 'filter@example.com',
          productName: 'Filter Product',
          amount: 100,
        },
      })
      expect(createRes.status).toBe(201)

      const res = await client.api['orders'].$get({
        query: { status: 'pending', customerName: 'Filter Test' },
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(Array.isArray(data.data)).toBe(true)
        data.data.forEach((order: { status: string; customerName: string }) => {
          expect(order.status).toBe('pending')
          expect(order.customerName).toContain('Filter Test')
        })
      }
    })

    it('should return empty array when no orders match filter', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })

      const createRes = await client.api['orders'].$post({
        json: {
          customerName: 'Exists Test',
          customerEmail: 'exists@example.com',
          productName: 'Exists Product',
          amount: 100,
        },
      })
      expect(createRes.status).toBe(201)

      const res = await client.api['orders'].$get({
        query: { customerName: 'NonExistentCustomer12345' },
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.data).toHaveLength(0)
      }
    })
  })

  describe('GET /api/orders/:id', () => {
    it('should fetch order by id', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })

      const createRes = await client.api['orders'].$post({
        json: {
          customerName: 'Fetch Test',
          customerEmail: 'fetch@example.com',
          productName: 'Fetch Product',
          amount: 100,
        },
      })
      const createData = await createRes.json()
      const orderId = createData.success ? createData.data.id : ''

      const res = await client.api['orders'][':id'].$get({
        param: { id: orderId },
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.data.id).toBe(orderId)
      }
    })

    it('should return 404 for non-existent order', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })
      const res = await client.api['orders'][':id'].$get({
        param: { id: 'non-existent' },
      })
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/orders', () => {
    it('should create a new order', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })
      const res = await client.api['orders'].$post({
        json: {
          customerName: 'Test Customer',
          customerEmail: 'test@example.com',
          productName: 'Test Product',
          amount: 200,
        },
      })
      expect(res.status).toBe(201)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.data.id).toBeDefined()
        expect(data.data.amount).toBe(200)
      }
    })
  })

  describe('PUT /api/orders/:id', () => {
    it('should update an order status', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })

      const createRes = await client.api['orders'].$post({
        json: {
          customerName: 'Update Test',
          customerEmail: 'update@example.com',
          productName: 'Update Product',
          amount: 50,
        },
      })
      const createData = await createRes.json()
      const orderId = createData.success ? createData.data.id : ''

      const res = await client.api['orders'][':id'].$put({
        param: { id: orderId },
        json: { status: 'processing' },
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
    })
  })

  describe('DELETE /api/orders/:id', () => {
    it('should delete an order', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })

      const createRes = await client.api['orders'].$post({
        json: {
          customerName: 'Delete Test',
          customerEmail: 'delete@example.com',
          productName: 'Delete Product',
          amount: 50,
        },
      })
      const createData = await createRes.json()
      const orderId = createData.success ? createData.data.id : ''

      const res = await client.api['orders'][':id'].$delete({
        param: { id: orderId },
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
    })
  })

  describe('PUT /api/orders/:id/process', () => {
    it('should process an order', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })

      const createRes = await client.api['orders'].$post({
        json: {
          customerName: 'Process Test',
          customerEmail: 'process@example.com',
          productName: 'Process Product',
          amount: 50,
        },
      })
      const createData = await createRes.json()
      const orderId = createData.success ? createData.data.id : ''

      const res = await client.api['orders'][':id'].process.$put({
        param: { id: orderId },
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
    })
  })

  describe('PUT /api/orders/:id/cancel', () => {
    it('should cancel an order', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })

      const createRes = await client.api['orders'].$post({
        json: {
          customerName: 'Cancel Test',
          customerEmail: 'cancel@example.com',
          productName: 'Cancel Product',
          amount: 50,
        },
      })
      const createData = await createRes.json()
      const orderId = createData.success ? createData.data.id : ''

      const res = await client.api['orders'][':id'].cancel.$put({
        param: { id: orderId },
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
    })
  })
})
