import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const notifications = sqliteTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    read: integer('read', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  table => ({
    createdAtIdx: index('notifications_created_at_idx').on(table.createdAt),
  })
)

export type NotificationTable = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert
