import { eq, asc } from 'drizzle-orm'
import type { Category } from '@shared/schemas'
import { getDb } from '@server/db'
import { pluginCategories } from '@server/db/schema'
import { generateUUID } from '@server/utils/uuid'
import { NotFoundError, ConflictError } from '@server/utils/app-error'

export interface CreateCategoryData {
  name: string
  slug: string
  description?: string | null
  icon?: string | null
}

export interface UpdateCategoryData {
  name?: string | null
  slug?: string | null
  description?: string | null
  icon?: string | null
  sortOrder?: number | null
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

export async function createCategory(data: CreateCategoryData): Promise<Category> {
  const db = await getDb()

  const existing = await db
    .select()
    .from(pluginCategories)
    .where(eq(pluginCategories.slug, data.slug))
  if (existing.length > 0) {
    throw new ConflictError(`Category with slug '${data.slug}' already exists`)
  }

  const id = generateUUID()
  const result = await db
    .insert(pluginCategories)
    .values({
      id,
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      icon: data.icon ?? null,
      sortOrder: 0,
    })
    .returning()

  return mapCategoryRow(result[0])
}

export async function updateCategory(id: string, data: UpdateCategoryData): Promise<Category> {
  const db = await getDb()

  const rows = await db.select().from(pluginCategories).where(eq(pluginCategories.id, id))
  if (rows.length === 0) {
    throw new NotFoundError('Category', id)
  }

  const updateData: Partial<typeof pluginCategories.$inferInsert> = {}
  if (data.name !== undefined && data.name !== null) updateData.name = data.name
  if (data.slug !== undefined && data.slug !== null) updateData.slug = data.slug
  if (data.description !== undefined) updateData.description = data.description
  if (data.icon !== undefined) updateData.icon = data.icon
  if (data.sortOrder !== undefined && data.sortOrder !== null) updateData.sortOrder = data.sortOrder

  const result = await db
    .update(pluginCategories)
    .set(updateData)
    .where(eq(pluginCategories.id, id))
    .returning()
  return mapCategoryRow(result[0])
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb()

  const rows = await db.select().from(pluginCategories).where(eq(pluginCategories.id, id))
  if (rows.length === 0) {
    throw new NotFoundError('Category', id)
  }

  await db.delete(pluginCategories).where(eq(pluginCategories.id, id))
}

export async function listAllCategories(): Promise<Category[]> {
  const db = await getDb()
  const rows = await db.select().from(pluginCategories).orderBy(asc(pluginCategories.sortOrder))
  return rows.map(mapCategoryRow)
}
