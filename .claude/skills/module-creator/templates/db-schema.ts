// template/src/server/db/schema/{name}.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const {names} = sqliteTable('{name}', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // Add fields based on requirements, e.g.:
  // name: text('name').notNull(),
  // status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  // description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

// Type export for Drizzle
export type {Name} = typeof {names}.$inferSelect
export type New{Name} = typeof {names}.$inferInsert
