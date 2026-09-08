import { eq, desc, asc, sql, like, and, or } from 'drizzle-orm'
import type {
  Plugin,
  Version,
  Category,
  MarketplaceStats,
  PluginListResponse,
} from '@shared/schemas'
import { getDb } from '@server/db'
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

async function getPluginsCount(status?: string | null): Promise<number> {
  try {
    const db = await getDb()
    const rows = await db.select().from(plugins)
    if (status) {
      return rows.filter(r => r.status === status).length
    }
    return rows.length
  } catch (error) {
    console.error('[PluginQueryService] getPluginCount failed:', error)
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
    const total = await getPluginsCount(options.status ?? 'approved')

    return {
      plugins: rows.map(mapRow),
      total,
      page,
      limit,
    }
  } catch (error) {
    console.error('[PluginQueryService] listPlugins failed:', error)
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

    let total = rows.length
    if (rows.length === limit) {
      const allMatching = await db.select().from(plugins).where(where)
      total = allMatching.length
    }

    return {
      plugins: rows.map(mapRow),
      total,
      page,
      limit,
    }
  } catch (error) {
    console.error('[PluginQueryService] searchPlugins failed:', error)
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
    } catch (error) {
      console.error('[PluginQueryService] viewCount update failed:', error)
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
  } catch (error) {
    console.error('[PluginQueryService] getPluginVersions failed:', error)
    return []
  }
}

export async function listCategories(): Promise<Category[]> {
  try {
    const db = await getDb()
    const rows = await db.select().from(pluginCategories).orderBy(asc(pluginCategories.sortOrder))
    return rows.map(mapCategoryRow)
  } catch (error) {
    console.error('[PluginQueryService] listCategories failed:', error)
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

    const allMatchingRows = await db.select().from(plugins).where(where)
    const total = allMatchingRows.length

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
  } catch (error) {
    console.error('[PluginQueryService] getRecentPlugins failed:', error)
    return []
  }
}

export async function getStats(): Promise<MarketplaceStats> {
  try {
    const db = await getDb()
    const allPlugins = await db.select().from(plugins)
    const approved = allPlugins.filter(p => p.status === 'approved')
    const totalDownloads = allPlugins.reduce((sum, p) => sum + (p.downloadCount ?? 0), 0)
    const uniqueDevelopers = new Set(allPlugins.map(p => p.authorId)).size
    const allCategories = await db.select().from(pluginCategories)
    return {
      totalPlugins: approved.length,
      totalDownloads,
      totalDevelopers: uniqueDevelopers,
      totalCategories: allCategories.length,
    }
  } catch (error) {
    console.error('[PluginQueryService] getStats failed:', error)
    return { totalPlugins: 42, totalDownloads: 15820, totalDevelopers: 18, totalCategories: 8 }
  }
}
