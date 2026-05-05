import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const contentStatuses = ['draft', 'published', 'archived'] as const
export type ContentStatus = (typeof contentStatuses)[number]

export const contentCategories = ['article', 'announcement', 'tutorial', 'news', 'policy'] as const
export type ContentCategory = (typeof contentCategories)[number]

export const contents = sqliteTable('contents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  excerpt: text('excerpt'),
  category: text('category', { enum: contentCategories }).notNull(),
  tags: text('tags'),
  status: text('status', { enum: contentStatuses }).notNull().default('draft'),
  author: text('author').notNull(),
  viewCount: integer('view_count').notNull().default(0),
  likeCount: integer('like_count').notNull().default(0),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export type ContentTable = typeof contents.$inferSelect
export type NewContent = typeof contents.$inferInsert
