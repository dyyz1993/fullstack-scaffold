import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'
import {
  listTenants,
  getTenantById,
  getTenantBySlug,
  createTenant,
  updateTenant,
  deleteTenant,
  getTenantRoles,
  createTenantRole,
  getTenantMembers,
  getUserTenants,
  getUserTenantPermissions,
  hasTenantPermission,
  requireTenantMembership,
  inviteMember,
  getInvitationByToken,
  acceptInvitation,
  removeMember,
} from '../services/tenant-service'
import { TenantPermission } from '@shared/schemas'
import type { CreateTenantInput } from '@shared/schemas'

describe('Tenant Service', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  describe('listTenants', () => {
    it('should return paginated list', async () => {
      const result = await listTenants(1, 20)
      expect(result).toHaveProperty('items')
      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('page', 1)
      expect(result).toHaveProperty('pageSize', 20)
      expect(Array.isArray(result.items)).toBe(true)
    })

    it('should filter by status', async () => {
      const result = await listTenants(1, 20, { status: 'active' })
      for (const item of result.items) {
        expect(item.status).toBe('active')
      }
    })

    it('should filter by plan', async () => {
      const result = await listTenants(1, 20, { plan: 'pro' })
      for (const item of result.items) {
        expect(item.plan).toBe('pro')
      }
    })
  })

  describe('getTenantById', () => {
    it('should return null for non-existent id', async () => {
      const result = await getTenantById(99999)
      expect(result).toBeNull()
    })

    it('should return tenant for valid id', async () => {
      const list = await listTenants(1, 1)
      if (list.items.length > 0) {
        const tenant = await getTenantById(list.items[0].id)
        expect(tenant).not.toBeNull()
        expect(tenant!.id).toBe(list.items[0].id)
        expect(tenant).toHaveProperty('name')
        expect(tenant).toHaveProperty('slug')
      }
    })
  })

  describe('getTenantBySlug', () => {
    it('should return null for non-existent slug', async () => {
      const result = await getTenantBySlug('non-existent-slug')
      expect(result).toBeNull()
    })

    it('should return tenant by slug', async () => {
      const result = await getTenantBySlug('demo')
      expect(result).not.toBeNull()
      expect(result!.slug).toBe('demo')
    })
  })

  describe('createTenant', () => {
    it('should create a tenant with defaults', async () => {
      const input: CreateTenantInput = {
        name: 'New Corp',
        slug: 'new-corp',
        plan: 'free',
        maxUsers: 5,
        settings: null,
      }
      const result = await createTenant(input, 'test-super-admin-1')
      expect(result.name).toBe('New Corp')
      expect(result.slug).toBe('new-corp')
      expect(result.status).toBe('trial')
      expect(result.plan).toBe('free')
    })

    it('should reject duplicate slug', async () => {
      await expect(
        createTenant(
          {
            name: 'Duplicate',
            slug: 'demo',
            plan: 'free',
            maxUsers: 5,
            settings: null,
          },
          'test-super-admin-1'
        )
      ).rejects.toThrow(/already exists/)
    })
  })

  describe('updateTenant', () => {
    it('should return null for non-existent id', async () => {
      const result = await updateTenant(99999, { name: 'Updated' })
      expect(result).toBeNull()
    })

    it('should update tenant fields', async () => {
      // Create a tenant to update
      const created = await createTenant(
        {
          name: 'Update Test',
          slug: 'update-test',
          plan: 'free',
          maxUsers: 5,
          settings: null,
        },
        'test-super-admin-1'
      )

      const result = await updateTenant(created.id, { name: 'Updated Name' })
      expect(result).not.toBeNull()
      expect(result!.name).toBe('Updated Name')
    })
  })

  describe('deleteTenant', () => {
    it('should return false for non-existent id', async () => {
      const result = await deleteTenant(99999)
      expect(result).toBe(false)
    })

    it('should delete and return true', async () => {
      const created = await createTenant(
        {
          name: 'Delete Test',
          slug: 'delete-test',
          plan: 'free',
          maxUsers: 5,
          settings: null,
        },
        'test-super-admin-1'
      )

      const result = await deleteTenant(created.id)
      expect(result).toBe(true)

      // Verify deleted
      const found = await getTenantById(created.id)
      expect(found).toBeNull()
    })
  })
})

describe('provisioning & membership (P1)', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  it('createTenant 事务播种 3 个系统角色 + owner 为租户管理员', async () => {
    const tenant = await createTenant(
      { name: '开通验证', slug: 'prov-check', plan: 'pro', maxUsers: 20, settings: {} },
      'test-super-admin-1'
    )
    const roles = await getTenantRoles(tenant.id)
    expect(roles.length).toBe(3)
    expect(roles.map(r => r.code).sort()).toEqual(['tenant_admin', 'tenant_guest', 'tenant_member'])
    expect(roles.every(r => r.isSystem)).toBe(true)

    const members = await getTenantMembers(tenant.id)
    expect(members.length).toBe(1)
    expect(members[0].userId).toBe('test-super-admin-1')
    expect(members[0].role?.code).toBe('tenant_admin')
    expect(members[0].status).toBe('active')
  })

  it('owner 拥有全部租户权限，陌生人无任何权限', async () => {
    const tenant = await createTenant(
      { name: '权限验证', slug: 'perm-check', plan: 'free', maxUsers: 5, settings: {} },
      'test-super-admin-1'
    )
    const ownerPerms = await getUserTenantPermissions('test-super-admin-1', tenant.id)
    expect(ownerPerms.length).toBeGreaterThan(10)
    expect(
      await hasTenantPermission('test-super-admin-1', tenant.id, TenantPermission.MEMBER_INVITE)
    ).toBe(true)
    expect(await hasTenantPermission('test-user-2', tenant.id, TenantPermission.DATA_VIEW)).toBe(
      false
    )
    await expect(requireTenantMembership('test-user-2', tenant.id)).rejects.toThrow()
  })

  it('邀请→接受→成员可见→移除后失权 全链路', async () => {
    const tenant = await createTenant(
      { name: '邀请验证', slug: 'invite-check', plan: 'free', maxUsers: 5, settings: {} },
      'test-super-admin-1'
    )
    const guestRole = (await getTenantRoles(tenant.id)).find(r => r.code === 'tenant_guest')!

    const invitation = await inviteMember(
      tenant.id,
      'newbie@example.com',
      guestRole.id,
      'test-super-admin-1'
    )
    expect(invitation.status).toBe('pending')
    expect(invitation.token.length).toBeGreaterThanOrEqual(32)

    // 公开详情可查（带租户名/角色名）
    const detail = await getInvitationByToken(invitation.token)
    expect(detail?.tenantName).toBe('邀请验证')
    expect(detail?.roleLabel).toBe('访客')

    // 陌生用户接受邀请后成为 guest
    const member = await acceptInvitation(invitation.token, 'test-user-2')
    expect(member?.status).toBe('active')
    expect(await hasTenantPermission('test-user-2', tenant.id, TenantPermission.DATA_VIEW)).toBe(
      true
    )
    expect(
      await hasTenantPermission('test-user-2', tenant.id, TenantPermission.MEMBER_INVITE)
    ).toBe(false)

    // 二次接受同一 token 失效
    const again = await acceptInvitation(invitation.token, 'test-user-3')
    expect(again).toBeNull()

    // 移除后立即失权
    await removeMember(tenant.id, member!.id)
    expect(await hasTenantPermission('test-user-2', tenant.id, TenantPermission.DATA_VIEW)).toBe(
      false
    )
    await expect(requireTenantMembership('test-user-2', tenant.id)).rejects.toThrow()
  })

  it('套餐角色数配额：free 上限 3，创建第 4 个被拦截', async () => {
    const tenant = await createTenant(
      { name: '配额验证', slug: 'quota-check', plan: 'free', maxUsers: 5, settings: {} },
      'test-super-admin-1'
    )
    // 3 个系统角色已占满 free 上限
    await expect(
      createTenantRole(tenant.id, {
        code: 'custom-a',
        name: 'custom-a',
        label: '自定义A',
        description: null,
        permissions: [TenantPermission.DATA_VIEW],
      })
    ).rejects.toThrow(/上限/)

    // 升级 pro 后可继续创建
    await updateTenant(tenant.id, { plan: 'pro' })
    const role = await createTenantRole(tenant.id, {
      code: 'custom-a',
      name: 'custom-a',
      label: '自定义A',
      description: null,
      permissions: [TenantPermission.DATA_VIEW],
    })
    expect(role.isSystem).toBe(false)
  })

  it('getUserTenants 只返回本人 active 成员的租户', async () => {
    const mine = await getUserTenants('test-super-admin-1')
    expect(mine.length).toBeGreaterThanOrEqual(2) // demo 种子 + 本组新建
    expect(mine.every(t => t.slug)).toBe(true)
    expect((await getUserTenants('test-user-2')).length).toBe(0)
  })
})
