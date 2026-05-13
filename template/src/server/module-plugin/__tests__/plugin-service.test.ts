import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import * as pluginService from '../services/plugin-service'
import { getRawClient, getDb } from '@server/db'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'
import { NotFoundError, AuthorizationError, ConflictError } from '@server/utils/app-error'

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

  const id = overrides.id ?? 'test-plugin-id'
  const now = Date.now()
  await client.execute({
    sql: `INSERT INTO plugins (id, name, slug, description, author_id, author_name, version, status, download_count, view_count, featured, created_at, updated_at, tags, site_urls, commands)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id as string,
      (overrides.name ?? 'Test Plugin') as string,
      (overrides.slug ?? 'test-plugin') as string,
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
      (overrides.tags ?? null) as string | null,
      (overrides.siteUrls ?? null) as string | null,
      (overrides.commands ?? null) as string | null,
    ],
  })
  return id
}

describe('Plugin Service', () => {
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

  describe('createPlugin', () => {
    it('should create a plugin with status pending', async () => {
      const result = await pluginService.createPlugin({
        name: 'My Plugin',
        slug: 'my-plugin',
        description: 'A great plugin',
        authorId: 'user-1',
        authorName: 'Developer',
      })

      expect(result.id).toBeDefined()
      expect(result.name).toBe('My Plugin')
      expect(result.slug).toBe('my-plugin')
      expect(result.status).toBe('pending')
      expect(result.version).toBe('0.0.1')
      expect(result.downloadCount).toBe(0)
      expect(result.viewCount).toBe(0)
      expect(result.featured).toBe(false)
      expect(result.authorId).toBe('user-1')
      expect(result.authorName).toBe('Developer')
    })

    it('should create a plugin with optional fields', async () => {
      const result = await pluginService.createPlugin({
        name: 'Full Plugin',
        slug: 'full-plugin',
        description: 'Plugin with all fields',
        authorId: 'user-1',
        authorName: 'Developer',
        repositoryUrl: 'https://github.com/test/plugin',
        homepageUrl: 'https://plugin.dev',
        npmPackage: '@test/plugin',
        license: 'MIT',
        tags: ['utility', 'tools'],
        siteUrls: ['https://example.com'],
        commands: [{ name: 'init', description: 'Initialize' }],
      })

      expect(result.repositoryUrl).toBe('https://github.com/test/plugin')
      expect(result.homepageUrl).toBe('https://plugin.dev')
      expect(result.npmPackage).toBe('@test/plugin')
      expect(result.license).toBe('MIT')
      expect(result.tags).toEqual(['utility', 'tools'])
      expect(result.siteUrls).toEqual(['https://example.com'])
      expect(result.commands).toEqual([{ name: 'init', description: 'Initialize' }])
    })

    it('should throw ConflictError for duplicate slug', async () => {
      await pluginService.createPlugin({
        name: 'Plugin 1',
        slug: 'duplicate-slug',
        description: 'First',
        authorId: 'user-1',
        authorName: 'Dev',
      })

      await expect(
        pluginService.createPlugin({
          name: 'Plugin 2',
          slug: 'duplicate-slug',
          description: 'Second',
          authorId: 'user-2',
          authorName: 'Dev2',
        })
      ).rejects.toThrow(ConflictError)
    })
  })

  describe('updatePlugin', () => {
    it('should update plugin fields', async () => {
      await insertTestPlugin({ slug: 'updatable-plugin', authorId: 'user-1' })

      const result = await pluginService.updatePlugin(
        'updatable-plugin',
        {
          name: 'Updated Name',
          description: 'Updated desc',
        },
        'user-1'
      )

      expect(result.name).toBe('Updated Name')
      expect(result.description).toBe('Updated desc')
    })

    it('should throw NotFoundError for non-existent slug', async () => {
      await expect(
        pluginService.updatePlugin('non-existent', { name: 'X' }, 'user-1')
      ).rejects.toThrow(NotFoundError)
    })

    it('should throw AuthorizationError for non-author', async () => {
      await insertTestPlugin({ slug: 'auth-plugin', authorId: 'user-1' })

      await expect(
        pluginService.updatePlugin('auth-plugin', { name: 'X' }, 'user-2')
      ).rejects.toThrow(AuthorizationError)
    })

    it('should update JSON fields', async () => {
      await insertTestPlugin({ slug: 'json-plugin', authorId: 'user-1' })

      const result = await pluginService.updatePlugin(
        'json-plugin',
        {
          tags: ['new-tag'],
          siteUrls: ['https://new-site.com'],
        },
        'user-1'
      )

      expect(result.tags).toEqual(['new-tag'])
      expect(result.siteUrls).toEqual(['https://new-site.com'])
    })
  })

  describe('deletePlugin', () => {
    it('should delete a plugin', async () => {
      await insertTestPlugin({ slug: 'deletable-plugin', authorId: 'user-1' })

      await pluginService.deletePlugin('deletable-plugin', 'user-1')

      const client = await getRawClient()
      if (client && 'execute' in client) {
        const result = await client.execute('SELECT * FROM plugins WHERE slug = ?', [
          'deletable-plugin',
        ])
        expect(result.rows.length).toBe(0)
      }
    })

    it('should throw NotFoundError for non-existent slug', async () => {
      await expect(pluginService.deletePlugin('non-existent', 'user-1')).rejects.toThrow(
        NotFoundError
      )
    })

    it('should throw AuthorizationError for non-author', async () => {
      await insertTestPlugin({ slug: 'auth-delete-plugin', authorId: 'user-1' })

      await expect(pluginService.deletePlugin('auth-delete-plugin', 'user-2')).rejects.toThrow(
        AuthorizationError
      )
    })
  })

  describe('trackInstall', () => {
    it('should increment download count', async () => {
      await insertTestPlugin({ slug: 'install-plugin', downloadCount: 5 })

      await pluginService.trackInstall('install-plugin')

      const client = await getRawClient()
      if (client && 'execute' in client) {
        const result = await client.execute('SELECT download_count FROM plugins WHERE slug = ?', [
          'install-plugin',
        ])
        const row = result.rows[0] as unknown as { download_count: number }
        expect(row.download_count).toBe(6)
      }
    })

    it('should throw NotFoundError for non-existent slug', async () => {
      await expect(pluginService.trackInstall('non-existent')).rejects.toThrow(NotFoundError)
    })
  })
})
