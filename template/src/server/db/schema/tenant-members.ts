import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core'
import { tenants } from './tenants'
import { tenantRoles } from './tenant-roles'

/**
 * 租户成员（用户与租户的归属关系）。userId 指向认证体系（developers.id /
 * dev token 用户 id），删除为软删（status='left'）保留审计轨迹。
 */
export const tenantMembers = sqliteTable(
  'tenant_members',
  {
    id: text('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    roleId: text('role_id')
      .notNull()
      .references(() => tenantRoles.id, { onDelete: 'cascade' }),
    status: text('status', {
      enum: ['active', 'pending', 'suspended', 'left'],
    })
      .notNull()
      .default('active'),
    invitedBy: text('invited_by'),
    invitedAt: text('invited_at'),
    joinedAt: text('joined_at').notNull(),
    lastActiveAt: text('last_active_at'),
  },
  table => ({
    userTenantUnique: unique().on(table.userId, table.tenantId),
  })
)

export type TenantMemberTable = typeof tenantMembers.$inferSelect
export type NewTenantMember = typeof tenantMembers.$inferInsert

export type TenantMemberStatus = 'active' | 'pending' | 'suspended' | 'left'
