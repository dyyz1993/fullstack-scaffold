import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as service from '../services/comment-service'
import * as contentService from '../services/content-service'
import type { CreateContentInput } from '@shared/modules/content'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'

const AUTHOR = { userId: 'user-1', userName: 'user' }

async function createTestContent(): Promise<string> {
  const data: CreateContentInput = {
    title: 'Comment Target',
    content: 'Content for comments',
    category: 'article',
  }
  const created = await contentService.createContent(data)
  return created.id
}

describe('Comment Service', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  describe('createComment', () => {
    it('should create a comment on existing content', async () => {
      const contentId = await createTestContent()
      const result = await service.createComment(contentId, AUTHOR, { body: '第一条评论' })
      expect(result).not.toBeNull()
      expect(result).toMatchObject({
        contentId,
        userId: 'user-1',
        userName: 'user',
        body: '第一条评论',
      })
    })

    it('should return null for non-existent content', async () => {
      const result = await service.createComment('content-999999', AUTHOR, { body: 'no target' })
      expect(result).toBeNull()
    })
  })

  describe('getComments', () => {
    it('should return comments ordered by creation time', async () => {
      const contentId = await createTestContent()
      await service.createComment(contentId, AUTHOR, { body: 'first' })
      await service.createComment(
        contentId,
        { userId: 'user-2', userName: 'user2' },
        { body: 'second' }
      )

      const result = await service.getComments(contentId)
      expect(result.comments).toHaveLength(2)
      expect(result.comments[0]?.body).toBe('first')
      expect(result.comments[1]?.body).toBe('second')
      expect(result.comments[1]?.userName).toBe('user2')
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })

    it('should return empty list for content without comments', async () => {
      const contentId = await createTestContent()
      const result = await service.getComments(contentId)
      expect(result.comments).toEqual([])
      expect(result.total).toBe(0)
    })

    it('should return empty list for malformed content id', async () => {
      const result = await service.getComments('not-a-content-id')
      expect(result.comments).toEqual([])
    })

    it('should paginate comments without changing order', async () => {
      const contentId = await createTestContent()
      for (let i = 1; i <= 5; i++) {
        await service.createComment(contentId, AUTHOR, { body: `comment-${i}` })
      }

      const page1 = await service.getComments(contentId, { page: 1, limit: 2 })
      expect(page1.comments.map(c => c.body)).toEqual(['comment-1', 'comment-2'])
      expect(page1.total).toBe(5)
      expect(page1.page).toBe(1)
      expect(page1.limit).toBe(2)

      const page3 = await service.getComments(contentId, { page: 3, limit: 2 })
      expect(page3.comments.map(c => c.body)).toEqual(['comment-5'])
      expect(page3.total).toBe(5)

      const beyond = await service.getComments(contentId, { page: 9, limit: 2 })
      expect(beyond.comments).toEqual([])
      expect(beyond.total).toBe(5)
    })
  })

  describe('getComment', () => {
    it('should return a comment belonging to the content', async () => {
      const contentId = await createTestContent()
      const created = await service.createComment(contentId, AUTHOR, { body: 'target' })
      expect(created).not.toBeNull()

      const found = await service.getComment(contentId, created!.id)
      expect(found?.body).toBe('target')
    })

    it('should return null for comment under a different content', async () => {
      const contentId = await createTestContent()
      const otherContentId = await createTestContent()
      const created = await service.createComment(contentId, AUTHOR, { body: 'mine' })

      const found = await service.getComment(otherContentId, created!.id)
      expect(found).toBeNull()
    })

    it('should return null for malformed comment id', async () => {
      const contentId = await createTestContent()
      const found = await service.getComment(contentId, 'not-a-comment-id')
      expect(found).toBeNull()
    })
  })

  describe('deleteComment', () => {
    it('should delete an existing comment', async () => {
      const contentId = await createTestContent()
      const created = await service.createComment(contentId, AUTHOR, { body: 'to delete' })
      expect(created).not.toBeNull()

      const deleted = await service.deleteComment(created!.id)
      expect(deleted).toBe(true)
      expect(await service.getComment(contentId, created!.id)).toBeNull()
    })

    it('should return false for non-existent comment', async () => {
      expect(await service.deleteComment('comment-999999')).toBe(false)
    })

    it('should return false for malformed comment id', async () => {
      expect(await service.deleteComment('garbage')).toBe(false)
    })
  })
})
