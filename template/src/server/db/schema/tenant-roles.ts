import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { tenants } from './tenants'

export const tenantRoles = sqliteTable(
  'tenant_roles',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    label: text('label').notNull(),
    description: text('description'),
    permissions: text('permissions').notNull(),
    isSystem: integer('is_system', { mode: 'boolean' }).default(false),
    isActive: integer('is_active', { mode: 'boolean' }).default(true),
    sortOrder: integer('sort_order').default(0),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  table => ({
    tenantCodeUnique: unique().on(table.tenantId, table.code),
  })
)

export type TenantRole = typeof tenantRoles.$inferSelect
export type NewTenantRole = typeof tenantRoles.$inferInsert
