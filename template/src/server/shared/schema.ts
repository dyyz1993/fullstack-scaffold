/**
 * Drizzle database schema for Todo application
 */

import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const todos = sqliteTable('todos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export type TodoTable = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
