import { describe, it, expect } from 'bun:test'
import * as service from '../services/content-service'
import type { CreateContentInput } from '@shared/modules/content'

describe('Content Service', () => {
  describe('getContents', () => {
    it('should return all contents', async () => {
      const result = await service.getContents()
      expect(result).toBeArray()
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('getContentById', () => {
    it('should return null for non-existent content', async () => {
      const result = await service.getContentById('non-existent')
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
      const result = await service.updateContent('non-existent', {})
      expect(result).toBeNull()
    })
  })
})
