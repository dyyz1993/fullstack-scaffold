import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const merchantStatuses = ['active', 'inactive', 'suspended'] as const
export type MerchantStatus = (typeof merchantStatuses)[number]

export const businessTypes = ['retail', 'wholesale', 'service', 'restaurant'] as const
export type BusinessType = (typeof businessTypes)[number]

export const merchants = sqliteTable('merchants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  tenantId: integer('tenant_id').notNull(),
  businessName: text('business_name').notNull(),
  businessType: text('business_type', { enum: businessTypes }).notNull().default('retail'),
  status: text('status', { enum: merchantStatuses }).notNull().default('active'),
  description: text('description'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  password: text('password').notNull(), // Simplified - use bcrypt hash in production
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export type MerchantTable = typeof merchants.$inferSelect
export type NewMerchant = typeof merchants.$inferInsert
