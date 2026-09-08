import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'
import {
  listTenants,
  getTenantById,
  getTenantBySlug,
  createTenant,
  updateTenant,
  deleteTenant,
} from '../services/tenant-service'
import type { CreateTenantInput } from '@shared/schemas'

describe('Tenant Service', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  describe('listTenants', () => {
    it('should return paginated list', async () => {
      const result = await listTenants(1, 20)
      expect(result).toHaveProperty('items')
      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('page', 1)
      expect(result).toHaveProperty('pageSize', 20)
      expect(Array.isArray(result.items)).toBe(true)
    })

    it('should filter by status', async () => {
      const result = await listTenants(1, 20, { status: 'active' })
      for (const item of result.items) {
        expect(item.status).toBe('active')
      }
    })

    it('should filter by plan', async () => {
      const result = await listTenants(1, 20, { plan: 'pro' })
      for (const item of result.items) {
        expect(item.plan).toBe('pro')
      }
    })
  })

  describe('getTenantById', () => {
    it('should return null for non-existent id', async () => {
      const result = await getTenantById(99999)
      expect(result).toBeNull()
    })

    it('should return tenant for valid id', async () => {
      const list = await listTenants(1, 1)
      if (list.items.length > 0) {
        const tenant = await getTenantById(list.items[0].id)
        expect(tenant).not.toBeNull()
        expect(tenant!.id).toBe(list.items[0].id)
        expect(tenant).toHaveProperty('name')
        expect(tenant).toHaveProperty('slug')
      }
    })
  })

  describe('getTenantBySlug', () => {
    it('should return null for non-existent slug', async () => {
      const result = await getTenantBySlug('non-existent-slug')
      expect(result).toBeNull()
    })

    it('should return tenant by slug', async () => {
      const result = await getTenantBySlug('demo')
      expect(result).not.toBeNull()
      expect(result!.slug).toBe('demo')
    })
  })

  describe('createTenant', () => {
    it('should create a tenant with defaults', async () => {
      const input: CreateTenantInput = {
        name: 'New Corp',
        slug: 'new-corp',
        plan: 'free',
        maxUsers: 5,
        settings: null,
      }
      const result = await createTenant(input)
      expect(result.name).toBe('New Corp')
      expect(result.slug).toBe('new-corp')
      expect(result.status).toBe('trial')
      expect(result.plan).toBe('free')
    })

    it('should reject duplicate slug', async () => {
      await expect(
        createTenant({
          name: 'Duplicate',
          slug: 'demo',
          plan: 'free',
          maxUsers: 5,
          settings: null,
        })
      ).rejects.toThrow(/already exists/)
    })
  })

  describe('updateTenant', () => {
    it('should return null for non-existent id', async () => {
      const result = await updateTenant(99999, { name: 'Updated' })
      expect(result).toBeNull()
    })

    it('should update tenant fields', async () => {
      // Create a tenant to update
      const created = await createTenant({
        name: 'Update Test',
        slug: 'update-test',
        plan: 'free',
        maxUsers: 5,
        settings: null,
      })

      const result = await updateTenant(created.id, { name: 'Updated Name' })
      expect(result).not.toBeNull()
      expect(result!.name).toBe('Updated Name')
    })
  })

  describe('deleteTenant', () => {
    it('should return false for non-existent id', async () => {
      const result = await deleteTenant(99999)
      expect(result).toBe(false)
    })

    it('should delete and return true', async () => {
      const created = await createTenant({
        name: 'Delete Test',
        slug: 'delete-test',
        plan: 'free',
        maxUsers: 5,
        settings: null,
      })

      const result = await deleteTenant(created.id)
      expect(result).toBe(true)

      // Verify deleted
      const found = await getTenantById(created.id)
      expect(found).toBeNull()
    })
  })
})
