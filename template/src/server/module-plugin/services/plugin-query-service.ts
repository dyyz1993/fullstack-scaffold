import { eq, desc, asc, sql, like, and, or } from 'drizzle-orm'
import type {
  Plugin,
  Version,
  Category,
  MarketplaceStats,
  PluginListResponse,
} from '@shared/schemas'
import { getDb, getRawClient } from '@server/db'
import {
  plugins,
  pluginVersions,
  pluginCategories,
  pluginCategoryMappings,
} from '@server/db/schema'
import { NotFoundError } from '@server/utils/app-error'
import { mapRow } from './plugin-service'

function mapVersionRow(row: typeof pluginVersions.$inferSelect): Version {
  return {
    id: row.id,
    pluginId: row.pluginId,
    version: row.version,
    changelog: row.changelog ?? undefined,
    packageUrl: row.packageUrl ?? undefined,
    fileSize: row.fileSize ?? undefined,
    checksum: row.checksum ?? undefined,
    status: row.status as Version['status'],
    publishedAt: row.publishedAt.getTime(),
  }
}

function mapCategoryRow(row: typeof pluginCategories.$inferSelect): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    icon: row.icon ?? undefined,
    sortOrder: row.sortOrder,
  }
}

async function getCount(tableName: string, whereClause: string = ''): Promise<number> {
  try {
    const client = await getRawClient()
    if (!client || !('execute' in client)) return 0
    const query = whereClause
      ? `SELECT COUNT(*) as count FROM ${tableName} WHERE ${whereClause}`
      : `SELECT COUNT(*) as count FROM ${tableName}`
    const result = await client.execute(query)
    const row = result.rows[0] as unknown as { count: number } | undefined
    return row?.count ?? 0
  } catch {
    return 0
  }
}

export interface ListOptions {
  page?: number
  limit?: number
  status?: string | null
  sort?: 'newest' | 'popular' | 'downloads' | 'name'
  featured?: boolean | null
}

export async function listPlugins(options: ListOptions = {}): Promise<PluginListResponse> {
  try {
    const db = await getDb()
    const page = options.page ?? 1
    const limit = options.limit ?? 20
    const offset = (page - 1) * limit

    const conditions: ReturnType<typeof eq>[] = []
    if (options.status) {
      conditions.push(eq(plugins.status, options.status as 'pending' | 'approved' | 'rejected'))
    } else {
      conditions.push(eq(plugins.status, 'approved'))
    }
    if (options.featured !== undefined && options.featured !== null) {
      conditions.push(eq(plugins.featured, options.featured))
    }

    const where = conditions.length > 1 ? and(...conditions) : conditions[0]

    let orderExpr
    switch (options.sort) {
      case 'popular':
        orderExpr = desc(plugins.viewCount)
        break
      case 'downloads':
        orderExpr = desc(plugins.downloadCount)
        break
      case 'name':
        orderExpr = asc(plugins.name)
        break
      default:
        orderExpr = desc(plugins.createdAt)
    }

    const rows = await db
      .select()
      .from(plugins)
      .where(where)
      .orderBy(orderExpr)
      .limit(limit)
      .offset(offset)
    const total = await getCount(
      'plugins',
      options.status ? `status = '${options.status}'` : "status = 'approved'"
    )

    return {
      plugins: rows.map(mapRow),
      total,
      page,
      limit,
    }
  } catch {
    return { plugins: [], total: 0, page: options.page ?? 1, limit: options.limit ?? 20 }
  }
}

export async function searchPlugins(
  query: string,
  options: { page?: number; limit?: number; category?: string | null } = {}
): Promise<PluginListResponse> {
  try {
    const db = await getDb()
    const page = options.page ?? 1
    const limit = options.limit ?? 20
    const offset = (page - 1) * limit

    const searchTerm = `%${query}%`
    const conditions = [
      eq(plugins.status, 'approved'),
      or(
        like(plugins.name, searchTerm),
        like(plugins.description, searchTerm),
        like(plugins.tags, searchTerm),
        like(plugins.authorName, searchTerm)
      )!,
    ]

    if (options.category) {
      const catRows = await db
        .select()
        .from(pluginCategories)
        .where(eq(pluginCategories.slug, options.category))
      if (catRows.length > 0) {
        const mappingRows = await db
          .select()
          .from(pluginCategoryMappings)
          .where(eq(pluginCategoryMappings.categoryId, catRows[0].id))
        if (mappingRows.length > 0) {
          const ids = mappingRows.map(p => p.pluginId)
          conditions.push(
            sql`${plugins.id} IN (${sql.join(
              ids.map(id => sql`${id}`),
              sql`, `
            )})`
          )
        }
      }
    }

    const where = and(...conditions)

    const rows = await db
      .select()
      .from(plugins)
      .where(where)
      .orderBy(desc(plugins.downloadCount))
      .limit(limit)
      .offset(offset)

    const client = await getRawClient()
    let total = 0
    if (client && 'execute' in client) {
      try {
        const escapedQuery = query.replace(/'/g, "''")
        const result = await client.execute(
          `SELECT COUNT(*) as count FROM plugins WHERE status = 'approved' AND (name LIKE '%${escapedQuery}%' OR description LIKE '%${escapedQuery}%' OR tags LIKE '%${escapedQuery}%' OR author_name LIKE '%${escapedQuery}%')`
        )
        total = (result.rows[0] as unknown as { count: number })?.count ?? 0
      } catch {
        total = 0
      }
    }

    return {
      plugins: rows.map(mapRow),
      total,
      page,
      limit,
    }
  } catch {
    return { plugins: [], total: 0, page: options.page ?? 1, limit: options.limit ?? 20 }
  }
}

export async function getPluginBySlug(slug: string): Promise<Plugin> {
  try {
    const db = await getDb()

    const rows = await db.select().from(plugins).where(eq(plugins.slug, slug))
    if (rows.length === 0) {
      throw new NotFoundError('Plugin', slug)
    }

    try {
      await db
        .update(plugins)
        .set({ viewCount: rows[0].viewCount + 1 })
        .where(eq(plugins.slug, slug))
    } catch {
      // view count update is non-critical
    }

    return mapRow(rows[0])
  } catch (error) {
    if (NotFoundError && error instanceof NotFoundError) throw error
    throw new NotFoundError('Plugin', slug)
  }
}

export async function getVersions(pluginId: string): Promise<Version[]> {
  try {
    const db = await getDb()
    const rows = await db
      .select()
      .from(pluginVersions)
      .where(eq(pluginVersions.pluginId, pluginId))
      .orderBy(desc(pluginVersions.publishedAt))
    return rows.map(mapVersionRow)
  } catch {
    return []
  }
}

export async function listCategories(): Promise<Category[]> {
  try {
    const db = await getDb()
    const rows = await db.select().from(pluginCategories).orderBy(asc(pluginCategories.sortOrder))
    return rows.map(mapCategoryRow)
  } catch {
    return []
  }
}

export async function getPluginsByCategory(
  categorySlug: string,
  options: { page?: number; limit?: number } = {}
): Promise<PluginListResponse> {
  try {
    const db = await getDb()
    const page = options.page ?? 1
    const limit = options.limit ?? 20
    const offset = (page - 1) * limit

    const catRows = await db
      .select()
      .from(pluginCategories)
      .where(eq(pluginCategories.slug, categorySlug))
    if (catRows.length === 0) {
      throw new NotFoundError('Category', categorySlug)
    }

    const categoryId = catRows[0].id
    const mappingRows = await db
      .select()
      .from(pluginCategoryMappings)
      .where(eq(pluginCategoryMappings.categoryId, categoryId))
    const ids = mappingRows.map(p => p.pluginId)

    if (ids.length === 0) {
      return { plugins: [], total: 0, page, limit }
    }

    const where = and(
      eq(plugins.status, 'approved'),
      sql`${plugins.id} IN (${sql.join(
        ids.map(id => sql`${id}`),
        sql`, `
      )})`
    )

    const rows = await db
      .select()
      .from(plugins)
      .where(where)
      .orderBy(desc(plugins.downloadCount))
      .limit(limit)
      .offset(offset)

    const client = await getRawClient()
    let total = 0
    if (client && 'execute' in client) {
      try {
        const idsList = ids.map(id => `'${id}'`).join(',')
        const result = await client.execute(
          `SELECT COUNT(*) as count FROM plugins WHERE status = 'approved' AND id IN (${idsList})`
        )
        total = (result.rows[0] as unknown as { count: number })?.count ?? 0
      } catch {
        total = 0
      }
    }

    return {
      plugins: rows.map(mapRow),
      total,
      page,
      limit,
    }
  } catch (error) {
    if (NotFoundError && error instanceof NotFoundError) throw error
    return { plugins: [], total: 0, page: options.page ?? 1, limit: options.limit ?? 20 }
  }
}

export async function listMyPlugins(userId: string): Promise<Plugin[]> {
  try {
    const db = await getDb()
    const rows = await db
      .select()
      .from(plugins)
      .where(eq(plugins.authorId, userId))
      .orderBy(desc(plugins.createdAt))
    return rows.map(mapRow)
  } catch {
    return []
  }
}

export async function getStats(): Promise<MarketplaceStats> {
  try {
    const client = await getRawClient()

    if (!client || !('execute' in client)) {
      return { totalPlugins: 0, totalDownloads: 0, totalDevelopers: 0, totalCategories: 0 }
    }

    const [totalResult, downloadResult, developerResult, categoryResult] = await Promise.all([
      client.execute("SELECT COUNT(*) as count FROM plugins WHERE status = 'approved'"),
      client.execute('SELECT COALESCE(SUM(download_count), 0) as total FROM plugins'),
      client.execute('SELECT COUNT(DISTINCT author_id) as count FROM plugins'),
      client.execute('SELECT COUNT(*) as count FROM plugin_categories'),
    ])

    return {
      totalPlugins: (totalResult.rows[0] as unknown as { count: number })?.count ?? 0,
      totalDownloads: (downloadResult.rows[0] as unknown as { total: number })?.total ?? 0,
      totalDevelopers: (developerResult.rows[0] as unknown as { count: number })?.count ?? 0,
      totalCategories: (categoryResult.rows[0] as unknown as { count: number })?.count ?? 0,
    }
  } catch {
    return { totalPlugins: 0, totalDownloads: 0, totalDevelopers: 0, totalCategories: 0 }
  }
}
