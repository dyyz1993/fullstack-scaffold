import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core'
import { tenants } from './tenants'

/**
 * 租户内自定义角色（每租户独立，与平台级 roles 表区分）。
 * permissions 存 TenantPermission 枚举数组的 JSON 序列化。
 */
export const tenantRoles = sqliteTable(
  'tenant_roles',
  {
    id: text('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    label: text('label').notNull(),
    description: text('description'),
    permissions: text('permissions').notNull(),
    isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  table => ({
    tenantCodeUnique: unique().on(table.tenantId, table.code),
  })
)

export type TenantRoleTable = typeof tenantRoles.$inferSelect
export type NewTenantRole = typeof tenantRoles.$inferInsert
