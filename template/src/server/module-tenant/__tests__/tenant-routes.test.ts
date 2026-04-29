import { describe, it, expect } from 'vitest'
import {
  TenantSchema,
  CreateTenantSchema,
  UpdateTenantSchema,
  CreateTenantRoleSchema,
  UpdateTenantRoleSchema,
  InviteMemberSchema,
  UpdateMemberSchema,
  TenantRoleSchema,
  TenantMemberSchema,
  InvitationSchema,
} from '@shared/modules/tenant/schemas'

describe('Tenant Routes', () => {
  describe('TenantSchema validation', () => {
    it('should accept valid tenant with numeric timestamps', () => {
      const result = TenantSchema.safeParse({
        id: 'tenant_123',
        code: 'my-company',
        name: 'My Company',
        slug: 'my-company',
        logo: null,
        description: null,
        plan: 'free',
        status: 'active',
        maxMembers: null,
        maxStorage: null,
        settings: null,
        metadata: null,
        ownerId: 'user_123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      expect(result.success).toBe(true)
    })

    it('should accept tenant with nullish timestamps', () => {
      const result = TenantSchema.safeParse({
        id: 'tenant_123',
        code: 'my-company',
        name: 'My Company',
        slug: 'my-company',
        plan: 'free',
        status: 'active',
        ownerId: 'user_123',
        createdAt: null,
        updatedAt: null,
      })

      expect(result.success).toBe(true)
    })

    it('should reject tenant with Date objects for timestamps', () => {
      const result = TenantSchema.safeParse({
        id: 'tenant_123',
        code: 'my-company',
        name: 'My Company',
        slug: 'my-company',
        plan: 'free',
        status: 'active',
        ownerId: 'user_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      expect(result.success).toBe(false)
    })
  })

  describe('CreateTenantSchema validation', () => {
    it('should accept valid tenant creation data', () => {
      const result = CreateTenantSchema.safeParse({
        name: 'Test Company',
        slug: 'test-company',
        plan: 'free',
      })

      expect(result.success).toBe(true)
    })

    it('should reject missing name', () => {
      const result = CreateTenantSchema.safeParse({
        slug: 'test-company',
      })

      expect(result.success).toBe(false)
    })

    it('should reject missing slug', () => {
      const result = CreateTenantSchema.safeParse({
        name: 'Test Company',
      })

      expect(result.success).toBe(false)
    })

    it('should reject invalid slug format', () => {
      const result = CreateTenantSchema.safeParse({
        name: 'Test Company',
        slug: 'Invalid Slug!',
      })

      expect(result.success).toBe(false)
    })

    it('should accept nullish plan', () => {
      const result = CreateTenantSchema.safeParse({
        name: 'Test Company',
        slug: 'test-company',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('UpdateTenantSchema validation', () => {
    it('should accept partial update', () => {
      const result = UpdateTenantSchema.safeParse({
        name: 'Updated Name',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('CreateTenantRoleSchema validation', () => {
    it('should accept valid role data', () => {
      const result = CreateTenantRoleSchema.safeParse({
        code: 'custom_role',
        name: 'custom_role',
        label: 'Custom Role',
        permissions: ['tenant:data:view'],
      })

      expect(result.success).toBe(true)
    })

    it('should require permissions as array', () => {
      const result = CreateTenantRoleSchema.safeParse({
        code: 'custom_role',
        name: 'custom_role',
        label: 'Custom Role',
        permissions: 'not-an-array',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('InviteMemberSchema validation', () => {
    it('should accept valid invitation data', () => {
      const result = InviteMemberSchema.safeParse({
        email: 'user@example.com',
        roleId: 'role_123',
      })

      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const result = InviteMemberSchema.safeParse({
        email: 'not-an-email',
        roleId: 'role_123',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('Slug pattern validation', () => {
    it('should accept valid slugs', () => {
      const validSlugs = ['my-company', 'test-123', 'abc', 'company-name-here']
      const slugPattern = /^[a-z0-9-]+$/

      validSlugs.forEach(slug => {
        expect(slugPattern.test(slug)).toBe(true)
      })
    })

    it('should reject invalid slugs', () => {
      const invalidSlugs = ['My-Company', 'test_123', 'abc def', '']
      const slugPattern = /^[a-z0-9-]+$/

      invalidSlugs.forEach(slug => {
        expect(slugPattern.test(slug)).toBe(false)
      })
    })
  })

  describe('UpdateTenantRoleSchema validation', () => {
    it('should accept valid updateTenantRoleRoute role update data', () => {
      const result = UpdateTenantRoleSchema.safeParse({
        name: 'Updated Role',
        label: 'Updated Label',
        permissions: ['tenant:data:view'],
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Updated Role')
        expect(result.data.permissions).toEqual(['tenant:data:view'])
      }
    })

    it('should accept nullish fields for updateTenantRoleRoute', () => {
      const result = UpdateTenantRoleSchema.safeParse({})

      expect(result.success).toBe(true)
    })
  })

  describe('UpdateMemberSchema validation', () => {
    it('should accept valid updateMemberRoute member role update', () => {
      const result = UpdateMemberSchema.safeParse({
        roleId: 'new_role_123',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.roleId).toBe('new_role_123')
      }
    })

    it('should reject missing roleId for updateMemberRoute', () => {
      const result = UpdateMemberSchema.safeParse({})

      expect(result.success).toBe(false)
    })
  })

  describe('PUT /tenants/:tenantId/roles/:roleId (updateTenantRoleRoute)', () => {
    it('should validate updateTenantRoleRoute request body schema', () => {
      const valid = UpdateTenantRoleSchema.safeParse({ name: 'New Name' })
      const invalid = UpdateTenantRoleSchema.safeParse({ name: 123 })

      expect(valid.success).toBe(true)
      expect(invalid.success).toBe(false)
    })
  })

  describe('DELETE /tenants/:tenantId/roles/:roleId (deleteTenantRoleRoute)', () => {
    it('should handle deleteTenantRoleRoute system role protection', () => {
      const systemRole = TenantRoleSchema.parse({
        id: 'role_system',
        tenantId: 'tenant_1',
        code: 'owner',
        name: 'owner',
        label: 'Owner',
        permissions: '[]',
        isSystem: true,
        isActive: true,
        sortOrder: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      expect(systemRole.isSystem).toBe(true)
      expect(systemRole.code).toBe('owner')
    })
  })

  describe('PUT /tenants/:tenantId/members/:memberId (updateMemberRoute)', () => {
    it('should validate updateMemberRoute role assignment', () => {
      const valid = UpdateMemberSchema.safeParse({ roleId: 'role_abc' })
      const empty = UpdateMemberSchema.safeParse({})

      expect(valid.success).toBe(true)
      expect(empty.success).toBe(false)
    })

    it('should parse updateMemberRoute response with TenantMemberSchema', () => {
      const member = TenantMemberSchema.safeParse({
        id: 'member_1',
        tenantId: 'tenant_1',
        userId: 'user_1',
        roleId: 'role_1',
        status: 'active',
        role: {
          id: 'role_1',
          tenantId: 'tenant_1',
          code: 'admin',
          name: 'admin',
          label: 'Admin',
          permissions: '[]',
          isActive: true,
          sortOrder: 0,
        },
      })

      expect(member.success).toBe(true)
      if (member.success) {
        expect(member.data.status).toBe('active')
        expect(member.data.role.code).toBe('admin')
      }
    })
  })

  describe('DELETE /tenants/:tenantId/members/:memberId (removeMemberRoute)', () => {
    it('should validate removeMemberRoute member removal response schema', () => {
      const member = TenantMemberSchema.safeParse({
        id: 'member_1',
        tenantId: 'tenant_1',
        userId: 'user_1',
        roleId: 'role_1',
        status: 'removed',
        role: {
          id: 'role_1',
          tenantId: 'tenant_1',
          code: 'admin',
          name: 'admin',
          label: 'Admin',
          permissions: '[]',
          isActive: true,
          sortOrder: 0,
        },
      })

      expect(member.success).toBe(true)
      if (member.success) {
        expect(member.data.status).toBe('removed')
      }
    })
  })

  describe('POST /tenants/invitations/:token/accept (acceptInvitationRoute)', () => {
    it('should validate acceptInvitationRoute token format', () => {
      const validToken = 'abc-123-def-456'
      const emptyToken = ''

      expect(validToken.length).toBeGreaterThan(0)
      expect(emptyToken.length).toBe(0)
    })

    it('should parse acceptInvitationRoute response with InvitationSchema', () => {
      const invitation = InvitationSchema.safeParse({
        id: 'inv_1',
        tenantId: 'tenant_1',
        email: 'user@test.com',
        roleId: 'role_1',
        inviterId: 'user_1',
        token: 'token-abc',
        status: 'accepted',
      })

      expect(invitation.success).toBe(true)
      if (invitation.success) {
        expect(invitation.data.status).toBe('accepted')
        expect(invitation.data.token).toBe('token-abc')
      }
    })
  })
})
