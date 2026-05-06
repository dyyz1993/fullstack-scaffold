import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as service from '../services/content-service'
import type { CreateContentInput } from '@shared/modules/content'
import { setupTestDatabase, cleanupTestDatabase } from '@server/db/test-setup'

describe('Content Service', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  describe('getContents', () => {
    it('should return all contents', async () => {
      const result = await service.getContents()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('getContentById', () => {
    it('should return null for non-existent content', async () => {
      const result = await service.getContentById('content-999999')
      expect(result).toBeNull()
    })
  })

  describe('createContent', () => {
    it('should create a new content', async () => {
      const data: CreateContentInput = {
        title: 'Test Title',
        content: 'Test Content',
        category: 'article',
      }
      const result = await service.createContent(data)
      expect(result).toMatchObject({
        title: 'Test Title',
        category: 'article',
      })
    })
  })

  describe('updateContent', () => {
    it('should return null for non-existent content', async () => {
      const result = await service.updateContent('content-999999', {})
      expect(result).toBeNull()
    })
  })

  describe('deleteContent', () => {
    it('should delete an existing content', async () => {
      const data: CreateContentInput = {
        title: 'To Delete',
        content: 'Content to delete',
        category: 'article',
      }
      const created = await service.createContent(data)
      const result = await service.deleteContent(created.id)
      expect(result.success).toBe(true)
    })

    it('should return false for non-existent content', async () => {
      const result = await service.deleteContent('content-999999')
      expect(result.success).toBe(false)
    })
  })

  describe('publishContent', () => {
    it('should publish a draft content', async () => {
      const data: CreateContentInput = {
        title: 'To Publish',
        content: 'Content to publish',
        category: 'article',
      }
      const created = await service.createContent(data)
      const result = await service.publishContent(created.id)
      expect(result).not.toBeNull()
      expect(result?.status).toBe('published')
    })

    it('should return null for non-existent content', async () => {
      const result = await service.publishContent('content-999999')
      expect(result).toBeNull()
    })
  })

  describe('archiveContent', () => {
    it('should archive a published content', async () => {
      const data: CreateContentInput = {
        title: 'To Archive',
        content: 'Content to archive',
        category: 'article',
      }
      const created = await service.createContent(data)
      await service.publishContent(created.id)
      const result = await service.archiveContent(created.id)
      expect(result).not.toBeNull()
      expect(result?.status).toBe('archived')
    })

    it('should return null for non-existent content', async () => {
      const result = await service.archiveContent('content-999999')
      expect(result).toBeNull()
    })
  })
})
