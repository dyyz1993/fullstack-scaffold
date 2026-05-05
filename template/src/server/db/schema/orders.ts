import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const orderStatuses = [
  'pending',
  'processing',
  'completed',
  'cancelled',
  'disputed',
] as const
export type OrderStatus = (typeof orderStatuses)[number]

export const orders = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderNo: text('order_no').notNull(),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  productName: text('product_name').notNull(),
  amount: integer('amount').notNull(),
  status: text('status', { enum: orderStatuses }).notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export type OrderTable = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert
