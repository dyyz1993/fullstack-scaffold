import { eq, desc, like, and, inArray } from 'drizzle-orm'
import type {
  Tenant,
  CreateTenantInput,
  UpdateTenantInput,
  TenantRole,
  TenantMember,
  TenantInvitation,
} from '@shared/schemas'
import {
  TenantPermission,
  TenantRoleCode,
  TENANT_ROLE_TEMPLATES,
  PLAN_ROLE_LIMITS,
} from '@shared/schemas'
import { getDb, runTransactional } from '@server/db'
import {
  tenants,
  tenantRoles,
  tenantMembers,
  tenantInvitations,
  developers,
  type TenantTable,
  type TenantRoleTable,
  type TenantMemberTable,
  type NewTenant,
} from '@server/db/schema'
import { generateId, generateToken } from '@server/utils/id-helpers'
import { createModuleLoggerSync } from '../../utils/logger'
import { ValidationError, AuthorizationError, NotFoundError } from '../../utils/app-error'

const log = createModuleLoggerSync('tenant-service')

export async function seedTenantsIfEmpty(): Promise<void> {
  const db = await getDb()
  const existing = await db.select().from(tenants)
  if (existing.length === 0) {
    log.info({}, 'Seeding tenants...')

    const now = new Date().toISOString()

    const sampleTenants: NewTenant[] = [
      {
        name: 'Demo Corp',
        slug: 'demo',
        status: 'active',
        plan: 'pro',
        maxUsers: 50,
        settings: JSON.stringify({ theme: 'dark', language: 'en' }),
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'Test Inc',
        slug: 'test',
        status: 'trial',
        plan: 'free',
        maxUsers: 5,
        settings: null,
        createdAt: now,
        updatedAt: now,
      },
    ]

    await db.insert(tenants).values(sampleTenants)

    // demo 租户配套播种角色模板 + owner 成员（dev 超管 token 直接可演示）
    const demoRow = await db.select().from(tenants).where(eq(tenants.slug, 'demo'))
    if (demoRow.length > 0) {
      const demoId = demoRow[0].id
      const roleValues = TENANT_ROLE_TEMPLATES.map(template => ({
        id: generateId('tr'),
        tenantId: demoId,
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
        createdAt: now,
        updatedAt: now,
      }))
      await db.insert(tenantRoles).values(roleValues)
      const adminRole = roleValues.find(r => r.code === TenantRoleCode.ADMIN)!
      await db.insert(tenantMembers).values({
        id: generateId('tm'),
        tenantId: demoId,
        userId: 'test-super-admin-1',
        roleId: adminRole.id,
        status: 'active',
        invitedBy: null,
        invitedAt: null,
        joinedAt: now,
        lastActiveAt: now,
      })
    }

    log.info({}, 'Tenants seeding complete!')
  }
}

export async function listTenants(
  page = 1,
  pageSize = 20,
  filters: { status?: string; plan?: string; search?: string } = {}
): Promise<{ items: Tenant[]; total: number; page: number; pageSize: number }> {
  const db = await getDb()
  const offset = (page - 1) * pageSize

  let baseQuery = db.select().from(tenants)

  if (filters.status) {
    baseQuery = baseQuery.where(
      eq(tenants.status, filters.status as 'active' | 'suspended' | 'trial')
    ) as typeof baseQuery
  }

  if (filters.plan) {
    baseQuery = baseQuery.where(
      eq(tenants.plan, filters.plan as 'free' | 'starter' | 'pro' | 'enterprise')
    ) as typeof baseQuery
  }

  if (filters.search) {
    baseQuery = baseQuery.where(like(tenants.name, `%${filters.search}%`)) as typeof baseQuery
  }

  const rows = await baseQuery.orderBy(desc(tenants.createdAt)).limit(pageSize).offset(offset)

  let countQuery = db.select().from(tenants)

  if (filters.status) {
    countQuery = countQuery.where(
      eq(tenants.status, filters.status as 'active' | 'suspended' | 'trial')
    ) as typeof countQuery
  }

  if (filters.plan) {
    countQuery = countQuery.where(
      eq(tenants.plan, filters.plan as 'free' | 'starter' | 'pro' | 'enterprise')
    ) as typeof countQuery
  }

  if (filters.search) {
    countQuery = countQuery.where(like(tenants.name, `%${filters.search}%`)) as typeof countQuery
  }

  const countRows = await countQuery
  const total = countRows.length

  const items: Tenant[] = rows.map((row: TenantTable) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status as 'active' | 'suspended' | 'trial',
    plan: row.plan as 'free' | 'starter' | 'pro' | 'enterprise',
    maxUsers: row.maxUsers,
    settings: row.settings ? (JSON.parse(row.settings) as Record<string, unknown>) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }))

  return { items, total, page, pageSize }
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const db = await getDb()
  const rows = await db.select().from(tenants).where(eq(tenants.slug, slug))

  if (rows.length === 0) return null

  const row = rows[0]

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status as 'active' | 'suspended' | 'trial',
    plan: row.plan as 'free' | 'starter' | 'pro' | 'enterprise',
    maxUsers: row.maxUsers,
    settings: row.settings ? (JSON.parse(row.settings) as Record<string, unknown>) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function getTenantById(id: number): Promise<Tenant | null> {
  const db = await getDb()
  const rows = await db.select().from(tenants).where(eq(tenants.id, id))

  if (rows.length === 0) return null

  const row = rows[0]

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status as 'active' | 'suspended' | 'trial',
    plan: row.plan as 'free' | 'starter' | 'pro' | 'enterprise',
    maxUsers: row.maxUsers,
    settings: row.settings ? (JSON.parse(row.settings) as Record<string, unknown>) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function createTenant(input: CreateTenantInput, ownerId: string): Promise<Tenant> {
  const db = await getDb()

  const existing = await db.select().from(tenants).where(eq(tenants.slug, input.slug))

  if (existing.length > 0) {
    throw new ValidationError(`Tenant with slug '${input.slug}' already exists`)
  }

  const now = new Date().toISOString()

  // 开通事务：租户 + 3 个系统角色模板 + owner 以 tenant_admin 身份入组。
  // 三步原子完成——"注册→建租户→可用"，否则新租户是无角色的空壳
  const row = await runTransactional(async tx => {
    const inserted = await tx
      .insert(tenants)
      .values({
        name: input.name,
        slug: input.slug,
        status: 'trial',
        plan: input.plan,
        maxUsers: input.maxUsers,
        settings: input.settings ? JSON.stringify(input.settings) : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    const tenantRow = inserted[0]

    const roleValues = TENANT_ROLE_TEMPLATES.map(template => ({
      id: generateId('tr'),
      tenantId: tenantRow.id,
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
      createdAt: now,
      updatedAt: now,
    }))

    await tx.insert(tenantRoles).values(roleValues)

    const adminRole = roleValues.find(r => r.code === TenantRoleCode.ADMIN)!
    await tx.insert(tenantMembers).values({
      id: generateId('tm'),
      tenantId: tenantRow.id,
      userId: ownerId,
      roleId: adminRole.id,
      status: 'active',
      invitedBy: null,
      invitedAt: null,
      joinedAt: now,
      lastActiveAt: now,
    })

    return tenantRow
  })

  log.info({ tenantId: row.id, slug: row.slug, ownerId }, 'Tenant provisioned')

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status as 'active' | 'suspended' | 'trial',
    plan: row.plan as 'free' | 'starter' | 'pro' | 'enterprise',
    maxUsers: row.maxUsers,
    settings: row.settings ? (JSON.parse(row.settings) as Record<string, unknown>) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function updateTenant(id: number, input: UpdateTenantInput): Promise<Tenant | null> {
  const db = await getDb()

  const existing = await db.select().from(tenants).where(eq(tenants.id, id))

  if (existing.length === 0) return null

  const updateData: Partial<TenantTable> = {
    updatedAt: new Date().toISOString(),
  }

  if (input.name !== undefined) {
    updateData.name = input.name ?? undefined
  }

  if (input.status !== undefined && input.status !== null) {
    updateData.status = input.status
  }

  if (input.plan !== undefined && input.plan !== null) {
    updateData.plan = input.plan
  }

  if (input.maxUsers !== undefined && input.maxUsers !== null) {
    updateData.maxUsers = input.maxUsers
  }

  if (input.settings !== undefined) {
    updateData.settings = input.settings ? JSON.stringify(input.settings) : null
  }

  const result = await db.update(tenants).set(updateData).where(eq(tenants.id, id)).returning()

  if (result.length === 0) return null

  const row = result[0]

  log.info({ tenantId: row.id, slug: row.slug }, 'Tenant updated')

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status as 'active' | 'suspended' | 'trial',
    plan: row.plan as 'free' | 'starter' | 'pro' | 'enterprise',
    maxUsers: row.maxUsers,
    settings: row.settings ? (JSON.parse(row.settings) as Record<string, unknown>) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function deleteTenant(id: number): Promise<boolean> {
  const db = await getDb()

  const result = await db.delete(tenants).where(eq(tenants.id, id)).returning()

  if (result.length > 0) {
    log.info({ tenantId: id }, 'Tenant deleted')
    return true
  }

  return false
}

// ============ 租户角色 ============

function rowToRole(row: TenantRoleTable): TenantRole {
  return {
    id: row.id,
    tenantId: row.tenantId,
    code: row.code,
    name: row.name,
    label: row.label,
    description: row.description,
    permissions: JSON.parse(row.permissions) as string[],
    isSystem: row.isSystem,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function getTenantRoles(tenantId: number): Promise<TenantRole[]> {
  const db = await getDb()
  const rows = await db
    .select()
    .from(tenantRoles)
    .where(and(eq(tenantRoles.tenantId, tenantId), eq(tenantRoles.isActive, true)))
  return rows.map(rowToRole)
}

export async function createTenantRole(
  tenantId: number,
  input: {
    code: string
    name: string
    label: string
    description?: string | null
    permissions: string[]
  }
): Promise<TenantRole> {
  const db = await getDb()

  const tenant = await getTenantById(tenantId)
  if (!tenant) throw NotFoundError.tenant(String(tenantId))

  // 套餐角色数配额：超限真实拦截（enterprise 不限）
  const maxRoles = PLAN_ROLE_LIMITS[tenant.plan] ?? 3
  if (maxRoles >= 0) {
    const existing = await getTenantRoles(tenantId)
    if (existing.length >= maxRoles) {
      throw new ValidationError(`已达到当前套餐的角色数量上限（${maxRoles} 个），请升级套餐`)
    }
  }

  const dup = await db
    .select()
    .from(tenantRoles)
    .where(and(eq(tenantRoles.tenantId, tenantId), eq(tenantRoles.code, input.code)))
  if (dup.length > 0) {
    throw new ValidationError(`角色 code '${input.code}' 在本租户已存在`)
  }

  const now = new Date().toISOString()
  const [row] = await db
    .insert(tenantRoles)
    .values({
      id: generateId('tr'),
      tenantId,
      code: input.code,
      name: input.name,
      label: input.label,
      description: input.description ?? null,
      permissions: JSON.stringify(input.permissions),
      isSystem: false,
      isActive: true,
      sortOrder: 9,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  return rowToRole(row)
}

export async function updateTenantRole(
  roleId: string,
  input: { label?: string | null; description?: string | null; permissions?: string[] }
): Promise<TenantRole | null> {
  const db = await getDb()
  const [row] = await db
    .update(tenantRoles)
    .set({
      ...(input.label !== undefined && input.label !== null ? { label: input.label } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.permissions !== undefined && input.permissions !== null
        ? { permissions: JSON.stringify(input.permissions) }
        : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(tenantRoles.id, roleId))
    .returning()
  return row ? rowToRole(row) : null
}

/** 系统角色（isSystem）不可删；自定义角色软删（isActive=false） */
export async function deleteTenantRole(roleId: string): Promise<boolean> {
  const db = await getDb()
  const [row] = await db.select().from(tenantRoles).where(eq(tenantRoles.id, roleId))
  if (!row) return false
  if (row.isSystem) {
    throw new ValidationError('系统角色不可删除')
  }
  await db
    .update(tenantRoles)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(eq(tenantRoles.id, roleId))
  return true
}

// ============ 租户成员 ============

function rowToMember(row: TenantMemberTable, role: TenantRole | null): TenantMember {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    roleId: row.roleId,
    username: row.userId,
    role,
    status: row.status as 'active' | 'pending' | 'suspended' | 'left',
    invitedBy: row.invitedBy,
    invitedAt: row.invitedAt,
    joinedAt: row.joinedAt,
    lastActiveAt: row.lastActiveAt,
  }
}

export async function getTenantMembers(tenantId: number): Promise<TenantMember[]> {
  const db = await getDb()
  const memberRows = await db
    .select()
    .from(tenantMembers)
    .where(eq(tenantMembers.tenantId, tenantId))

  if (memberRows.length === 0) return []

  const roleIds = [...new Set(memberRows.map(m => m.roleId))]
  const roleRows = await db.select().from(tenantRoles).where(inArray(tenantRoles.id, roleIds))
  const roleMap = new Map(roleRows.map(r => [r.id, rowToRole(r)]))

  // 联认证体系取用户名（dev token 用户不在 developers 表，回退 userId）
  const members = memberRows.map(m => rowToMember(m, roleMap.get(m.roleId) ?? null))
  return enrichUsernames(members)
}

/** 批量补用户名：命中 developers 表用 username，否则保留 userId */
async function enrichUsernames(members: TenantMember[]): Promise<TenantMember[]> {
  try {
    const db = await getDb()
    // 联合驱动下 partial-select 重载坍缩，用全量 select 后映射（同文件惯例）
    const rows = await db.select().from(developers)
    const nameMap = new Map(rows.map(r => [r.id as string, r.username as string]))
    return members.map(m => ({ ...m, username: nameMap.get(m.userId) ?? m.userId }))
  } catch {
    // developers 表不存在（无 auth 模块 preset）——全部回退 userId
    return members.map(m => ({ ...m, username: m.userId }))
  }
}

export async function getActiveMemberCount(tenantId: number): Promise<number> {
  const db = await getDb()
  const rows = await db
    .select()
    .from(tenantMembers)
    .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.status, 'active')))
  return rows.length
}

export async function getMembership(
  userId: string,
  tenantId: number
): Promise<TenantMemberTable | null> {
  const db = await getDb()
  const rows = await db
    .select()
    .from(tenantMembers)
    .where(and(eq(tenantMembers.userId, userId), eq(tenantMembers.tenantId, tenantId)))
  return rows[0] ?? null
}

export async function updateMemberRole(
  tenantId: number,
  memberId: string,
  roleId: string
): Promise<TenantMember | null> {
  const db = await getDb()

  const role = await db
    .select()
    .from(tenantRoles)
    .where(and(eq(tenantRoles.id, roleId), eq(tenantRoles.tenantId, tenantId)))
  if (role.length === 0) {
    throw new ValidationError('目标角色不属于本租户')
  }

  const [row] = await db
    .update(tenantMembers)
    .set({ roleId })
    .where(and(eq(tenantMembers.id, memberId), eq(tenantMembers.tenantId, tenantId)))
    .returning()
  if (!row) return null

  const members = await getTenantMembers(tenantId)
  return members.find(m => m.id === memberId) ?? rowToMember(row, null)
}

/** 软删（status='left'）：保留邀请/审计轨迹，成员立即失去访问权 */
export async function removeMember(tenantId: number, memberId: string): Promise<boolean> {
  const db = await getDb()
  const [row] = await db
    .update(tenantMembers)
    .set({ status: 'left' })
    .where(and(eq(tenantMembers.id, memberId), eq(tenantMembers.tenantId, tenantId)))
    .returning()
  return !!row
}

export async function getUserTenants(userId: string): Promise<Tenant[]> {
  const db = await getDb()
  const memberRows = await db
    .select()
    .from(tenantMembers)
    .where(and(eq(tenantMembers.userId, userId), eq(tenantMembers.status, 'active')))

  if (memberRows.length === 0) return []

  const tenantIds = memberRows.map(m => m.tenantId)
  const tenantRows = await db.select().from(tenants).where(inArray(tenants.id, tenantIds))

  return tenantRows.map(row => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status as 'active' | 'suspended' | 'trial',
    plan: row.plan as 'free' | 'starter' | 'pro' | 'enterprise',
    maxUsers: row.maxUsers,
    settings: row.settings ? (JSON.parse(row.settings) as Record<string, unknown>) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }))
}

/** 成员归属 + 角色权限点判定（P2 隔离中间件的数据基础） */
export async function getUserTenantPermissions(
  userId: string,
  tenantId: number
): Promise<TenantPermission[]> {
  const membership = await getMembership(userId, tenantId)
  if (!membership || membership.status !== 'active') return []

  const db = await getDb()
  const [role] = await db.select().from(tenantRoles).where(eq(tenantRoles.id, membership.roleId))
  if (!role) return []

  try {
    return JSON.parse(role.permissions) as TenantPermission[]
  } catch {
    return []
  }
}

export async function hasTenantPermission(
  userId: string,
  tenantId: number,
  permission: TenantPermission
): Promise<boolean> {
  const permissions = await getUserTenantPermissions(userId, tenantId)
  return permissions.includes(permission)
}

// ============ 租户邀请 ============

export async function inviteMember(
  tenantId: number,
  email: string,
  roleId: string,
  inviterId: string
): Promise<TenantInvitation> {
  const db = await getDb()

  const tenant = await getTenantById(tenantId)
  if (!tenant) throw NotFoundError.tenant(String(tenantId))

  const role = await db
    .select()
    .from(tenantRoles)
    .where(and(eq(tenantRoles.id, roleId), eq(tenantRoles.tenantId, tenantId)))
  if (role.length === 0) {
    throw new ValidationError('邀请指定的角色不属于本租户')
  }

  // 套餐成员数配额：邀请时拦截（接受时二次校验，防邀请后配额被占满）
  const activeCount = await getActiveMemberCount(tenantId)
  if (activeCount >= tenant.maxUsers) {
    throw new ValidationError(`成员数已达套餐上限（${tenant.maxUsers} 人），请升级套餐后再邀请`)
  }

  const now = new Date().toISOString()
  const [row] = await db
    .insert(tenantInvitations)
    .values({
      id: generateId('inv'),
      tenantId,
      email,
      roleId,
      inviterId,
      token: generateToken(),
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      acceptedAt: null,
      createdAt: now,
    })
    .returning()

  log.info({ tenantId, email }, 'Invitation created')

  return {
    id: row.id,
    tenantId: row.tenantId,
    email: row.email,
    roleId: row.roleId,
    inviterId: row.inviterId,
    token: row.token,
    status: row.status as 'pending',
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt,
    createdAt: row.createdAt,
  }
}

export async function getInvitationByToken(token: string): Promise<{
  invitation: TenantInvitation
  tenantName: string
  tenantSlug: string
  roleLabel: string
} | null> {
  const db = await getDb()
  const [row] = await db.select().from(tenantInvitations).where(eq(tenantInvitations.token, token))
  if (!row) return null

  // 过期未处理的邀请惰性标记
  if (row.status === 'pending' && row.expiresAt < new Date().toISOString()) {
    await db
      .update(tenantInvitations)
      .set({ status: 'expired' })
      .where(eq(tenantInvitations.id, row.id))
    row.status = 'expired'
  }

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, row.tenantId))
  const [role] = await db.select().from(tenantRoles).where(eq(tenantRoles.id, row.roleId))

  return {
    invitation: {
      id: row.id,
      tenantId: row.tenantId,
      email: row.email,
      roleId: row.roleId,
      inviterId: row.inviterId,
      token: row.token,
      status: row.status as 'pending',
      expiresAt: row.expiresAt,
      acceptedAt: row.acceptedAt,
      createdAt: row.createdAt,
    },
    tenantName: tenant?.name ?? '',
    tenantSlug: tenant?.slug ?? '',
    roleLabel: role?.label ?? '',
  }
}

/** 接受邀请：事务内标记 accepted + 建成员（已存在成员则幂等返回） */
export async function acceptInvitation(
  token: string,
  userId: string
): Promise<TenantMember | null> {
  const detail = await getInvitationByToken(token)
  if (!detail) return null

  const { invitation } = detail
  if (invitation.status !== 'pending') return null

  // 接受时二次校验配额（邀请发出后名额可能已被占满/套餐降级）
  const tenantRow = await getTenantById(invitation.tenantId)
  if (tenantRow) {
    const activeCount = await getActiveMemberCount(invitation.tenantId)
    if (activeCount >= tenantRow.maxUsers) {
      throw new ValidationError(
        `该租户成员数已达套餐上限（${tenantRow.maxUsers} 人），请联系租户管理员升级套餐`
      )
    }
  }

  const existing = await getMembership(userId, invitation.tenantId)
  const now = new Date().toISOString()

  const memberRow = await runTransactional(async tx => {
    await tx
      .update(tenantInvitations)
      .set({ status: 'accepted', acceptedAt: now })
      .where(eq(tenantInvitations.id, invitation.id))

    if (existing) {
      // 曾离开的成员重新激活并按邀请角色更新
      const [row] = await tx
        .update(tenantMembers)
        .set({ status: 'active', roleId: invitation.roleId, joinedAt: now, lastActiveAt: now })
        .where(eq(tenantMembers.id, existing.id))
        .returning()
      return row
    }

    const [row] = await tx
      .insert(tenantMembers)
      .values({
        id: generateId('tm'),
        tenantId: invitation.tenantId,
        userId,
        roleId: invitation.roleId,
        status: 'active',
        invitedBy: invitation.inviterId,
        invitedAt: invitation.createdAt,
        joinedAt: now,
        lastActiveAt: now,
      })
      .returning()
    return row
  })

  const members = await getTenantMembers(invitation.tenantId)
  return members.find(m => m.id === memberRow.id) ?? rowToMember(memberRow, null)
}

export async function cancelInvitation(tenantId: number, invitationId: string): Promise<boolean> {
  const db = await getDb()
  const [row] = await db
    .update(tenantInvitations)
    .set({ status: 'cancelled' })
    .where(and(eq(tenantInvitations.id, invitationId), eq(tenantInvitations.tenantId, tenantId)))
    .returning()
  return !!row
}

/** 供路由层鉴权用：非成员 403 / 权限不足 403 */
export async function requireTenantMembership(userId: string, tenantId: number): Promise<void> {
  const membership = await getMembership(userId, tenantId)
  if (!membership || membership.status !== 'active') {
    throw AuthorizationError.permissionDenied('访问本租户')
  }
}
