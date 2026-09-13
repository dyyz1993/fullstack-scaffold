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

      const comments = await service.getComments(contentId)
      expect(comments).toHaveLength(2)
      expect(comments[0]?.body).toBe('first')
      expect(comments[1]?.body).toBe('second')
      expect(comments[1]?.userName).toBe('user2')
    })

    it('should return empty list for content without comments', async () => {
      const contentId = await createTestContent()
      const comments = await service.getComments(contentId)
      expect(comments).toEqual([])
    })

    it('should return empty list for malformed content id', async () => {
      const comments = await service.getComments('not-a-content-id')
      expect(comments).toEqual([])
    })
  })
})
