import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestClient } from '@server/test-utils/test-client'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'

describe('Tenant Routes', () => {
  const authHeaders = { Authorization: 'Bearer test-super-admin-1' }

  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  describe('GET /api/tenants', () => {
    it('should return list of tenants', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })
      const res = await client.api.tenants.$get({ query: {} })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(Array.isArray(data.data.items)).toBe(true)
        expect(data.data).toHaveProperty('total')
        expect(data.data).toHaveProperty('page')
        expect(data.data).toHaveProperty('pageSize')
      }
    })

    it('should support pagination', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })
      const res = await client.api.tenants.$get({
        query: { page: 1, pageSize: 5 },
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      if (data.success) {
        expect(data.data.page).toBe(1)
        expect(data.data.pageSize).toBe(5)
      }
    })

    it('should filter by status', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })
      const res = await client.api.tenants.$get({
        query: { status: 'active' },
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      if (data.success) {
        for (const item of data.data.items) {
          expect(item.status).toBe('active')
        }
      }
    })
  })

  describe('GET /api/tenants/:id', () => {
    it('should return 404 for non-existent tenant', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })
      const res = await client.api.tenants[':id'].$get({
        param: { id: '99999' },
      })
      expect(res.status).toBe(404)
    })

    it('should return tenant by id', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })
      // First list to get an id
      const listRes = await client.api.tenants.$get({ query: {} })
      const listData = await listRes.json()

      if (listData.success && listData.data.items.length > 0) {
        const tenantId = String(listData.data.items[0].id)
        const res = await client.api.tenants[':id'].$get({
          param: { id: tenantId },
        })
        expect(res.status).toBe(200)

        const data = await res.json()
        if (data.success) {
          expect(data.data).toHaveProperty('id')
          expect(data.data).toHaveProperty('name')
          expect(data.data).toHaveProperty('slug')
          expect(data.data).toHaveProperty('status')
          expect(data.data).toHaveProperty('plan')
        }
      }
    })
  })

  describe('POST /api/tenants', () => {
    it('should create a new tenant', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })
      const res = await client.api.tenants.$post({
        json: {
          name: 'Test Tenant Route',
          slug: 'test-tenant-route',
          plan: 'free',
          maxUsers: 10,
          settings: null,
        },
      })
      expect(res.status).toBe(201)

      const data = await res.json()
      if (data.success) {
        expect(data.data.name).toBe('Test Tenant Route')
        expect(data.data.slug).toBe('test-tenant-route')
        expect(data.data.status).toBe('trial')
      }
    })

    it('should reject duplicate slug', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })
      const res = await client.api.tenants.$post({
        json: {
          name: 'Duplicate',
          slug: 'demo', // seeded slug
          plan: 'free',
          maxUsers: 5,
          settings: null,
        },
      })
      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /api/tenants/:id', () => {
    it('should return 404 for non-existent tenant', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })
      const res = await client.api.tenants[':id'].$delete({
        param: { id: '99999' },
      })
      expect(res.status).toBe(404)
    })
  })
})
