import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const todoStatus = ['pending', 'in_progress', 'completed'] as const
export type TodoStatus = (typeof todoStatus)[number]

export const todos = sqliteTable(
  'todos',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status', { enum: todoStatus }).notNull().default('pending'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  table => ({
    statusIdx: index('todos_status_idx').on(table.status),
    createdAtIdx: index('todos_created_at_idx').on(table.createdAt),
    updatedAtIdx: index('todos_updated_at_idx').on(table.updatedAt),
  })
)

export type TodoTable = typeof todos.$inferSelect
export type NewTodo = typeof todos.$inferInsert
