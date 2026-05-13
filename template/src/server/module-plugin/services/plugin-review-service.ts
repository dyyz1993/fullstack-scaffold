import { eq, and } from 'drizzle-orm'
import type { Review } from '@shared/schemas'
import { getDb } from '@server/db'
import { pluginReviews, plugins } from '@server/db/schema'
import { generateUUID } from '@server/utils/uuid'
import { NotFoundError, AuthorizationError, ConflictError } from '@server/utils/app-error'

export interface SubmitReviewData {
  pluginId: string
  userId: string
  userName: string
  rating: number
  title?: string | null
  content?: string | null
}

function mapReviewRow(row: typeof pluginReviews.$inferSelect): Review {
  return {
    id: row.id,
    pluginId: row.pluginId,
    userId: row.userId,
    userName: row.userName,
    rating: row.rating,
    title: row.title ?? undefined,
    content: row.content ?? undefined,
    createdAt: row.createdAt.getTime(),
  }
}

export async function submitReview(data: SubmitReviewData): Promise<Review> {
  const db = await getDb()

  const pluginRows = await db.select().from(plugins).where(eq(plugins.id, data.pluginId))
  if (pluginRows.length === 0) {
    throw new NotFoundError('Plugin', data.pluginId)
  }

  const existing = await db
    .select()
    .from(pluginReviews)
    .where(and(eq(pluginReviews.pluginId, data.pluginId), eq(pluginReviews.userId, data.userId)))
  if (existing.length > 0) {
    throw new ConflictError('You have already reviewed this plugin')
  }

  const id = generateUUID()
  const now = new Date()
  const result = await db
    .insert(pluginReviews)
    .values({
      id,
      pluginId: data.pluginId,
      userId: data.userId,
      userName: data.userName,
      rating: data.rating,
      title: data.title ?? null,
      content: data.content ?? null,
      createdAt: now,
    })
    .returning()

  return mapReviewRow(result[0])
}

export async function getReviews(pluginId: string): Promise<Review[]> {
  const db = await getDb()
  const rows = await db
    .select()
    .from(pluginReviews)
    .where(eq(pluginReviews.pluginId, pluginId))
    .orderBy(pluginReviews.createdAt)
  return rows.map(mapReviewRow)
}

export async function deleteReview(reviewId: string, userId: string): Promise<void> {
  const db = await getDb()

  const rows = await db.select().from(pluginReviews).where(eq(pluginReviews.id, reviewId))
  if (rows.length === 0) {
    throw new NotFoundError('Review', reviewId)
  }

  if (rows[0].userId !== userId) {
    throw new AuthorizationError('Only the review author can delete this review')
  }

  await db.delete(pluginReviews).where(eq(pluginReviews.id, reviewId))
}

export async function getReviewById(reviewId: string): Promise<Review | null> {
  const db = await getDb()
  const rows = await db.select().from(pluginReviews).where(eq(pluginReviews.id, reviewId))
  if (rows.length === 0) return null
  return mapReviewRow(rows[0])
}
