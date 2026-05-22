import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const tenants = sqliteTable('tenants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  status: text('status', { enum: ['active', 'suspended', 'trial'] })
    .notNull()
    .default('trial'),
  plan: text('plan', { enum: ['free', 'starter', 'pro', 'enterprise'] })
    .notNull()
    .default('free'),
  maxUsers: integer('max_users').notNull().default(5),
  settings: text('settings'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export type TenantTable = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert
