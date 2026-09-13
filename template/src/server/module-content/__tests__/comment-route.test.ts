import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestClient } from '@server/test-utils/test-client'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'
import * as contentService from '../services/content-service'

describe('Comment Routes', () => {
  let contentId: string

  beforeAll(async () => {
    await setupTestDatabase()
    const created = await contentService.createContent({
      title: 'Comment Route Target',
      content: 'Content for comment route tests',
      category: 'article',
    })
    contentId = created.id
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  describe('GET /api/contents/:id/comments', () => {
    it('should return comment list without auth (public)', async () => {
      const client = createTestClient()
      const res = await client.api.contents[':id'].comments.$get({
        param: { id: contentId },
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(Array.isArray(data.data.comments)).toBe(true)
        expect(typeof data.data.total).toBe('number')
      }
    })
  })

  describe('POST /api/contents/:id/comments', () => {
    it('should reject unauthenticated comment with 401', async () => {
      const client = createTestClient()
      const res = await client.api.contents[':id'].comments.$post({
        param: { id: contentId },
        json: { body: 'anonymous comment' },
      })
      expect(res.status).toBe(401)
    })

    it('should create comment with auth and read it back', async () => {
      const client = createTestClient(undefined, {
        headers: { Authorization: 'Bearer admin-token' },
      })
      const postRes = await client.api.contents[':id'].comments.$post({
        param: { id: contentId },
        json: { body: 'authed comment' },
      })
      expect(postRes.status).toBe(201)
      const postData = await postRes.json()
      expect(postData.success).toBe(true)
      if (postData.success) {
        expect(postData.data.body).toBe('authed comment')
        expect(postData.data.userName).toBe('superadmin')
      }

      const getRes = await client.api.contents[':id'].comments.$get({
        param: { id: contentId },
      })
      expect(getRes.status).toBe(200)
      const getData = await getRes.json()
      expect(getData.success).toBe(true)
      if (getData.success) {
        expect(getData.data.total).toBe(1)
        expect(getData.data.comments[0]?.body).toBe('authed comment')
      }
    })

    it('should return 404 when commenting on non-existent content', async () => {
      const client = createTestClient(undefined, {
        headers: { Authorization: 'Bearer admin-token' },
      })
      const res = await client.api.contents[':id'].comments.$post({
        param: { id: 'content-999999' },
        json: { body: 'orphan comment' },
      })
      expect(res.status).toBe(404)
    })
  })
})
