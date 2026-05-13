import { eq } from 'drizzle-orm'
import type { Plugin, CreatePluginInput } from '@shared/schemas'
import { getDb } from '@server/db'
import { plugins, type PluginTable } from '@server/db/schema'
import { generateUUID } from '@server/utils/uuid'
import { NotFoundError, AuthorizationError, ConflictError } from '@server/utils/app-error'
import { parseJsonField, serializeJsonField } from '@server/utils/json'

function mapRow(row: PluginTable): Plugin {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? '',
    readme: row.readme ?? undefined,
    authorId: row.authorId,
    authorName: row.authorName,
    repositoryUrl: row.repositoryUrl ?? undefined,
    homepageUrl: row.homepageUrl ?? undefined,
    npmPackage: row.npmPackage ?? undefined,
    license: row.license ?? undefined,
    version: row.version,
    status: row.status as Plugin['status'],
    downloadCount: row.downloadCount,
    viewCount: row.viewCount,
    featured: row.featured,
    screenshotUrl: row.screenshotUrl ?? undefined,
    siteUrls: parseJsonField<string[]>(row.siteUrls),
    tags: parseJsonField<string[]>(row.tags),
    commands: parseJsonField<Array<{ name: string; description?: string }>>(row.commands),
    rejectReason: row.rejectReason ?? undefined,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }
}

export interface CreatePluginData extends CreatePluginInput {
  authorId: string
  authorName: string
  screenshotUrl?: string
  readme?: string
}

export async function createPlugin(data: CreatePluginData): Promise<Plugin> {
  const db = await getDb()

  const existing = await db.select().from(plugins).where(eq(plugins.slug, data.slug))
  if (existing.length > 0) {
    throw new ConflictError(`Plugin with slug '${data.slug}' already exists`)
  }

  const id = generateUUID()
  const now = new Date()
  const result = await db
    .insert(plugins)
    .values({
      id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      readme: data.readme ?? null,
      authorId: data.authorId,
      authorName: data.authorName,
      repositoryUrl: data.repositoryUrl ?? null,
      homepageUrl: data.homepageUrl ?? null,
      npmPackage: data.npmPackage ?? null,
      license: data.license ?? null,
      version: '0.0.1',
      status: 'pending',
      screenshotUrl: data.screenshotUrl ?? null,
      siteUrls: serializeJsonField(data.siteUrls),
      tags: serializeJsonField(data.tags),
      commands: serializeJsonField(data.commands),
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  return mapRow(result[0])
}

export interface UpdatePluginData {
  name?: string
  description?: string
  readme?: string | null
  repositoryUrl?: string | null
  homepageUrl?: string | null
  npmPackage?: string | null
  license?: string | null
  screenshotUrl?: string | null
  siteUrls?: string[] | null
  tags?: string[] | null
  commands?: Array<{ name: string; description?: string | null }> | null
}

export async function updatePlugin(
  slug: string,
  data: UpdatePluginData,
  userId: string
): Promise<Plugin> {
  const db = await getDb()

  const rows = await db.select().from(plugins).where(eq(plugins.slug, slug))
  if (rows.length === 0) {
    throw new NotFoundError('Plugin', slug)
  }

  const existing = rows[0]
  if (existing.authorId !== userId) {
    throw new AuthorizationError('Only the plugin author can update this plugin')
  }

  const updateData: Partial<PluginTable> = {
    updatedAt: new Date(),
  }

  if (data.name !== undefined) updateData.name = data.name
  if (data.description !== undefined) updateData.description = data.description
  if (data.readme !== undefined) updateData.readme = data.readme
  if (data.repositoryUrl !== undefined) updateData.repositoryUrl = data.repositoryUrl
  if (data.homepageUrl !== undefined) updateData.homepageUrl = data.homepageUrl
  if (data.npmPackage !== undefined) updateData.npmPackage = data.npmPackage
  if (data.license !== undefined) updateData.license = data.license
  if (data.screenshotUrl !== undefined) updateData.screenshotUrl = data.screenshotUrl
  if (data.siteUrls !== undefined) updateData.siteUrls = serializeJsonField(data.siteUrls)
  if (data.tags !== undefined) updateData.tags = serializeJsonField(data.tags)
  if (data.commands !== undefined) updateData.commands = serializeJsonField(data.commands)

  const result = await db.update(plugins).set(updateData).where(eq(plugins.slug, slug)).returning()
  return mapRow(result[0])
}

export async function deletePlugin(slug: string, userId: string): Promise<void> {
  const db = await getDb()

  const rows = await db.select().from(plugins).where(eq(plugins.slug, slug))
  if (rows.length === 0) {
    throw new NotFoundError('Plugin', slug)
  }

  const existing = rows[0]
  if (existing.authorId !== userId) {
    throw new AuthorizationError('Only the plugin author can delete this plugin')
  }

  await db.delete(plugins).where(eq(plugins.slug, slug))
}

export async function trackInstall(slug: string): Promise<void> {
  const db = await getDb()

  const rows = await db.select().from(plugins).where(eq(plugins.slug, slug))
  if (rows.length === 0) {
    throw new NotFoundError('Plugin', slug)
  }

  await db
    .update(plugins)
    .set({ downloadCount: rows[0].downloadCount + 1, updatedAt: new Date() })
    .where(eq(plugins.slug, slug))
}

export { mapRow, parseJsonField, serializeJsonField }
