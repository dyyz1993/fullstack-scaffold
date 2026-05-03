import { describe, it, expect, beforeAll } from 'vitest'
import { TenantService } from '../services/tenant-service'
import { setupTestDatabase } from '../../db/test-setup'
import { TenantPermission } from '@platform/shared/permission/tenant-permissions'
import { TenantRoleCode } from '@platform/shared/permission/tenant-role-templates'

describe('TenantService', () => {
  let service: TenantService

  beforeAll(async () => {
    process.env.SQLITE_PATH = './data/test.db'
    await setupTestDatabase()
    service = new TenantService()
  })

  describe('createTenant', () => {
    it('should create a tenant with default free plan', async () => {
      const tenant = await service.createTenant({
        name: 'Test Company',
        slug: 'test-company-' + Date.now(),
        ownerId: 'user_001',
      })

      expect(tenant).toBeDefined()
      expect(tenant.name).toBe('Test Company')
      expect(tenant.plan).toBe('free')
      expect(tenant.status).toBe('active')
      expect(tenant.ownerId).toBe('user_001')
    })

    it('should create system roles for the tenant', async () => {
      const tenant = await service.createTenant({
        name: 'Role Test Corp',
        slug: 'role-test-' + Date.now(),
        ownerId: 'user_002',
      })

      const roles = await service.getTenantRoles(tenant.id)

      expect(roles).toHaveLength(3)
      const codes = roles.map(r => r.code)
      expect(codes).toContain(TenantRoleCode.ADMIN)
      expect(codes).toContain(TenantRoleCode.MEMBER)
      expect(codes).toContain(TenantRoleCode.GUEST)
    })

    it('should auto-add owner as admin member', async () => {
      const tenant = await service.createTenant({
        name: 'Member Test Corp',
        slug: 'member-test-' + Date.now(),
        ownerId: 'user_003',
      })

      const members = await service.getTenantMembers(tenant.id)

      expect(members).toHaveLength(1)
      expect(members[0]!.userId).toBe('user_003')
      expect(members[0]!.status).toBe('active')
      expect(members[0]!.role.code).toBe(TenantRoleCode.ADMIN)
    })

    it('should allow owner to appear in getUserTenants', async () => {
      const tenant = await service.createTenant({
        name: 'List Test Corp',
        slug: 'list-test-' + Date.now(),
        ownerId: 'user_004',
      })

      const userTenants = await service.getUserTenants('user_004')

      expect(userTenants.length).toBeGreaterThanOrEqual(1)
      const found = userTenants.find(t => t.id === tenant.id)
      expect(found).toBeDefined()
      expect(found!.name).toBe('List Test Corp')
    })

    it('should create tenant with specified plan', async () => {
      const tenant = await service.createTenant({
        name: 'Pro Corp',
        slug: 'pro-corp-' + Date.now(),
        ownerId: 'user_005',
        plan: 'pro',
      })

      expect(tenant.plan).toBe('pro')
    })
  })

  describe('getUserTenants', () => {
    it('should return empty array for user with no tenants', async () => {
      const tenants = await service.getUserTenants('nonexistent_user_xyz')
      expect(tenants).toEqual([])
    })

    it('should return tenants where user is an active member', async () => {
      const slug = 'query-corp-' + Date.now()
      const tenant = await service.createTenant({
        name: 'Query Corp',
        slug,
        ownerId: 'user_010',
      })

      const tenants = await service.getUserTenants('user_010')

      expect(tenants.length).toBeGreaterThanOrEqual(1)
      const found = tenants.find(t => t.id === tenant.id)
      expect(found).toBeDefined()
      expect(found!.slug).toBe(slug)
    })

    it('should return tenant data matching TenantSchema', async () => {
      const slug = 'schema-corp-' + Date.now()
      await service.createTenant({
        name: 'Schema Corp',
        slug,
        ownerId: 'user_011',
      })

      const tenants = await service.getUserTenants('user_011')

      expect(tenants.length).toBeGreaterThanOrEqual(1)
      const tenant = tenants.find(t => t.slug === slug)
      expect(tenant).toBeDefined()
      expect(typeof tenant!.id).toBe('string')
      expect(typeof tenant!.name).toBe('string')
      expect(typeof tenant!.slug).toBe('string')
      expect(typeof tenant!.plan).toBe('string')
      expect(typeof tenant!.status).toBe('string')
      expect(typeof tenant!.ownerId).toBe('string')
    })
  })

  describe('getTenantMembers', () => {
    it('should return owner with admin role after tenant creation', async () => {
      const tenant = await service.createTenant({
        name: 'Members Corp',
        slug: 'members-corp-' + Date.now(),
        ownerId: 'user_020',
      })

      const members = await service.getTenantMembers(tenant.id)

      expect(members).toHaveLength(1)
      const owner = members[0]!
      expect(owner.userId).toBe('user_020')
      expect(owner.role.code).toBe(TenantRoleCode.ADMIN)
      expect(owner.status).toBe('active')
    })
  })

  describe('getUserPermissions', () => {
    it('should return admin permissions for tenant owner', async () => {
      const tenant = await service.createTenant({
        name: 'Perms Corp',
        slug: 'perms-corp-' + Date.now(),
        ownerId: 'user_030',
      })

      const permissions = await service.getUserPermissions('user_030', tenant.id)

      expect(permissions).toContain(TenantPermission.MEMBER_VIEW)
      expect(permissions).toContain(TenantPermission.ROLE_CREATE)
      expect(permissions).toContain(TenantPermission.SETTINGS_EDIT)
    })

    it('should return empty permissions for non-member', async () => {
      const tenant = await service.createTenant({
        name: 'Perms Corp 2',
        slug: 'perms-corp-2-' + Date.now(),
        ownerId: 'user_031',
      })

      const permissions = await service.getUserPermissions('non_member', tenant.id)
      expect(permissions).toEqual([])
    })
  })

  describe('TenantPermission enum', () => {
    it('should have member management permissions', () => {
      expect(TenantPermission.MEMBER_VIEW).toBe('tenant:member:view')
      expect(TenantPermission.MEMBER_INVITE).toBe('tenant:member:invite')
      expect(TenantPermission.MEMBER_REMOVE).toBe('tenant:member:remove')
      expect(TenantPermission.MEMBER_ROLE_ASSIGN).toBe('tenant:member:role:assign')
    })

    it('should have role management permissions', () => {
      expect(TenantPermission.ROLE_VIEW).toBe('tenant:role:view')
      expect(TenantPermission.ROLE_CREATE).toBe('tenant:role:create')
      expect(TenantPermission.ROLE_EDIT).toBe('tenant:role:edit')
      expect(TenantPermission.ROLE_DELETE).toBe('tenant:role:delete')
    })

    it('should have correct total number of permissions', () => {
      const permissionCount = Object.keys(TenantPermission).length
      expect(permissionCount).toBe(19)
    })
  })

  describe('TenantRoleCode enum', () => {
    it('should have admin, member, and guest role codes', () => {
      expect(TenantRoleCode.ADMIN).toBe('tenant_admin')
      expect(TenantRoleCode.MEMBER).toBe('tenant_member')
      expect(TenantRoleCode.GUEST).toBe('tenant_guest')
    })
  })
})
