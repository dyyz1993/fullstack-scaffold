import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core'
import { tenants } from './tenants'
import { tenantRoles } from './tenant-roles'

export const tenantMembers = sqliteTable(
  'tenant_members',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    roleId: text('role_id')
      .notNull()
      .references(() => tenantRoles.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('active'),
    invitedBy: text('invited_by'),
    invitedAt: integer('invited_at', { mode: 'timestamp' }),
    joinedAt: integer('joined_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    lastActiveAt: integer('last_active_at', { mode: 'timestamp' }),
  },
  table => ({
    userTenantUnique: unique().on(table.userId, table.tenantId),
  })
)

export type TenantMember = typeof tenantMembers.$inferSelect
export type NewTenantMember = typeof tenantMembers.$inferInsert

export type TenantMemberStatus = 'active' | 'pending' | 'suspended' | 'left'
