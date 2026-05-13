import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import * as queryService from '../services/plugin-query-service'
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
    await client.execute('DELETE FROM plugin_categories')
  }
}

async function insertPlugin(overrides: Record<string, unknown> = {}) {
  const client = await getRawClient()
  if (!client || !('execute' in client)) throw new Error('No DB client')

  const id = (overrides.id ??
    `plugin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`) as string
  const now = Date.now()
  await client.execute({
    sql: `INSERT INTO plugins (id, name, slug, description, author_id, author_name, version, status, download_count, view_count, featured, created_at, updated_at, tags)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id as string,
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
      (overrides.tags ?? null) as string | null,
    ],
  })
  return id
}

describe('Plugin Query Service', () => {
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

  describe('listPlugins', () => {
    it('should return empty list when no approved plugins exist', async () => {
      const result = await queryService.listPlugins()
      expect(result.plugins).toEqual([])
      expect(result.total).toBe(0)
    })

    it('should return approved plugins with pagination', async () => {
      await insertPlugin({ slug: 'plugin-a', status: 'approved' })
      await insertPlugin({ slug: 'plugin-b', status: 'approved' })
      await insertPlugin({ slug: 'plugin-c', status: 'pending' })

      const result = await queryService.listPlugins({ page: 1, limit: 10 })

      expect(result.plugins).toHaveLength(2)
      expect(result.total).toBe(2)
    })

    it('should filter by status', async () => {
      await insertPlugin({ slug: 'pending-1', status: 'pending' })
      await insertPlugin({ slug: 'approved-1', status: 'approved' })

      const result = await queryService.listPlugins({ status: 'pending' })

      expect(result.plugins).toHaveLength(1)
      expect(result.plugins[0].status).toBe('pending')
    })

    it('should filter by featured', async () => {
      await insertPlugin({ slug: 'featured-1', status: 'approved', featured: true })
      await insertPlugin({ slug: 'regular-1', status: 'approved', featured: false })

      const result = await queryService.listPlugins({ featured: true })

      expect(result.plugins).toHaveLength(1)
      expect(result.plugins[0].featured).toBe(true)
    })

    it('should paginate correctly', async () => {
      for (let i = 0; i < 5; i++) {
        await insertPlugin({ slug: `page-plugin-${i}`, status: 'approved' })
      }

      const page1 = await queryService.listPlugins({ page: 1, limit: 2 })
      const page2 = await queryService.listPlugins({ page: 2, limit: 2 })

      expect(page1.plugins).toHaveLength(2)
      expect(page1.page).toBe(1)
      expect(page1.total).toBe(5)
      expect(page2.plugins).toHaveLength(2)
      expect(page2.page).toBe(2)
    })
  })

  describe('searchPlugins', () => {
    it('should search by name', async () => {
      await insertPlugin({ name: 'React Utils', slug: 'react-utils', status: 'approved' })
      await insertPlugin({ name: 'Vue Helper', slug: 'vue-helper', status: 'approved' })

      const result = await queryService.searchPlugins('React')

      expect(result.plugins).toHaveLength(1)
      expect(result.plugins[0].name).toBe('React Utils')
    })

    it('should search by description', async () => {
      await insertPlugin({
        name: 'Tool',
        slug: 'search-tool',
        description: 'A React component library',
        status: 'approved',
      })

      const result = await queryService.searchPlugins('component')

      expect(result.plugins).toHaveLength(1)
    })

    it('should return empty for no matches', async () => {
      await insertPlugin({ slug: 'existing-plugin', status: 'approved' })

      const result = await queryService.searchPlugins('nonexistent-xyz')

      expect(result.plugins).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })

  describe('getPluginBySlug', () => {
    it('should return plugin and increment view count', async () => {
      await insertPlugin({ slug: 'viewed-plugin', viewCount: 0 })

      const plugin = await queryService.getPluginBySlug('viewed-plugin')

      expect(plugin.slug).toBe('viewed-plugin')
      expect(plugin.viewCount).toBe(0)

      const plugin2 = await queryService.getPluginBySlug('viewed-plugin')
      expect(plugin2.viewCount).toBe(1)
    })

    it('should throw NotFoundError for non-existent slug', async () => {
      await expect(queryService.getPluginBySlug('non-existent')).rejects.toThrow(NotFoundError)
    })
  })

  describe('getVersions', () => {
    it('should return empty array for plugin with no versions', async () => {
      const pluginId: string = await insertPlugin({ slug: 'no-versions' })

      const versions = await queryService.getVersions(pluginId)

      expect(versions).toEqual([])
    })
  })

  describe('listCategories', () => {
    it('should return empty when no categories exist', async () => {
      const categories = await queryService.listCategories()
      expect(categories).toEqual([])
    })
  })

  describe('getStats', () => {
    it('should return marketplace stats', async () => {
      await insertPlugin({ slug: 'stats-1', status: 'approved', downloadCount: 10 })
      await insertPlugin({ slug: 'stats-2', status: 'approved', downloadCount: 5 })

      const stats = await queryService.getStats()

      expect(stats.totalPlugins).toBe(2)
      expect(stats.totalDownloads).toBe(15)
      expect(stats.totalDevelopers).toBeGreaterThanOrEqual(1)
    })
  })
})
