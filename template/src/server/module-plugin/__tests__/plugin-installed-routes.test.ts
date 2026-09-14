import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { createTestClient } from '@server/test-utils/test-client'
import { getRawClient, getDb } from '@server/db'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'

const AUTH = { Authorization: 'Bearer test-user-42' }

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

async function insertApprovedPlugin(slug: string, name = 'Route Plugin') {
  const client = await getRawClient()
  if (!client || !('execute' in client)) throw new Error('No DB client')
  const id = `route-${slug}`
  const now = Date.now()
  await client.execute({
    sql: `INSERT INTO plugins (id, name, slug, description, author_id, author_name, version, status, download_count, view_count, featured, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', 0, 0, 0, ?, ?)`,
    args: [
      id as string,
      name as string,
      slug as string,
      `${name} desc` as string,
      'author-1' as string,
      'Author' as string,
      '0.0.1' as string,
      now as number,
      now as number,
    ],
  })
  return id as string
}

async function countInstalls(slug: string, userId: string): Promise<number> {
  const client = await getRawClient()
  if (!client || !('execute' in client)) throw new Error('No DB client')
  const result = await client.execute({
    sql: 'SELECT COUNT(*) as n FROM plugin_installs pi JOIN plugins p ON pi.plugin_id = p.id WHERE p.slug = ? AND pi.user_id = ?',
    args: [slug as string, userId as string],
  })
  return (result.rows[0] as unknown as { n: number }).n
}

async function downloadCountOf(slug: string): Promise<number> {
  const client = await getRawClient()
  if (!client || !('execute' in client)) throw new Error('No DB client')
  const result = await client.execute({
    sql: 'SELECT download_count as n FROM plugins WHERE slug = ?',
    args: [slug as string],
  })
  return (result.rows[0] as unknown as { n: number }).n
}

describe('Plugin installed routes', () => {
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

  it('GET /plugins/installed is matched before /plugins/{slug} (401 for guests, not a slug lookup)', async () => {
    const client = createTestClient()
    // 若被 /plugins/{slug} 遮蔽，会走 getBySlug（无鉴权，返回 200/404 的"Plugin not found"）；
    // 命中 installed 路由则被 authMiddleware 拦为 401
    const res = await client.api.plugins.installed.$get()
    expect(res.status).toBe(401)
  })

  it('POST install records installs for the signed-in user, guests only bump the counter, and GET lists them', async () => {
    await insertApprovedPlugin('alpha', 'Alpha')
    await insertApprovedPlugin('beta', 'Beta')
    await insertApprovedPlugin('gamma', 'Gamma')

    const authed = createTestClient(undefined, { headers: AUTH })
    const guest = createTestClient()

    // 登录用户安装两个
    const r1 = await authed.api.plugins[':slug'].install.$post({ param: { slug: 'alpha' } })
    expect(r1.status).toBe(200)
    const r2 = await authed.api.plugins[':slug'].install.$post({ param: { slug: 'beta' } })
    expect(r2.status).toBe(200)
    // 游客安装 gamma：仅计数，不落安装行
    const r3 = await guest.api.plugins[':slug'].install.$post({ param: { slug: 'gamma' } })
    expect(r3.status).toBe(200)

    expect(await countInstalls('alpha', 'test-user-42')).toBe(1)
    expect(await countInstalls('beta', 'test-user-42')).toBe(1)
    expect(await countInstalls('gamma', 'test-user-42')).toBe(0)
    // 游客安装仍累加下载计数
    expect(await downloadCountOf('gamma')).toBe(1)

    const list = await authed.api.plugins.installed.$get()
    expect(list.status).toBe(200)
    const listData = await list.json()
    if (!listData.success) throw new Error('expected success response')
    expect(listData.data.map((p: { slug: string }) => p.slug).sort()).toEqual(['alpha', 'beta'])
    for (const item of listData.data) {
      expect(item.installedAt).toBeGreaterThan(0)
    }
  })

  it('DELETE /plugins/installed/{slug} uninstalls and 404s unknown slugs', async () => {
    await insertApprovedPlugin('removable', 'Removable')
    const authed = createTestClient(undefined, { headers: AUTH })

    const install = await authed.api.plugins[':slug'].install.$post({
      param: { slug: 'removable' },
    })
    expect(install.status).toBe(200)
    expect(await countInstalls('removable', 'test-user-42')).toBe(1)

    const del = await authed.api.plugins.installed[':slug'].$delete({
      param: { slug: 'removable' },
    })
    expect(del.status).toBe(200)
    expect(await countInstalls('removable', 'test-user-42')).toBe(0)

    const missing = await authed.api.plugins.installed[':slug'].$delete({
      param: { slug: 'no-such-plugin' },
    })
    expect(missing.status).toBe(404)
  })
})
