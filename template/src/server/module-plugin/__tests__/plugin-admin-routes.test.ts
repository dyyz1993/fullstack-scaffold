import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { createTestClient } from '@server/test-utils/test-client'
import { getRawClient, getDb } from '@server/db'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'

const SUPER_ADMIN = { Authorization: 'Bearer test-super-admin-1' }
const CUSTOMER_SERVICE = { Authorization: 'Bearer test-customer-service-1' }
const NORMAL_USER = { Authorization: 'Bearer test-user-1' }

async function clearPluginTables() {
  const client = await getRawClient()
  if (client && 'execute' in client) {
    await client.execute('DELETE FROM plugin_reviews')
    await client.execute('DELETE FROM plugin_versions')
    await client.execute('DELETE FROM plugin_category_mappings')
    await client.execute('DELETE FROM plugins')
  }
}

async function insertPlugin(slug: string, status: string, name = 'Admin Route Plugin') {
  const client = await getRawClient()
  if (!client || !('execute' in client)) throw new Error('No DB client')
  const now = Date.now()
  await client.execute({
    sql: `INSERT INTO plugins (id, name, slug, description, author_id, author_name, version, status, download_count, view_count, featured, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)`,
    args: [
      `admin-route-${slug}` as string,
      name as string,
      slug as string,
      `${name} desc` as string,
      'author-1' as string,
      'Author' as string,
      '0.0.1' as string,
      status as string,
      now as number,
      now as number,
    ],
  })
}

async function statusOf(slug: string): Promise<string | null> {
  const client = await getRawClient()
  if (!client || !('execute' in client)) throw new Error('No DB client')
  const result = await client.execute({
    sql: 'SELECT status FROM plugins WHERE slug = ?',
    args: [slug as string],
  })
  if (result.rows.length === 0) return null
  return (result.rows[0] as unknown as { status: string }).status
}

describe('Plugin admin routes', () => {
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

  describe('auth guard (SUPER_ADMIN required)', () => {
    it('returns 401 for unauthenticated requests on admin list', async () => {
      const client = createTestClient()
      const res = await client.api.plugins.admin.list.$get({ query: {} })
      expect(res.status).toBe(401)
    })

    it('returns 401 for unauthenticated approve', async () => {
      const client = createTestClient()
      const res = await client.api.plugins[':slug'].approve.$put({ param: { slug: 'x' } })
      expect(res.status).toBe(401)
    })

    it('returns 403 for normal user on approve', async () => {
      const client = createTestClient(undefined, { headers: NORMAL_USER })
      const res = await client.api.plugins[':slug'].approve.$put({ param: { slug: 'x' } })
      expect(res.status).toBe(403)
    })

    it('returns 403 for customer service on reject (非超管不可审核)', async () => {
      await insertPlugin('cs-attempt', 'pending')
      const client = createTestClient(undefined, { headers: CUSTOMER_SERVICE })
      const res = await client.api.plugins[':slug'].reject.$put({
        param: { slug: 'cs-attempt' },
        json: { reason: 'nope' },
      })
      expect(res.status).toBe(403)
      // 状态未被改动
      expect(await statusOf('cs-attempt')).toBe('pending')
    })

    it('returns 403 for normal user on admin delete', async () => {
      await insertPlugin('user-delete-attempt', 'approved')
      const client = createTestClient(undefined, { headers: NORMAL_USER })
      const res = await client.api.plugins.admin[':slug'].$delete({
        param: { slug: 'user-delete-attempt' },
      })
      expect(res.status).toBe(403)
      expect(await statusOf('user-delete-attempt')).toBe('approved')
    })

    it('returns 403 for normal user on admin list', async () => {
      const client = createTestClient(undefined, { headers: NORMAL_USER })
      const res = await client.api.plugins.admin.list.$get({ query: {} })
      expect(res.status).toBe(403)
    })
  })

  describe('GET /plugins/admin/list (list includes pending)', () => {
    it('lists plugins of all statuses including pending for super admin', async () => {
      await insertPlugin('list-pending', 'pending')
      await insertPlugin('list-approved', 'approved')
      await insertPlugin('list-rejected', 'rejected')

      const client = createTestClient(undefined, { headers: SUPER_ADMIN })
      const res = await client.api.plugins.admin.list.$get({ query: {} })
      expect(res.status).toBe(200)

      const data = await res.json()
      if (!data.success) throw new Error('expected success response')
      const slugs = data.data.plugins.map((p: { slug: string }) => p.slug).sort()
      expect(slugs).toEqual(['list-approved', 'list-pending', 'list-rejected'])
      expect(data.data.total).toBe(3)
    })

    it('filters by status=pending', async () => {
      await insertPlugin('f-pending', 'pending')
      await insertPlugin('f-approved', 'approved')

      const client = createTestClient(undefined, { headers: SUPER_ADMIN })
      const res = await client.api.plugins.admin.list.$get({ query: { status: 'pending' } })
      expect(res.status).toBe(200)

      const data = await res.json()
      if (!data.success) throw new Error('expected success response')
      expect(data.data.plugins.map((p: { slug: string }) => p.slug)).toEqual(['f-pending'])
    })
  })

  describe('GET /plugins/admin/pending', () => {
    it('returns only pending plugins and is not shadowed by GET /plugins/{slug}', async () => {
      await insertPlugin('q-pending', 'pending')
      await insertPlugin('q-approved', 'approved')

      const client = createTestClient(undefined, { headers: SUPER_ADMIN })
      const res = await client.api.plugins.admin.pending.$get({ query: {} })
      expect(res.status).toBe(200)

      const data = await res.json()
      if (!data.success) throw new Error('expected success response')
      expect(data.data.plugins.map((p: { slug: string }) => p.slug)).toEqual(['q-pending'])
    })
  })

  describe('status transitions: approve / reject(下架) / re-approve(上架)', () => {
    it('approve transitions pending -> approved', async () => {
      await insertPlugin('flow-a', 'pending')

      const client = createTestClient(undefined, { headers: SUPER_ADMIN })
      const res = await client.api.plugins[':slug'].approve.$put({ param: { slug: 'flow-a' } })
      expect(res.status).toBe(200)

      const data = await res.json()
      if (!data.success) throw new Error('expected success response')
      expect(data.data.status).toBe('approved')
      expect(await statusOf('flow-a')).toBe('approved')
    })

    it('reject transitions approved -> rejected with reason (下架)', async () => {
      await insertPlugin('flow-b', 'approved')

      const client = createTestClient(undefined, { headers: SUPER_ADMIN })
      const res = await client.api.plugins[':slug'].reject.$put({
        param: { slug: 'flow-b' },
        json: { reason: 'policy violation' },
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      if (!data.success) throw new Error('expected success response')
      expect(data.data.status).toBe('rejected')
      expect(data.data.rejectReason).toBe('policy violation')
      expect(await statusOf('flow-b')).toBe('rejected')
    })

    it('re-approve transitions rejected -> approved (重新上架) and clears reason', async () => {
      await insertPlugin('flow-c', 'rejected')

      const client = createTestClient(undefined, { headers: SUPER_ADMIN })
      const res = await client.api.plugins[':slug'].approve.$put({ param: { slug: 'flow-c' } })
      expect(res.status).toBe(200)

      const data = await res.json()
      if (!data.success) throw new Error('expected success response')
      expect(data.data.status).toBe('approved')
      // mapRow 对 null reject_reason 可能省略字段（nullish）
      expect(data.data.rejectReason ?? null).toBeNull()
    })

    it('full lifecycle pending -> approved -> rejected -> approved', async () => {
      await insertPlugin('flow-full', 'pending')
      const client = createTestClient(undefined, { headers: SUPER_ADMIN })

      await client.api.plugins[':slug'].approve.$put({ param: { slug: 'flow-full' } })
      expect(await statusOf('flow-full')).toBe('approved')

      await client.api.plugins[':slug'].reject.$put({
        param: { slug: 'flow-full' },
        json: { reason: 'takedown' },
      })
      expect(await statusOf('flow-full')).toBe('rejected')

      const res = await client.api.plugins[':slug'].approve.$put({ param: { slug: 'flow-full' } })
      expect(res.status).toBe(200)
      expect(await statusOf('flow-full')).toBe('approved')
    })

    it('returns 404 for approve on unknown slug', async () => {
      const client = createTestClient(undefined, { headers: SUPER_ADMIN })
      const res = await client.api.plugins[':slug'].approve.$put({ param: { slug: 'ghost' } })
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /plugins/admin/{slug}', () => {
    it('removes a plugin for super admin', async () => {
      await insertPlugin('delete-me', 'approved')

      const client = createTestClient(undefined, { headers: SUPER_ADMIN })
      const res = await client.api.plugins.admin[':slug'].$delete({
        param: { slug: 'delete-me' },
      })
      expect(res.status).toBe(200)
      expect(await statusOf('delete-me')).toBeNull()
    })

    it('returns 404 for unknown slug', async () => {
      const client = createTestClient(undefined, { headers: SUPER_ADMIN })
      const res = await client.api.plugins.admin[':slug'].$delete({ param: { slug: 'ghost' } })
      expect(res.status).toBe(404)
    })
  })

  describe('GET /categories/admin', () => {
    it('is reachable for super admin (not shadowed by public GET /categories)', async () => {
      const client = createTestClient(undefined, { headers: SUPER_ADMIN })
      const res = await client.api.categories.admin.$get()
      expect(res.status).toBe(200)

      const data = await res.json()
      if (!data.success) throw new Error('expected success response')
      expect(Array.isArray(data.data)).toBe(true)
    })

    it('returns 403 for normal user', async () => {
      const client = createTestClient(undefined, { headers: NORMAL_USER })
      const res = await client.api.categories.admin.$get()
      expect(res.status).toBe(403)
    })
  })
})
