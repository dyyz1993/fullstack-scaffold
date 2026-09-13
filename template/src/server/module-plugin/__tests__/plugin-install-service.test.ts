import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import * as pluginService from '../services/plugin-service'
import * as queryService from '../services/plugin-query-service'
import { getRawClient, getDb } from '@server/db'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'
import { NotFoundError } from '@server/utils/app-error'

async function clearPluginTables() {
  const client = await getRawClient()
  if (client && 'execute' in client) {
    await client.execute('DELETE FROM plugin_installs')
    await client.execute('DELETE FROM plugin_reviews')
    await client.execute('DELETE FROM plugin_versions')
    await client.execute('DELETE FROM plugin_category_mappings')
    await client.execute('DELETE FROM plugins')
  }
}

async function insertTestPlugin(overrides: Record<string, unknown> = {}) {
  const client = await getRawClient()
  if (!client || !('execute' in client)) throw new Error('No DB client')

  const id = overrides.id ?? 'test-plugin-id'
  const now = Date.now()
  await client.execute({
    sql: `INSERT INTO plugins (id, name, slug, description, author_id, author_name, version, status, download_count, view_count, featured, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id as string,
      (overrides.name ?? 'Test Plugin') as string,
      (overrides.slug ?? 'test-plugin') as string,
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
  return id as string
}

async function countInstalls(pluginId: string, userId?: string): Promise<number> {
  const client = await getRawClient()
  if (!client || !('execute' in client)) throw new Error('No DB client')
  const sqlStr = userId
    ? 'SELECT COUNT(*) as n FROM plugin_installs WHERE plugin_id = ? AND user_id = ?'
    : 'SELECT COUNT(*) as n FROM plugin_installs WHERE plugin_id = ?'
  const args = userId ? [pluginId, userId] : [pluginId]
  const result = await client.execute({ sql: sqlStr, args })
  return (result.rows[0] as unknown as { n: number }).n
}

describe('Plugin Install Service', () => {
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

  describe('trackInstall with user', () => {
    it('should record an install row for a logged-in user with second-based created_at', async () => {
      const pluginId = await insertTestPlugin({ slug: 'install-record-plugin' })

      const beforeSeconds = Math.floor(Date.now() / 1000)
      await pluginService.trackInstall('install-record-plugin', 'user-42')
      const afterSeconds = Math.floor(Date.now() / 1000)

      expect(await countInstalls(pluginId, 'user-42')).toBe(1)

      const client = await getRawClient()
      if (client && 'execute' in client) {
        const result = await client.execute({
          sql: 'SELECT created_at FROM plugin_installs WHERE plugin_id = ? AND user_id = ?',
          args: [pluginId, 'user-42'],
        })
        const row = result.rows[0] as unknown as { created_at: number }
        // unixepoch() 秒语义默认：必须是秒级时间戳，严禁毫秒（58670 年坑）
        expect(row.created_at).toBeGreaterThanOrEqual(beforeSeconds)
        expect(row.created_at).toBeLessThanOrEqual(afterSeconds)
      }
    })

    it('should ignore duplicate installs for the same user and plugin', async () => {
      const pluginId = await insertTestPlugin({ slug: 'dedupe-plugin' })

      await pluginService.trackInstall('dedupe-plugin', 'user-42')
      await pluginService.trackInstall('dedupe-plugin', 'user-42')

      expect(await countInstalls(pluginId, 'user-42')).toBe(1)
    })

    it('should not record an install row for anonymous installs', async () => {
      const pluginId = await insertTestPlugin({ slug: 'anonymous-plugin', downloadCount: 2 })

      await pluginService.trackInstall('anonymous-plugin')

      expect(await countInstalls(pluginId)).toBe(0)

      const client = await getRawClient()
      if (client && 'execute' in client) {
        const result = await client.execute('SELECT download_count FROM plugins WHERE slug = ?', [
          'anonymous-plugin',
        ])
        const row = result.rows[0] as unknown as { download_count: number }
        expect(row.download_count).toBe(3)
      }
    })

    it('should throw NotFoundError for non-existent slug', async () => {
      await expect(pluginService.trackInstall('non-existent', 'user-42')).rejects.toThrow(
        NotFoundError
      )
    })
  })

  describe('listInstalledPlugins', () => {
    it('should return installed plugins joined with plugin data for the user', async () => {
      await insertTestPlugin({ id: 'plugin-a', slug: 'plugin-a', name: 'Plugin A' })
      await insertTestPlugin({ id: 'plugin-b', slug: 'plugin-b', name: 'Plugin B' })
      await insertTestPlugin({ id: 'plugin-c', slug: 'plugin-c', name: 'Plugin C' })

      await pluginService.trackInstall('plugin-a', 'user-42')
      await pluginService.trackInstall('plugin-b', 'user-42')
      // 其他用户的安装不应出现在 user-42 的列表中
      await pluginService.trackInstall('plugin-c', 'user-7')

      const installed = await queryService.listInstalledPlugins('user-42')

      expect(installed).toHaveLength(2)
      const slugs = installed.map(p => p.slug).sort()
      expect(slugs).toEqual(['plugin-a', 'plugin-b'])
      for (const item of installed) {
        expect(item.name).toBeDefined()
        expect(item.version).toBeDefined()
        // installedAt 是服务端安装时间（毫秒表示，来自秒级时间戳）
        expect(item.installedAt).toBeGreaterThan(0)
        expect(item.installedAt).toBeLessThan(10_000_000_000_000)
      }
    })

    it('should return an empty list for a user with no installs', async () => {
      const installed = await queryService.listInstalledPlugins('user-nobody')
      expect(installed).toEqual([])
    })
  })

  describe('uninstallPlugin', () => {
    it('should delete the install row and keep other users installs', async () => {
      const pluginId = await insertTestPlugin({ slug: 'uninstall-plugin' })

      await pluginService.trackInstall('uninstall-plugin', 'user-42')
      await pluginService.trackInstall('uninstall-plugin', 'user-7')

      await pluginService.uninstallPlugin('uninstall-plugin', 'user-42')

      expect(await countInstalls(pluginId, 'user-42')).toBe(0)
      expect(await countInstalls(pluginId, 'user-7')).toBe(1)

      const installed = await queryService.listInstalledPlugins('user-42')
      expect(installed).toEqual([])
    })

    it('should be idempotent when nothing is installed', async () => {
      await insertTestPlugin({ slug: 'never-installed' })
      await expect(
        pluginService.uninstallPlugin('never-installed', 'user-42')
      ).resolves.toBeUndefined()
    })

    it('should throw NotFoundError for non-existent slug', async () => {
      await expect(pluginService.uninstallPlugin('non-existent', 'user-42')).rejects.toThrow(
        NotFoundError
      )
    })
  })
})
