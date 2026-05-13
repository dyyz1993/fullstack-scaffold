import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const pluginStatus = ['pending', 'approved', 'rejected'] as const
export type PluginStatus = (typeof pluginStatus)[number]

export const plugins = sqliteTable('plugins', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull().default(''),
  readme: text('readme'),
  authorId: text('author_id').notNull(),
  authorName: text('author_name').notNull(),
  repositoryUrl: text('repository_url'),
  homepageUrl: text('homepage_url'),
  npmPackage: text('npm_package'),
  license: text('license'),
  version: text('version').notNull().default('0.0.1'),
  status: text('status', { enum: pluginStatus }).notNull().default('pending'),
  downloadCount: integer('download_count').notNull().default(0),
  viewCount: integer('view_count').notNull().default(0),
  featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
  screenshotUrl: text('screenshot_url'),
  siteUrls: text('site_urls'),
  tags: text('tags'),
  commands: text('commands'),
  rejectReason: text('reject_reason'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export const pluginVersions = sqliteTable(
  'plugin_versions',
  {
    id: text('id').primaryKey(),
    pluginId: text('plugin_id')
      .notNull()
      .references(() => plugins.id, { onDelete: 'cascade' }),
    version: text('version').notNull(),
    changelog: text('changelog'),
    packageUrl: text('package_url'),
    fileSize: integer('file_size'),
    checksum: text('checksum'),
    status: text('status', { enum: pluginStatus }).notNull().default('pending'),
    publishedAt: integer('published_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  table => ({
    pluginVersionUnique: uniqueIndex('plugin_version_unique').on(table.pluginId, table.version),
  })
)

export const pluginReviews = sqliteTable(
  'plugin_reviews',
  {
    id: text('id').primaryKey(),
    pluginId: text('plugin_id')
      .notNull()
      .references(() => plugins.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    userName: text('user_name').notNull(),
    rating: integer('rating').notNull(),
    title: text('title'),
    content: text('content'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  table => ({
    pluginUserUnique: uniqueIndex('plugin_review_user_unique').on(table.pluginId, table.userId),
  })
)

export const pluginCategories = sqliteTable('plugin_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  icon: text('icon'),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const pluginCategoryMappings = sqliteTable(
  'plugin_category_mappings',
  {
    pluginId: text('plugin_id')
      .notNull()
      .references(() => plugins.id, { onDelete: 'cascade' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => pluginCategories.id, { onDelete: 'cascade' }),
  },
  table => ({
    mappingUnique: uniqueIndex('plugin_category_mapping_unique').on(
      table.pluginId,
      table.categoryId
    ),
  })
)

export type PluginTable = typeof plugins.$inferSelect
export type NewPlugin = typeof plugins.$inferInsert
export type PluginVersionTable = typeof pluginVersions.$inferSelect
export type NewPluginVersion = typeof pluginVersions.$inferInsert
export type PluginReviewTable = typeof pluginReviews.$inferSelect
export type NewPluginReview = typeof pluginReviews.$inferInsert
export type PluginCategoryTable = typeof pluginCategories.$inferSelect
export type NewPluginCategory = typeof pluginCategories.$inferInsert
