import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const productStatuses = ['active', 'inactive', 'out_of_stock'] as const
export type ProductStatus = (typeof productStatuses)[number]

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  price: integer('price').notNull(), // 单位：分
  status: text('status', { enum: productStatuses }).notNull().default('active'),
  stock: integer('stock').notNull().default(0),
  imageUrl: text('image_url'),
  merchantId: integer('merchant_id').notNull(), // Changed to integer to match merchants.id
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
