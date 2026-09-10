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

describe('membership & invitation routes (P1)', () => {
  const authHeaders = { Authorization: 'Bearer test-super-admin-1' }

  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  it('GET /api/tenants/mine 返回当前用户租户', async () => {
    const client = createTestClient(undefined, { headers: authHeaders })
    const res = await client.api.tenants.mine.$get()
    expect(res.status).toBe(200)
    const data = await res.json()
    if (data.success) {
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.data.length).toBeGreaterThanOrEqual(1) // demo 种子 owner
    }
  })

  it('非成员访问租户成员列表 403', async () => {
    const client = createTestClient(undefined, {
      headers: { Authorization: 'Bearer test-user-2' },
    })
    const res = await client.api.tenants[':tenantId'].members.$get({ param: { tenantId: '1' } })
    expect(res.status).toBe(403)
  })

  it('owner 邀请→公开查详情→接受→列表可见→移除', async () => {
    const owner = createTestClient(undefined, { headers: authHeaders })

    // demo 租户（id=1，seed owner=test-super-admin-1）
    const rolesRes = await owner.api.tenants[':tenantId'].roles.$get({ param: { tenantId: '1' } })
    expect(rolesRes.status).toBe(200)
    const rolesData = await rolesRes.json()
    if (!rolesData.success) throw new Error('roles failed')
    const guestRole = rolesData.data.find(r => r.code === 'tenant_guest')!

    const inviteRes = await owner.api.tenants[':tenantId'].members.invite.$post({
      param: { tenantId: '1' },
      json: { email: 'route-newbie@example.com', roleId: guestRole.id },
    })
    expect(inviteRes.status).toBe(201)
    const inviteData = await inviteRes.json()
    if (!inviteData.success) throw new Error('invite failed')
    const token = inviteData.data.token

    // 公开接口（无认证）可查脱敏详情
    const pub = createTestClient(undefined)
    const pubRes = await pub.api.tenants.invitations[':token'].$get({ param: { token } })
    expect(pubRes.status).toBe(200)
    const pubData = await pubRes.json()
    if (pubData.success) {
      expect(pubData.data.tenantSlug).toBe('demo')
      expect(pubData.data.roleLabel).toBe('访客')
      expect(pubData.data).not.toHaveProperty('inviterId')
    }

    // 被邀人接受
    const newbie = createTestClient(undefined, {
      headers: { Authorization: 'Bearer test-user-2' },
    })
    const acceptRes = await newbie.api.tenants.invitations[':token'].accept.$post({
      param: { token },
    })
    expect(acceptRes.status).toBe(200)

    // owner 视角成员列表可见新人
    const membersRes = await owner.api.tenants[':tenantId'].members.$get({
      param: { tenantId: '1' },
    })
    const membersData = await membersRes.json()
    if (membersData.success) {
      const newbieRow = membersData.data.find((m: { userId: string }) => m.userId === 'test-user-2')
      expect(newbieRow).toBeDefined()
      expect(newbieRow!.role?.code).toBe('tenant_guest')
    }

    // 移除后新人 403
    if (membersData.success) {
      const newbieRow = membersData.data.find(
        (m: { userId: string }) => m.userId === 'test-user-2'
      )!
      const delRes = await owner.api.tenants[':tenantId'].members[':memberId'].$delete({
        param: { tenantId: '1', memberId: newbieRow.id },
      })
      expect(delRes.status).toBe(200)
      const denied = await newbie.api.tenants[':tenantId'].members.$get({
        param: { tenantId: '1' },
      })
      expect(denied.status).toBe(403)
    }
  })
})
