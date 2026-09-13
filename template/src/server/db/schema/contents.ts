import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const contentStatuses = ['draft', 'published', 'archived'] as const
export type ContentStatus = (typeof contentStatuses)[number]

export const contentCategories = ['article', 'announcement', 'tutorial', 'news', 'policy'] as const
export type ContentCategory = (typeof contentCategories)[number]

export const contents = sqliteTable(
  'contents',
  {
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
  },
  table => ({
    statusIdx: index('contents_status_idx').on(table.status),
    categoryIdx: index('contents_category_idx').on(table.category),
    createdAtIdx: index('contents_created_at_idx').on(table.createdAt),
  })
)

export const contentComments = sqliteTable(
  'content_comments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    contentId: integer('content_id')
      .notNull()
      .references(() => contents.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    userName: text('user_name').notNull(),
    body: text('body').notNull(),
    // 默认值用秒（unixepoch()）：与 drizzle mode:'timestamp' 的读写语义一致，
    // 毫秒默认会让 drizzle 读成 58670 年
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  table => ({
    contentIdIdx: index('content_comments_content_id_idx').on(table.contentId),
    createdAtIdx: index('content_comments_created_at_idx').on(table.createdAt),
  })
)

export type ContentTable = typeof contents.$inferSelect
export type NewContent = typeof contents.$inferInsert
export type ContentCommentTable = typeof contentComments.$inferSelect
export type NewContentComment = typeof contentComments.$inferInsert
