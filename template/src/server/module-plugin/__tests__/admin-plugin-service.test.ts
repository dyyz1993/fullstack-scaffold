import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import * as adminService from '../services/admin-plugin-service'
import { getRawClient, getDb } from '@server/db'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'
import { NotFoundError } from '@server/utils/app-error'

async function clearPluginTables() {
  const client = await getRawClient()
  if (client && 'execute' in client) {
    await client.execute('DELETE FROM plugin_reviews')
    await client.execute('DELETE FROM plugin_versions')
    await client.execute('DELETE FROM plugin_category_mappings')
    await client.execute('DELETE FROM plugins')
  }
}

async function insertTestPlugin(overrides: Record<string, unknown> = {}) {
  const client = await getRawClient()
  if (!client || !('execute' in client)) throw new Error('No DB client')

  const id = (overrides.id ?? `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`) as string
  const now = Date.now()
  await client.execute({
    sql: `INSERT INTO plugins (id, name, slug, description, author_id, author_name, version, status, download_count, view_count, featured, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      (overrides.name ?? 'Test Plugin') as string,
      (overrides.slug ?? id) as string,
      (overrides.description ?? 'A test plugin') as string,
      (overrides.authorId ?? 'user-1') as string,
      (overrides.authorName ?? 'Test User') as string,
      (overrides.version ?? '0.0.1') as string,
      (overrides.status ?? 'pending') as string,
      (overrides.downloadCount ?? 0) as number,
      (overrides.viewCount ?? 0) as number,
      (overrides.featured === true ? 1 : 0) as number,
      (overrides.createdAt ?? now) as number,
      (overrides.updatedAt ?? now) as number,
    ],
  })
  return id
}

describe('Admin Plugin Service', () => {
  beforeAll(async () => {
    await setupTestDatabase()
    const db = await getDb()
    expect(db).toBeDefined()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await clearPluginTables()
  })

  afterEach(async () => {
    await clearPluginTables()
    vi.clearAllMocks()
  })

  describe('listPending', () => {
    it('should return pending plugins with pagination', async () => {
      await insertTestPlugin({ slug: 'pending-1', status: 'pending' })
      await insertTestPlugin({ slug: 'pending-2', status: 'pending' })
      await insertTestPlugin({ slug: 'approved-1', status: 'approved' })

      const result = await adminService.listPending({ page: 1, limit: 10 })

      expect(result.plugins).toHaveLength(2)
      expect(result.plugins.every(p => p.status === 'pending')).toBe(true)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
    })

    it('should return empty when no pending plugins', async () => {
      await insertTestPlugin({ slug: 'no-pending', status: 'approved' })

      const result = await adminService.listPending()

      expect(result.plugins).toEqual([])
      expect(result.total).toBe(0)
    })

    it('should paginate correctly', async () => {
      for (let i = 0; i < 5; i++) {
        await insertTestPlugin({ slug: `pend-page-${i}`, status: 'pending' })
      }

      const page1 = await adminService.listPending({ page: 1, limit: 2 })
      const page2 = await adminService.listPending({ page: 2, limit: 2 })

      expect(page1.plugins).toHaveLength(2)
      expect(page1.total).toBe(5)
      expect(page2.plugins).toHaveLength(2)
    })
  })

  describe('approvePlugin', () => {
    it('should approve a pending plugin', async () => {
      await insertTestPlugin({ slug: 'approve-me', status: 'pending' })

      const result = await adminService.approvePlugin('approve-me')

      expect(result.status).toBe('approved')
      expect(result.slug).toBe('approve-me')
    })

    it('should clear reject reason on approval', async () => {
      const client = await getRawClient()
      await insertTestPlugin({ slug: 're-approve' })
      if (client && 'execute' in client) {
        await client.execute("UPDATE plugins SET reject_reason = 'bad' WHERE slug = 're-approve'")
      }

      const result = await adminService.approvePlugin('re-approve')

      expect(result.status).toBe('approved')
    })

    it('should throw NotFoundError for non-existent slug', async () => {
      await expect(adminService.approvePlugin('non-existent')).rejects.toThrow(NotFoundError)
    })
  })

  describe('rejectPlugin', () => {
    it('should reject a plugin with reason', async () => {
      await insertTestPlugin({ slug: 'reject-me', status: 'pending' })

      const result = await adminService.rejectPlugin('reject-me', 'Spam content')

      expect(result.status).toBe('rejected')
    })

    it('should throw NotFoundError for non-existent slug', async () => {
      await expect(adminService.rejectPlugin('non-existent', 'reason')).rejects.toThrow(
        NotFoundError
      )
    })
  })

  describe('toggleFeatured', () => {
    it('should toggle featured from false to true', async () => {
      await insertTestPlugin({ slug: 'feature-me', featured: false })

      const result = await adminService.toggleFeatured('feature-me')

      expect(result.featured).toBe(true)
    })

    it('should toggle featured from true to false', async () => {
      await insertTestPlugin({ slug: 'unfeature-me', featured: true })

      const result = await adminService.toggleFeatured('unfeature-me')

      expect(result.featured).toBe(false)
    })

    it('should throw NotFoundError for non-existent slug', async () => {
      await expect(adminService.toggleFeatured('non-existent')).rejects.toThrow(NotFoundError)
    })
  })

  describe('adminRemovePlugin', () => {
    it('should remove a plugin', async () => {
      await insertTestPlugin({ slug: 'remove-me' })

      await adminService.adminRemovePlugin('remove-me')

      const client = await getRawClient()
      if (client && 'execute' in client) {
        const result = await client.execute('SELECT * FROM plugins WHERE slug = ?', ['remove-me'])
        expect(result.rows.length).toBe(0)
      }
    })

    it('should throw NotFoundError for non-existent slug', async () => {
      await expect(adminService.adminRemovePlugin('non-existent')).rejects.toThrow(NotFoundError)
    })
  })

  describe('listAllPlugins', () => {
    it('should list all plugins without filter', async () => {
      await insertTestPlugin({ slug: 'all-1', status: 'approved' })
      await insertTestPlugin({ slug: 'all-2', status: 'pending' })
      await insertTestPlugin({ slug: 'all-3', status: 'rejected' })

      const result = await adminService.listAllPlugins()

      expect(result.plugins).toHaveLength(3)
    })

    it('should filter by status', async () => {
      await insertTestPlugin({ slug: 'filter-approved', status: 'approved' })
      await insertTestPlugin({ slug: 'filter-pending', status: 'pending' })

      const result = await adminService.listAllPlugins({ status: 'approved' })

      expect(result.plugins).toHaveLength(1)
      expect(result.plugins[0].status).toBe('approved')
    })

    it('should paginate correctly', async () => {
      for (let i = 0; i < 5; i++) {
        await insertTestPlugin({ slug: `page-all-${i}`, status: 'approved' })
      }

      const result = await adminService.listAllPlugins({ page: 1, limit: 2 })

      expect(result.plugins).toHaveLength(2)
      expect(result.total).toBe(5)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(2)
    })

    it('should return empty when no plugins', async () => {
      const result = await adminService.listAllPlugins()

      expect(result.plugins).toEqual([])
      expect(result.total).toBe(0)
    })
  })

  describe('bulkApprove', () => {
    it('should approve multiple plugins', async () => {
      await insertTestPlugin({ slug: 'bulk-a1', status: 'pending' })
      await insertTestPlugin({ slug: 'bulk-a2', status: 'pending' })
      await insertTestPlugin({ slug: 'bulk-a3', status: 'pending' })

      const count = await adminService.bulkApprove(['bulk-a1', 'bulk-a2', 'bulk-a3'])

      expect(count).toBe(3)
    })

    it('should skip non-existent slugs', async () => {
      await insertTestPlugin({ slug: 'bulk-exist', status: 'pending' })

      const count = await adminService.bulkApprove(['bulk-exist', 'bulk-nope'])

      expect(count).toBe(1)
    })

    it('should return 0 for empty array', async () => {
      const count = await adminService.bulkApprove([])

      expect(count).toBe(0)
    })
  })

  describe('bulkReject', () => {
    it('should reject multiple plugins', async () => {
      await insertTestPlugin({ slug: 'bulk-r1', status: 'pending' })
      await insertTestPlugin({ slug: 'bulk-r2', status: 'pending' })

      const count = await adminService.bulkReject(['bulk-r1', 'bulk-r2'], 'Not suitable')

      expect(count).toBe(2)
    })

    it('should skip non-existent slugs', async () => {
      await insertTestPlugin({ slug: 'bulk-rexist', status: 'pending' })

      const count = await adminService.bulkReject(['bulk-rexist', 'bulk-rnope'], 'Reason')

      expect(count).toBe(1)
    })

    it('should return 0 for empty array', async () => {
      const count = await adminService.bulkReject([], 'Reason')

      expect(count).toBe(0)
    })
  })
})
