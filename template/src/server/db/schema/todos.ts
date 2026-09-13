import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const todoStatus = ['pending', 'in_progress', 'completed'] as const
export type TodoStatus = (typeof todoStatus)[number]

export const todos = sqliteTable(
  'todos',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    // 租户归属（saas 等含 tenant 模块的 preset 由隔离中间件填充；其他
    // preset 恒为 null，列对它们无害）
    tenantId: integer('tenant_id'),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status', { enum: todoStatus }).notNull().default('pending'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  table => ({
    statusIdx: index('todos_status_idx').on(table.status),
    tenantIdx: index('todos_tenant_idx').on(table.tenantId),
    createdAtIdx: index('todos_created_at_idx').on(table.createdAt),
    updatedAtIdx: index('todos_updated_at_idx').on(table.updatedAt),
  })
)

export type TodoTable = typeof todos.$inferSelect
export type NewTodo = typeof todos.$inferInsert
