import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { seedPluginsIfEmpty } from '../services/plugin-seed-service'
import { getRawClient, getDb } from '@server/db'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'

async function clearPluginTables() {
  const client = await getRawClient()
  if (client && 'execute' in client) {
    await client.execute('DELETE FROM plugin_category_mappings')
    await client.execute('DELETE FROM plugin_reviews')
    await client.execute('DELETE FROM plugin_versions')
    await client.execute('DELETE FROM plugins')
    await client.execute('DELETE FROM plugin_categories')
  }
}

describe('Plugin Seed Service', () => {
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

  describe('seedPluginsIfEmpty', () => {
    it('should seed sample data when database is empty', async () => {
      await seedPluginsIfEmpty()

      const client = await getRawClient()
      if (client && 'execute' in client) {
        const pluginResult = await client.execute('SELECT COUNT(*) as count FROM plugins')
        const pluginCount = (pluginResult.rows[0] as unknown as { count: number })?.count ?? 0
        expect(pluginCount).toBeGreaterThan(0)

        const categoryResult = await client.execute('SELECT COUNT(*) as count FROM plugin_categories')
        const categoryCount = (categoryResult.rows[0] as unknown as { count: number })?.count ?? 0
        expect(categoryCount).toBeGreaterThan(0)

        const versionResult = await client.execute('SELECT COUNT(*) as count FROM plugin_versions')
        const versionCount = (versionResult.rows[0] as unknown as { count: number })?.count ?? 0
        expect(versionCount).toBeGreaterThan(0)

        const mappingResult = await client.execute(
          'SELECT COUNT(*) as count FROM plugin_category_mappings'
        )
        const mappingCount = (mappingResult.rows[0] as unknown as { count: number })?.count ?? 0
        expect(mappingCount).toBeGreaterThan(0)
      }
    })

    it('should not seed when plugins already exist', async () => {
      const client = await getRawClient()
      if (client && 'execute' in client) {
        await client.execute({
          sql: `INSERT INTO plugins (id, name, slug, description, author_id, author_name, version, status, download_count, view_count, featured, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            'existing-plugin',
            'Existing',
            'existing-plugin',
            'Already here',
            'user-1',
            'Dev',
            '1.0.0',
            'approved',
            0,
            0,
            0,
            Date.now(),
            Date.now(),
          ],
        })
      }

      await seedPluginsIfEmpty()

      if (client && 'execute' in client) {
        const result = await client.execute('SELECT COUNT(*) as count FROM plugins')
        const count = (result.rows[0] as unknown as { count: number })?.count ?? 0
        expect(count).toBe(1)
      }
    })

    it('should seed correct number of sample plugins', async () => {
      await seedPluginsIfEmpty()

      const client = await getRawClient()
      if (client && 'execute' in client) {
        const result = await client.execute('SELECT COUNT(*) as count FROM plugins')
        const count = (result.rows[0] as unknown as { count: number })?.count ?? 0
        expect(count).toBe(25)
      }
    })

    it('should seed correct number of categories', async () => {
      await seedPluginsIfEmpty()

      const client = await getRawClient()
      if (client && 'execute' in client) {
        const result = await client.execute('SELECT COUNT(*) as count FROM plugin_categories')
        const count = (result.rows[0] as unknown as { count: number })?.count ?? 0
        expect(count).toBe(5)
      }
    })

    it('should include both approved and pending plugins', async () => {
      await seedPluginsIfEmpty()

      const client = await getRawClient()
      if (client && 'execute' in client) {
        const approved = await client.execute(
          "SELECT COUNT(*) as count FROM plugins WHERE status = 'approved'"
        )
        const pending = await client.execute(
          "SELECT COUNT(*) as count FROM plugins WHERE status = 'pending'"
        )

        const approvedCount = (approved.rows[0] as unknown as { count: number })?.count ?? 0
        const pendingCount = (pending.rows[0] as unknown as { count: number })?.count ?? 0

        expect(approvedCount).toBeGreaterThan(0)
        expect(pendingCount).toBeGreaterThan(0)
      }
    })

    it('should include featured and non-featured plugins', async () => {
      await seedPluginsIfEmpty()

      const client = await getRawClient()
      if (client && 'execute' in client) {
        const featured = await client.execute(
          'SELECT COUNT(*) as count FROM plugins WHERE featured = 1'
        )
        const nonFeatured = await client.execute(
          'SELECT COUNT(*) as count FROM plugins WHERE featured = 0'
        )

        const featuredCount = (featured.rows[0] as unknown as { count: number })?.count ?? 0
        const nonFeaturedCount = (nonFeatured.rows[0] as unknown as { count: number })?.count ?? 0

        expect(featuredCount).toBeGreaterThan(0)
        expect(nonFeaturedCount).toBeGreaterThan(0)
      }
    })

    it('should be idempotent — second call does not add more data', async () => {
      await seedPluginsIfEmpty()
      await seedPluginsIfEmpty()

      const client = await getRawClient()
      if (client && 'execute' in client) {
        const result = await client.execute('SELECT COUNT(*) as count FROM plugins')
        const count = (result.rows[0] as unknown as { count: number })?.count ?? 0
        expect(count).toBe(25)
      }
    })
  })
})
