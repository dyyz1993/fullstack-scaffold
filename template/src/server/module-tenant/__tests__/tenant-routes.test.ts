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

describe('tenant stats & my membership routes (P2 RBAC UI / P3 口径统一)', () => {
  const authHeaders = { Authorization: 'Bearer test-super-admin-1' }
  const memberHeaders = { Authorization: 'Bearer test-user-2' }
  const strangerHeaders = { Authorization: 'Bearer test-user-3' }

  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  /** 建租户（owner=超管）+ 邀请 test-user-2 为 tenant_member，返回 tenantId */
  async function provisionTenantWithMember(): Promise<string> {
    const owner = createTestClient(undefined, { headers: authHeaders })
    const createRes = await owner.api.tenants.$post({
      json: {
        name: 'Stats Route',
        slug: `stats-route-${Date.now()}`,
        plan: 'pro',
        maxUsers: 10,
        settings: null,
      },
    })
    expect(createRes.status).toBe(201)
    const created = await createRes.json()
    if (!created.success) throw new Error('create tenant failed')
    const tenantId = String(created.data.id)

    const rolesRes = await owner.api.tenants[':tenantId'].roles.$get({ param: { tenantId } })
    const rolesData = await rolesRes.json()
    if (!rolesData.success) throw new Error('roles failed')
    const memberRole = rolesData.data.find((r: { code: string }) => r.code === 'tenant_member')!

    const inviteRes = await owner.api.tenants[':tenantId'].members.invite.$post({
      param: { tenantId },
      json: { email: 'stats-member@example.com', roleId: memberRole.id },
    })
    expect(inviteRes.status).toBe(201)
    const inviteData = await inviteRes.json()
    if (!inviteData.success) throw new Error('invite failed')

    const member = createTestClient(undefined, { headers: memberHeaders })
    const acceptRes = await member.api.tenants.invitations[':token'].accept.$post({
      param: { token: inviteData.data.token },
    })
    expect(acceptRes.status).toBe(200)
    return tenantId
  }

  it('GET /tenants/:tenantId/stats 对 admin 与 member 返回同值（租户级口径）', async () => {
    const tenantId = await provisionTenantWithMember()
    const owner = createTestClient(undefined, { headers: authHeaders })
    const member = createTestClient(undefined, { headers: memberHeaders })

    const adminRes = await owner.api.tenants[':tenantId'].stats.$get({ param: { tenantId } })
    expect(adminRes.status).toBe(200)
    const memberRes = await member.api.tenants[':tenantId'].stats.$get({ param: { tenantId } })
    expect(memberRes.status).toBe(200)

    const adminData = await adminRes.json()
    const memberData = await memberRes.json()
    if (!adminData.success || !memberData.success) throw new Error('stats failed')
    expect(adminData.data.totalUsers).toBe(2)
    expect(memberData.data.totalUsers).toBe(adminData.data.totalUsers)
  })

  it('非成员访问 stats 403', async () => {
    const tenantId = await provisionTenantWithMember()
    const stranger = createTestClient(undefined, { headers: strangerHeaders })
    const res = await stranger.api.tenants[':tenantId'].stats.$get({ param: { tenantId } })
    expect(res.status).toBe(403)
  })

  it('GET /tenants/:tenantId/members/me 返回本人身份与管理员标记', async () => {
    const tenantId = await provisionTenantWithMember()
    const owner = createTestClient(undefined, { headers: authHeaders })
    const member = createTestClient(undefined, { headers: memberHeaders })
    const stranger = createTestClient(undefined, { headers: strangerHeaders })

    const adminMe = await (
      await owner.api.tenants[':tenantId'].members.me.$get({
        param: { tenantId },
      })
    ).json()
    expect(adminMe.success).toBe(true)
    if (adminMe.success) {
      expect(adminMe.data.isTenantAdmin).toBe(true)
      expect(adminMe.data.member?.role?.code).toBe('tenant_admin')
    }

    const memberMe = await (
      await member.api.tenants[':tenantId'].members.me.$get({
        param: { tenantId },
      })
    ).json()
    expect(memberMe.success).toBe(true)
    if (memberMe.success) {
      // tenant_member/tenant_guest 不是管理员——前端据此收敛管理按钮
      expect(memberMe.data.isTenantAdmin).toBe(false)
      expect(memberMe.data.member?.role?.code).toBe('tenant_member')
    }

    const strangerMe = await (
      await stranger.api.tenants[':tenantId'].members.me.$get({
        param: { tenantId },
      })
    ).json()
    expect(strangerMe.success).toBe(true)
    if (strangerMe.success) {
      expect(strangerMe.data.member).toBeNull()
      expect(strangerMe.data.isTenantAdmin).toBe(false)
    }
  })
})

describe('invite email max length (P2：255 字符邮箱前后端均放行落库)', () => {
  const authHeaders = { Authorization: 'Bearer test-super-admin-1' }
  /** 边界内：242 local + '@example.com'(12) = 254 */
  const email254 = `${'a'.repeat(242)}@example.com`
  /** 超限：255 字符（格式合法，此前 .email() 放行落库） */
  const email255 = `${'a'.repeat(243)}@example.com`

  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  async function provisionTenantWithGuestRole(): Promise<{
    tenantId: string
    guestRoleId: string
  }> {
    const client = createTestClient(undefined, { headers: authHeaders })
    const createRes = await client.api.tenants.$post({
      json: {
        name: 'Email Limit',
        slug: `email-limit-${Date.now()}`,
        plan: 'free',
        maxUsers: 5,
        settings: null,
      },
    })
    expect(createRes.status).toBe(201)
    const created = (await createRes.json()) as {
      success: boolean
      data: { id: number }
    }
    if (!created.success) throw new Error('create tenant failed')
    const tenantId = String(created.data.id)

    const rolesRes = await client.api.tenants[':tenantId'].roles.$get({ param: { tenantId } })
    const rolesData = (await rolesRes.json()) as {
      success: boolean
      data: Array<{ id: string; code: string }>
    }
    if (!rolesData.success) throw new Error('roles failed')
    const guestRole = rolesData.data.find(r => r.code === 'tenant_guest')!
    return { tenantId, guestRoleId: guestRole.id }
  }

  it('255 字符邮箱邀请被 400 拒绝，不落库', async () => {
    const { tenantId, guestRoleId } = await provisionTenantWithGuestRole()
    const client = createTestClient(undefined, { headers: authHeaders })

    const res = await client.api.tenants[':tenantId'].members.invite.$post({
      param: { tenantId },
      json: { email: email255, roleId: guestRoleId },
    })
    expect(res.status).toBe(400)
  })

  it('254 字符邮箱（边界值）仍可创建邀请', async () => {
    const { tenantId, guestRoleId } = await provisionTenantWithGuestRole()
    const client = createTestClient(undefined, { headers: authHeaders })

    const res = await client.api.tenants[':tenantId'].members.invite.$post({
      param: { tenantId },
      json: { email: email254, roleId: guestRoleId },
    })
    expect(res.status).toBe(201)
    const data = (await res.json()) as { success: boolean; data: { email: string } }
    if (data.success) {
      expect(data.data.email).toBe(email254)
    }
  })
})
