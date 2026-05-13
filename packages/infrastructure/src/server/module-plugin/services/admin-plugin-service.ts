import { eq, desc } from 'drizzle-orm'
import type { Plugin } from '@shared/schemas'
import { getDb, getRawClient } from '@server/db'
import { plugins } from '@server/db/schema'
import { NotFoundError } from '@server/utils/app-error'
import { mapRow } from './plugin-service'

export interface AdminListOptions {
  page?: number
  limit?: number
  status?: string | null
}

export async function listPending(
  options: AdminListOptions = {}
): Promise<{ plugins: Plugin[]; total: number; page: number; limit: number }> {
  const db = await getDb()
  const page = options.page ?? 1
  const limit = options.limit ?? 20
  const offset = (page - 1) * limit

  const rows = await db
    .select()
    .from(plugins)
    .where(eq(plugins.status, 'pending'))
    .orderBy(desc(plugins.createdAt))
    .limit(limit)
    .offset(offset)

  const client = await getRawClient()
  let total = 0
  if (client && 'execute' in client) {
    const result = await client.execute(
      "SELECT COUNT(*) as count FROM plugins WHERE status = 'pending'"
    )
    total = (result.rows[0] as unknown as { count: number })?.count ?? 0
  }

  return { plugins: rows.map(mapRow), total, page, limit }
}

export async function approvePlugin(slug: string): Promise<Plugin> {
  const db = await getDb()

  const rows = await db.select().from(plugins).where(eq(plugins.slug, slug))
  if (rows.length === 0) {
    throw new NotFoundError('Plugin', slug)
  }

  const result = await db
    .update(plugins)
    .set({ status: 'approved', rejectReason: null, updatedAt: new Date() })
    .where(eq(plugins.slug, slug))
    .returning()
  return mapRow(result[0])
}

export async function rejectPlugin(slug: string, reason: string): Promise<Plugin> {
  const db = await getDb()

  const rows = await db.select().from(plugins).where(eq(plugins.slug, slug))
  if (rows.length === 0) {
    throw new NotFoundError('Plugin', slug)
  }

  const result = await db
    .update(plugins)
    .set({ status: 'rejected', rejectReason: reason, updatedAt: new Date() })
    .where(eq(plugins.slug, slug))
    .returning()
  return mapRow(result[0])
}

export async function toggleFeatured(slug: string): Promise<Plugin> {
  const db = await getDb()

  const rows = await db.select().from(plugins).where(eq(plugins.slug, slug))
  if (rows.length === 0) {
    throw new NotFoundError('Plugin', slug)
  }

  const result = await db
    .update(plugins)
    .set({ featured: !rows[0].featured, updatedAt: new Date() })
    .where(eq(plugins.slug, slug))
    .returning()
  return mapRow(result[0])
}

export async function adminRemovePlugin(slug: string): Promise<void> {
  const db = await getDb()

  const rows = await db.select().from(plugins).where(eq(plugins.slug, slug))
  if (rows.length === 0) {
    throw new NotFoundError('Plugin', slug)
  }

  await db.delete(plugins).where(eq(plugins.slug, slug))
}

export async function listAllPlugins(
  options: AdminListOptions = {}
): Promise<{ plugins: Plugin[]; total: number; page: number; limit: number }> {
  const db = await getDb()
  const page = options.page ?? 1
  const limit = options.limit ?? 20
  const offset = (page - 1) * limit

  const where = options.status
    ? eq(plugins.status, options.status as 'pending' | 'approved' | 'rejected')
    : undefined

  const rows = options.status
    ? await db
        .select()
        .from(plugins)
        .where(where!)
        .orderBy(desc(plugins.createdAt))
        .limit(limit)
        .offset(offset)
    : await db.select().from(plugins).orderBy(desc(plugins.createdAt)).limit(limit).offset(offset)

  const client = await getRawClient()
  let total = 0
  if (client && 'execute' in client) {
    const query = options.status
      ? `SELECT COUNT(*) as count FROM plugins WHERE status = '${options.status}'`
      : 'SELECT COUNT(*) as count FROM plugins'
    const result = await client.execute(query)
    total = (result.rows[0] as unknown as { count: number })?.count ?? 0
  }

  return { plugins: rows.map(mapRow), total, page, limit }
}

export async function bulkApprove(slugs: string[]): Promise<number> {
  const db = await getDb()
  let approved = 0

  for (const slug of slugs) {
    const rows = await db.select().from(plugins).where(eq(plugins.slug, slug))
    if (rows.length > 0) {
      await db
        .update(plugins)
        .set({ status: 'approved', rejectReason: null, updatedAt: new Date() })
        .where(eq(plugins.slug, slug))
      approved++
    }
  }

  return approved
}

export async function bulkReject(slugs: string[], reason: string): Promise<number> {
  const db = await getDb()
  let rejected = 0

  for (const slug of slugs) {
    const rows = await db.select().from(plugins).where(eq(plugins.slug, slug))
    if (rows.length > 0) {
      await db
        .update(plugins)
        .set({ status: 'rejected', rejectReason: reason, updatedAt: new Date() })
        .where(eq(plugins.slug, slug))
      rejected++
    }
  }

  return rejected
}
