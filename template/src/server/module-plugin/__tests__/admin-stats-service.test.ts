import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import * as statsService from '../services/admin-stats-service'
import { getRawClient, getDb } from '@server/db'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'

async function clearPluginTables() {
  const client = await getRawClient()
  if (client && 'execute' in client) {
    await client.execute('DELETE FROM plugin_reviews')
    await client.execute('DELETE FROM plugin_versions')
    await client.execute('DELETE FROM plugin_category_mappings')
    await client.execute('DELETE FROM plugins')
    await client.execute('DELETE FROM plugin_categories')
  }
}

async function insertPlugin(overrides: Record<string, unknown> = {}) {
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
      (overrides.status ?? 'approved') as string,
      (overrides.downloadCount ?? 0) as number,
      (overrides.viewCount ?? 0) as number,
      (overrides.featured === true ? 1 : 0) as number,
      (overrides.createdAt ?? now) as number,
      (overrides.updatedAt ?? now) as number,
    ],
  })
  return id
}

async function insertCategory(overrides: Record<string, unknown> = {}) {
  const client = await getRawClient()
  if (!client || !('execute' in client)) throw new Error('No DB client')

  const id = (overrides.id ?? `cat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`) as string
  await client.execute({
    sql: `INSERT INTO plugin_categories (id, name, slug, description, icon, sort_order)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      (overrides.name ?? 'Test Category') as string,
      (overrides.slug ?? id) as string,
      (overrides.description ?? null) as string | null,
      (overrides.icon ?? null) as string | null,
      (overrides.sortOrder ?? 0) as number,
    ],
  })
  return id
}

describe('Admin Stats Service', () => {
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

  describe('getDashboardStats', () => {
    it('should return zeroed stats when no data exists', async () => {
      const stats = await statsService.getDashboardStats()

      expect(stats.totalPlugins).toBe(0)
      expect(stats.pendingPlugins).toBe(0)
      expect(stats.totalDownloads).toBe(0)
      expect(stats.totalDevelopers).toBe(0)
      expect(stats.totalCategories).toBe(0)
      expect(stats.recentSubmissions).toEqual([])
    })

    it('should count total plugins', async () => {
      await insertPlugin({ slug: 'a', status: 'approved' })
      await insertPlugin({ slug: 'b', status: 'pending' })
      await insertPlugin({ slug: 'c', status: 'rejected' })

      const stats = await statsService.getDashboardStats()

      expect(stats.totalPlugins).toBe(3)
    })

    it('should count pending plugins', async () => {
      await insertPlugin({ slug: 'p1', status: 'pending' })
      await insertPlugin({ slug: 'p2', status: 'pending' })
      await insertPlugin({ slug: 'p3', status: 'approved' })

      const stats = await statsService.getDashboardStats()

      expect(stats.pendingPlugins).toBe(2)
    })

    it('should sum download counts', async () => {
      await insertPlugin({ slug: 'd1', downloadCount: 100, status: 'approved' })
      await insertPlugin({ slug: 'd2', downloadCount: 50, status: 'approved' })

      const stats = await statsService.getDashboardStats()

      expect(stats.totalDownloads).toBe(150)
    })

    it('should count distinct developers', async () => {
      await insertPlugin({ slug: 'dev1', authorId: 'user-1', status: 'approved' })
      await insertPlugin({ slug: 'dev2', authorId: 'user-1', status: 'approved' })
      await insertPlugin({ slug: 'dev3', authorId: 'user-2', status: 'approved' })

      const stats = await statsService.getDashboardStats()

      expect(stats.totalDevelopers).toBe(2)
    })

    it('should count categories', async () => {
      await insertCategory({ name: 'UI', slug: 'ui' })
      await insertCategory({ name: 'SEO', slug: 'seo' })

      const stats = await statsService.getDashboardStats()

      expect(stats.totalCategories).toBe(2)
    })

    it('should return recent submissions (up to 5)', async () => {
      for (let i = 0; i < 7; i++) {
        await insertPlugin({ slug: `recent-${i}`, status: 'approved' })
      }

      const stats = await statsService.getDashboardStats()

      expect(stats.recentSubmissions.length).toBeLessThanOrEqual(5)
    })

    it('should return full stats with mixed data', async () => {
      await insertPlugin({ slug: 'full-1', status: 'approved', downloadCount: 200, authorId: 'dev-a' })
      await insertPlugin({ slug: 'full-2', status: 'pending', downloadCount: 10, authorId: 'dev-b' })
      await insertCategory({ name: 'Full Cat', slug: 'full-cat' })

      const stats = await statsService.getDashboardStats()

      expect(stats.totalPlugins).toBe(2)
      expect(stats.pendingPlugins).toBe(1)
      expect(stats.totalDownloads).toBe(210)
      expect(stats.totalDevelopers).toBe(2)
      expect(stats.totalCategories).toBe(1)
      expect(stats.recentSubmissions).toHaveLength(2)
    })
  })
})
