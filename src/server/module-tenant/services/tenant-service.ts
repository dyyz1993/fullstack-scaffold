import type { Tenant, NewTenant, TenantRole, NewTenantRole, TenantMember } from '../../db/schema'
import { getDb } from '../../db'
import { tenants, tenantRoles, tenantMembers, tenantInvitations } from '../../db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { generateId, generateToken } from '../../utils/id'
import { logger } from '../../utils/logger'
import {
  TENANT_ROLE_TEMPLATES,
  PLAN_ROLE_LIMITS,
  TenantRoleCode,
} from '@platform/shared/permission/tenant-role-templates'
import type { TenantPermission } from '@platform/shared/permission/tenant-permissions'
import type { TenantPlan } from '../../db/schema'
import { TenantSchema } from '@shared/modules/tenant/schemas'

const log = logger.module('tenant-service')

export interface CreateTenantData {
  name: string
  slug: string
  ownerId: string
  plan?: TenantPlan
}

export interface InviteMemberData {
  email: string
  roleId: string
}

export class TenantService {
  async createTenant(data: CreateTenantData): Promise<Tenant> {
    const db = await getDb()
    const tenantId = generateId('tenant')

    const tenant = await db.transaction(async tx => {
      const [newTenant] = await tx
        .insert(tenants)
        .values({
          id: tenantId,
          code: data.slug,
          name: data.name,
          slug: data.slug,
          plan: data.plan ?? 'free',
          status: 'active',
          ownerId: data.ownerId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()

      const systemRoles = TENANT_ROLE_TEMPLATES.map(template => ({
        id: generateId('tr'),
        tenantId,
        code: template.code,
        name: template.name,
        label: template.label,
        description: template.description,
        permissions: JSON.stringify(template.permissions),
        isSystem: true,
        isActive: true,
        sortOrder:
          template.code === TenantRoleCode.ADMIN
            ? 0
            : template.code === TenantRoleCode.MEMBER
              ? 1
              : 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))

      await tx.insert(tenantRoles).values(systemRoles)

      const adminRole = systemRoles.find(r => r.code === TenantRoleCode.ADMIN)!
      await tx.insert(tenantMembers).values({
        id: generateId('tm'),
        tenantId,
        userId: data.ownerId,
        roleId: adminRole.id,
        status: 'active',
        invitedBy: null,
        invitedAt: null,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
      })

      return newTenant
    })

    return tenant!
  }

  async getTenantById(id: string): Promise<Tenant | undefined> {
    const db = await getDb()
    const rows = await db.select().from(tenants).where(eq(tenants.id, id))
    return rows[0]
  }

  async getMemberCount(tenantId: string): Promise<number> {
    const db = await getDb()
    const members = await db
      .select()
      .from(tenantMembers)
      .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.status, 'active')))
    return members.length
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const db = await getDb()
    const rows = await db.select().from(tenants).where(eq(tenants.slug, slug))
    return rows[0]
  }

  async getUserTenants(userId: string): Promise<Tenant[]> {
    const db = await getDb()
    const memberRows = await db
      .select()
      .from(tenantMembers)
      .where(and(eq(tenantMembers.userId, userId), eq(tenantMembers.status, 'active')))

    if (memberRows.length === 0) return []

    const tenantIds = memberRows.map(m => m.tenantId)
    const tenantRows = await db.select().from(tenants).where(inArray(tenants.id, tenantIds))

    return tenantRows.filter(row => {
      const normalized = {
        ...row,
        createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : row.createdAt,
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.getTime() : row.updatedAt,
      }
      const result = TenantSchema.safeParse(normalized)
      if (!result.success) {
        log.error({ err: result.error, row }, 'Invalid tenant data')
        return false
      }
      return true
    })
  }

  async updateTenant(id: string, data: Partial<NewTenant>): Promise<Tenant | undefined> {
    const db = await getDb()
    const [updated] = await db
      .update(tenants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning()
    return updated
  }

  async deleteTenant(id: string): Promise<boolean> {
    const db = await getDb()
    const [updated] = await db
      .update(tenants)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning()
    return !!updated
  }

  async getTenantRoles(tenantId: string): Promise<TenantRole[]> {
    const db = await getDb()
    return db
      .select()
      .from(tenantRoles)
      .where(and(eq(tenantRoles.tenantId, tenantId), eq(tenantRoles.isActive, true)))
  }

  async createTenantRole(
    tenantId: string,
    data: Omit<NewTenantRole, 'tenantId' | 'id'>
  ): Promise<TenantRole | undefined> {
    const db = await getDb()
    const plan = await this.getTenantPlan(tenantId)
    const maxRoles = PLAN_ROLE_LIMITS[plan] ?? 3
    const existingRoles = await this.getTenantRoles(tenantId)

    if (existingRoles.length >= maxRoles) {
      throw new Error(`已达到当前套餐的角色数量上限 (${maxRoles} 个)`)
    }

    const [role] = await db
      .insert(tenantRoles)
      .values({
        ...data,
        tenantId,
        id: generateId('tr'),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    return role
  }

  async updateTenantRole(
    id: string,
    data: Partial<NewTenantRole>
  ): Promise<TenantRole | undefined> {
    const db = await getDb()
    const [role] = await db
      .update(tenantRoles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tenantRoles.id, id))
      .returning()
    return role
  }

  async deleteTenantRole(id: string): Promise<boolean> {
    const db = await getDb()
    const [role] = await db.select().from(tenantRoles).where(eq(tenantRoles.id, id))
    if (!role || role.isSystem) return false

    const [updated] = await db
      .update(tenantRoles)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(tenantRoles.id, id))
      .returning()
    return !!updated
  }

  async getTenantMembers(tenantId: string): Promise<(TenantMember & { role: TenantRole })[]> {
    const db = await getDb()
    const members = await db
      .select()
      .from(tenantMembers)
      .where(eq(tenantMembers.tenantId, tenantId))

    if (members.length === 0) return []

    const roleIds = [...new Set(members.map(m => m.roleId))]
    const roles = await db.select().from(tenantRoles).where(inArray(tenantRoles.id, roleIds))

    const roleMap = new Map(roles.map(r => [r.id, r]))

    return members.map(m => ({
      ...m,
      role: roleMap.get(m.roleId)!,
    }))
  }

  async getMemberByUserAndTenant(
    userId: string,
    tenantId: string
  ): Promise<TenantMember | undefined> {
    const db = await getDb()
    const [member] = await db
      .select()
      .from(tenantMembers)
      .where(and(eq(tenantMembers.userId, userId), eq(tenantMembers.tenantId, tenantId)))
    return member
  }

  async addMember(
    tenantId: string,
    userId: string,
    roleId: string,
    invitedBy?: string
  ): Promise<TenantMember> {
    const db = await getDb()
    const [member] = await db
      .insert(tenantMembers)
      .values({
        id: generateId('tm'),
        tenantId,
        userId,
        roleId,
        status: 'active',
        invitedBy: invitedBy ?? null,
        invitedAt: new Date(),
        joinedAt: new Date(),
        lastActiveAt: new Date(),
      })
      .returning()

    return member!
  }

  async updateMemberRole(memberId: string, roleId: string): Promise<TenantMember | undefined> {
    const db = await getDb()
    const [member] = await db
      .update(tenantMembers)
      .set({ roleId })
      .where(eq(tenantMembers.id, memberId))
      .returning()
    return member
  }

  async removeMember(memberId: string): Promise<boolean> {
    const db = await getDb()
    const [member] = await db
      .update(tenantMembers)
      .set({ status: 'left' })
      .where(eq(tenantMembers.id, memberId))
      .returning()
    return !!member
  }

  async inviteMember(
    tenantId: string,
    email: string,
    roleId: string,
    inviterId: string
  ): Promise<typeof tenantInvitations.$inferSelect> {
    const db = await getDb()
    const token = generateToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const [invitation] = await db
      .insert(tenantInvitations)
      .values({
        id: generateId('inv'),
        tenantId,
        email,
        roleId,
        inviterId,
        token,
        status: 'pending',
        expiresAt,
        createdAt: new Date(),
      })
      .returning()

    return invitation!
  }

  async getInvitationByToken(
    token: string
  ): Promise<typeof tenantInvitations.$inferSelect | undefined> {
    const db = await getDb()
    const [invitation] = await db
      .select()
      .from(tenantInvitations)
      .where(eq(tenantInvitations.token, token))
    return invitation
  }

  async acceptInvitation(token: string, userId: string): Promise<TenantMember | undefined> {
    const db = await getDb()
    const invitation = await this.getInvitationByToken(token)

    if (!invitation || invitation.status !== 'pending') return undefined
    if (invitation.expiresAt < new Date()) {
      await db
        .update(tenantInvitations)
        .set({ status: 'expired' })
        .where(eq(tenantInvitations.id, invitation.id))
      return undefined
    }

    const member = await db.transaction(async tx => {
      await tx
        .update(tenantInvitations)
        .set({ status: 'accepted', acceptedAt: new Date() })
        .where(eq(tenantInvitations.id, invitation.id))

      const [newMember] = await tx
        .insert(tenantMembers)
        .values({
          id: generateId('tm'),
          tenantId: invitation.tenantId,
          userId,
          roleId: invitation.roleId,
          status: 'active',
          invitedBy: invitation.inviterId,
          invitedAt: invitation.createdAt,
          joinedAt: new Date(),
          lastActiveAt: new Date(),
        })
        .returning()

      return newMember
    })

    return member
  }

  async cancelInvitation(invitationId: string): Promise<boolean> {
    const db = await getDb()
    const [invitation] = await db
      .update(tenantInvitations)
      .set({ status: 'cancelled' })
      .where(eq(tenantInvitations.id, invitationId))
      .returning()
    return !!invitation
  }

  async getUserPermissions(userId: string, tenantId: string): Promise<TenantPermission[]> {
    const db = await getDb()
    const [member] = await db
      .select()
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.userId, userId),
          eq(tenantMembers.tenantId, tenantId),
          eq(tenantMembers.status, 'active')
        )
      )

    if (!member) return []

    const [role] = await db.select().from(tenantRoles).where(eq(tenantRoles.id, member.roleId))

    if (!role) return []

    try {
      return JSON.parse(role.permissions) as TenantPermission[]
    } catch {
      return []
    }
  }

  async hasPermission(
    userId: string,
    tenantId: string,
    permission: TenantPermission
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, tenantId)
    return permissions.includes(permission)
  }

  private async getTenantPlan(tenantId: string): Promise<TenantPlan> {
    const tenant = await this.getTenantById(tenantId)
    return (tenant?.plan as TenantPlan) ?? 'free'
  }
}

export const tenantService = new TenantService()
