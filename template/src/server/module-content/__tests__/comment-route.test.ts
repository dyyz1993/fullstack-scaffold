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
        query: {},
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
        query: {},
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

  describe('GET /api/contents/:id/comments pagination', () => {
    it('should return page/limit fields and respect query params', async () => {
      const client = createTestClient(undefined, {
        headers: { Authorization: 'Bearer user-token' },
      })
      for (let i = 1; i <= 3; i++) {
        await client.api.contents[':id'].comments.$post({
          param: { id: contentId },
          json: { body: `page comment ${i}` },
        })
      }

      const res = await client.api.contents[':id'].comments.$get({
        param: { id: contentId },
        query: { page: 2, limit: 2 },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.data.page).toBe(2)
        expect(data.data.limit).toBe(2)
        expect(data.data.total).toBeGreaterThanOrEqual(3)
        expect(data.data.comments.length).toBeLessThanOrEqual(2)
      }
    })

    it('should default to page=1 limit=20 without query', async () => {
      const client = createTestClient()
      const res = await client.api.contents[':id'].comments.$get({
        param: { id: contentId },
        query: {},
      })
      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.data.page).toBe(1)
        expect(data.data.limit).toBe(20)
      }
    })
  })

  describe('DELETE /api/contents/:id/comments/:commentId', () => {
    it('should let the author delete their own comment', async () => {
      const client = createTestClient(undefined, {
        headers: { Authorization: 'Bearer user-token' },
      })
      const postRes = await client.api.contents[':id'].comments.$post({
        param: { id: contentId },
        json: { body: 'my own comment' },
      })
      expect(postRes.status).toBe(201)
      const postData = await postRes.json()
      if (!postData.success) throw new Error('comment creation failed')
      const commentId = postData.data.id

      const delRes = await client.api.contents[':id'].comments[':commentId'].$delete({
        param: { id: contentId, commentId },
      })
      expect(delRes.status).toBe(200)
      const delData = await delRes.json()
      expect(delData.success).toBe(true)

      const getRes = await client.api.contents[':id'].comments.$get({
        param: { id: contentId },
        query: {},
      })
      const getData = await getRes.json()
      if (getData.success) {
        expect(getData.data.comments.some((c: { id: string }) => c.id === commentId)).toBe(false)
      }
    })

    it("should reject deleting another user's comment with 403", async () => {
      const authorClient = createTestClient(undefined, {
        headers: { Authorization: 'Bearer user-token' },
      })
      const postRes = await authorClient.api.contents[':id'].comments.$post({
        param: { id: contentId },
        json: { body: 'not yours' },
      })
      const postData = await postRes.json()
      if (!postData.success) throw new Error('comment creation failed')
      const commentId = postData.data.id

      const otherClient = createTestClient(undefined, {
        headers: { Authorization: 'Bearer customer-service-token' },
      })
      const delRes = await otherClient.api.contents[':id'].comments[':commentId'].$delete({
        param: { id: contentId, commentId },
      })
      expect(delRes.status).toBe(403)
    })

    it("should let super_admin delete anyone's comment", async () => {
      const authorClient = createTestClient(undefined, {
        headers: { Authorization: 'Bearer user-token' },
      })
      const postRes = await authorClient.api.contents[':id'].comments.$post({
        param: { id: contentId },
        json: { body: 'admin will remove' },
      })
      const postData = await postRes.json()
      if (!postData.success) throw new Error('comment creation failed')
      const commentId = postData.data.id

      const adminClient = createTestClient(undefined, {
        headers: { Authorization: 'Bearer super-admin-token' },
      })
      const delRes = await adminClient.api.contents[':id'].comments[':commentId'].$delete({
        param: { id: contentId, commentId },
      })
      expect(delRes.status).toBe(200)
    })

    it('should return 404 for non-existent comment', async () => {
      const client = createTestClient(undefined, {
        headers: { Authorization: 'Bearer user-token' },
      })
      const res = await client.api.contents[':id'].comments[':commentId'].$delete({
        param: { id: contentId, commentId: 'comment-999999' },
      })
      expect(res.status).toBe(404)
    })

    it('should reject unauthenticated delete with 401', async () => {
      const client = createTestClient()
      const res = await client.api.contents[':id'].comments[':commentId'].$delete({
        param: { id: contentId, commentId: 'comment-1' },
      })
      expect(res.status).toBe(401)
    })
  })
})
