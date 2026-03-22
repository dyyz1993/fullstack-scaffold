import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logo: text('logo'),
  description: text('description'),
  plan: text('plan').notNull().default('free'),
  status: text('status').notNull().default('active'),
  maxMembers: integer('max_members').default(10),
  maxStorage: integer('max_storage').default(1073741824),
  settings: text('settings'),
  metadata: text('metadata'),
  ownerId: text('owner_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert

export type TenantPlan = 'free' | 'starter' | 'pro' | 'enterprise'
export type TenantStatus = 'active' | 'suspended' | 'trial' | 'cancelled'
