import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import * as reviewService from '../services/plugin-review-service'
import { getRawClient, getDb } from '@server/db'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'
import { NotFoundError, AuthorizationError, ConflictError } from '@server/utils/app-error'

async function clearPluginTables() {
  const client = await getRawClient()
  if (client && 'execute' in client) {
    await client.execute('DELETE FROM plugin_reviews')
    await client.execute('DELETE FROM plugin_versions')
    await client.execute('DELETE FROM plugin_category_mappings')
    await client.execute('DELETE FROM plugins')
  }
}

async function insertTestPlugin(overrides: Record<string, unknown> = {}) {
  const client = await getRawClient()
  if (!client || !('execute' in client)) throw new Error('No DB client')

  const id = overrides.id ?? 'test-plugin-id'
  const now = Date.now()
  await client.execute({
    sql: `INSERT INTO plugins (id, name, slug, description, author_id, author_name, version, status, download_count, view_count, featured, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id as string,
      (overrides.name ?? 'Test Plugin') as string,
      (overrides.slug ?? 'test-plugin') as string,
      (overrides.description ?? 'A test plugin') as string,
      (overrides.authorId ?? 'user-1') as string,
      (overrides.authorName ?? 'Test User') as string,
      (overrides.version ?? '0.0.1') as string,
      (overrides.status ?? 'approved') as string,
      (overrides.downloadCount ?? 0) as number,
      (overrides.viewCount ?? 0) as number,
      (overrides.featured === true ? 1 : 0) as number,
      (overrides.createdAt ?? now) as number,
      (overrides.updatedAt ?? now) as number,
    ],
  })
  return id
}

async function insertTestReview(overrides: Record<string, unknown> = {}) {
  const client = await getRawClient()
  if (!client || !('execute' in client)) throw new Error('No DB client')

  const id = overrides.id ?? 'test-review-id'
  const now = Date.now()
  await client.execute({
    sql: `INSERT INTO plugin_reviews (id, plugin_id, user_id, user_name, rating, title, content, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id as string,
      (overrides.pluginId ?? 'test-plugin-id') as string,
      (overrides.userId ?? 'user-1') as string,
      (overrides.userName ?? 'Reviewer') as string,
      (overrides.rating ?? 5) as number,
      (overrides.title ?? null) as string | null,
      (overrides.content ?? null) as string | null,
      (overrides.createdAt ?? now) as number,
    ],
  })
  return id
}

describe('Plugin Review Service', () => {
  beforeAll(async () => {
    await setupTestDatabase()
    const db = await getDb()
    expect(db).toBeDefined()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await clearPluginTables()
  })

  afterEach(async () => {
    await clearPluginTables()
    vi.clearAllMocks()
  })

  describe('submitReview', () => {
    it('should submit a review for an existing plugin', async () => {
      await insertTestPlugin({ id: 'plugin-1', slug: 'reviewed-plugin' })

      const review = await reviewService.submitReview({
        pluginId: 'plugin-1',
        userId: 'user-1',
        userName: 'Alice',
        rating: 4,
        title: 'Great plugin',
        content: 'Very useful',
      })

      expect(review.id).toBeDefined()
      expect(review.pluginId).toBe('plugin-1')
      expect(review.userId).toBe('user-1')
      expect(review.userName).toBe('Alice')
      expect(review.rating).toBe(4)
      expect(review.title).toBe('Great plugin')
      expect(review.content).toBe('Very useful')
      expect(review.createdAt).toBeDefined()
    })

    it('should submit a review without optional fields', async () => {
      await insertTestPlugin({ id: 'plugin-2', slug: 'minimal-review' })

      const review = await reviewService.submitReview({
        pluginId: 'plugin-2',
        userId: 'user-1',
        userName: 'Bob',
        rating: 3,
      })

      expect(review.rating).toBe(3)
      expect(review.title).toBeUndefined()
      expect(review.content).toBeUndefined()
    })

    it('should throw NotFoundError for non-existent plugin', async () => {
      await expect(
        reviewService.submitReview({
          pluginId: 'non-existent',
          userId: 'user-1',
          userName: 'Alice',
          rating: 5,
        })
      ).rejects.toThrow(NotFoundError)
    })

    it('should throw ConflictError when user already reviewed', async () => {
      await insertTestPlugin({ id: 'plugin-3', slug: 'dup-review-plugin' })
      await insertTestReview({
        id: 'existing-review',
        pluginId: 'plugin-3',
        userId: 'user-1',
      })

      await expect(
        reviewService.submitReview({
          pluginId: 'plugin-3',
          userId: 'user-1',
          userName: 'Alice',
          rating: 5,
        })
      ).rejects.toThrow(ConflictError)
    })

    it('should allow different users to review the same plugin', async () => {
      await insertTestPlugin({ id: 'plugin-4', slug: 'multi-review' })
      await insertTestReview({
        id: 'review-user1',
        pluginId: 'plugin-4',
        userId: 'user-1',
      })

      const review = await reviewService.submitReview({
        pluginId: 'plugin-4',
        userId: 'user-2',
        userName: 'Bob',
        rating: 2,
      })

      expect(review.userId).toBe('user-2')
      expect(review.rating).toBe(2)
    })
  })

  describe('getReviews', () => {
    it('should return reviews for a plugin', async () => {
      await insertTestPlugin({ id: 'plugin-5', slug: 'get-reviews' })
      await insertTestReview({ id: 'r1', pluginId: 'plugin-5', userId: 'u1', userName: 'A', rating: 5 })
      await insertTestReview({ id: 'r2', pluginId: 'plugin-5', userId: 'u2', userName: 'B', rating: 3 })

      const reviews = await reviewService.getReviews('plugin-5')

      expect(reviews).toHaveLength(2)
    })

    it('should return empty array for plugin with no reviews', async () => {
      await insertTestPlugin({ id: 'plugin-6', slug: 'no-reviews' })

      const reviews = await reviewService.getReviews('plugin-6')

      expect(reviews).toEqual([])
    })

    it('should only return reviews for the specified plugin', async () => {
      await insertTestPlugin({ id: 'plugin-7a', slug: 'review-target-a' })
      await insertTestPlugin({ id: 'plugin-7b', slug: 'review-target-b' })
      await insertTestReview({ id: 'r3', pluginId: 'plugin-7a', userId: 'u1', rating: 5 })
      await insertTestReview({ id: 'r4', pluginId: 'plugin-7b', userId: 'u2', rating: 1 })

      const reviews = await reviewService.getReviews('plugin-7a')

      expect(reviews).toHaveLength(1)
      expect(reviews[0].pluginId).toBe('plugin-7a')
    })
  })

  describe('deleteReview', () => {
    it('should delete a review by its author', async () => {
      await insertTestPlugin({ id: 'plugin-8', slug: 'delete-review' })
      await insertTestReview({ id: 'r-del', pluginId: 'plugin-8', userId: 'user-1' })

      await reviewService.deleteReview('r-del', 'user-1')

      const reviews = await reviewService.getReviews('plugin-8')
      expect(reviews).toHaveLength(0)
    })

    it('should throw NotFoundError for non-existent review', async () => {
      await expect(reviewService.deleteReview('non-existent', 'user-1')).rejects.toThrow(
        NotFoundError
      )
    })

    it('should throw AuthorizationError when non-author tries to delete', async () => {
      await insertTestPlugin({ id: 'plugin-9', slug: 'auth-delete' })
      await insertTestReview({ id: 'r-auth', pluginId: 'plugin-9', userId: 'user-1' })

      await expect(reviewService.deleteReview('r-auth', 'user-2')).rejects.toThrow(
        AuthorizationError
      )
    })
  })

  describe('getReviewById', () => {
    it('should return a review by id', async () => {
      await insertTestPlugin({ id: 'plugin-10', slug: 'get-by-id' })
      await insertTestReview({
        id: 'r-fetch',
        pluginId: 'plugin-10',
        userId: 'user-1',
        userName: 'Alice',
        rating: 5,
        title: 'Excellent',
      })

      const review = await reviewService.getReviewById('r-fetch')

      expect(review).not.toBeNull()
      expect(review!.id).toBe('r-fetch')
      expect(review!.rating).toBe(5)
      expect(review!.title).toBe('Excellent')
    })

    it('should return null for non-existent review', async () => {
      const review = await reviewService.getReviewById('non-existent')

      expect(review).toBeNull()
    })
  })
})
