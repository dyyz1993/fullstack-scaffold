import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@server/module-content/services/content-service', () => ({
  getContents: vi.fn(),
  getContentById: vi.fn(),
}))

import { getContents, getContentById } from '@server/module-content/services/content-service'
import type { MockContent } from '@server/test-utils/test-isr-helper'

// Side-effect: register ISR routes into global registry
import '@server/module-content/isr'

const mockContentsData: MockContent[] = [
  {
    id: 'content-1',
    title: 'Article One',
    content: 'This is the first article body text that is long enough to be truncated.',
    category: 'article',
    status: 'published',
    author: 'Author A',
    tags: ['tag1', 'tag2'],
    viewCount: 100,
    likeCount: 10,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'content-2',
    title: 'Tutorial Two',
    content: 'A comprehensive tutorial about testing.',
    category: 'tutorial',
    status: 'published',
    author: 'Author B',
    tags: ['test', 'guide'],
    viewCount: 200,
    likeCount: 30,
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
]

describe('Content Module ISR', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('route registration', () => {
    it('should register /content route', async () => {
      const { isrRegistry } = await import('@server/core/isr-registry')
      expect(isrRegistry.match('/content')).not.toBeNull()
      expect(isrRegistry.match('/content')!.module).toBe('content')
    })

    it('should register /content/ prefix', async () => {
      const { isrRegistry } = await import('@server/core/isr-registry')
      expect(isrRegistry.match('/content/content-1')).not.toBeNull()
      expect(isrRegistry.match('/content/content-1')!.module).toBe('content')
    })

    it('should not match /content for prefix entry', async () => {
      const { isrRegistry } = await import('@server/core/isr-registry')
      // /content should match the exact entry, not prefix
      const exact = isrRegistry.match('/content')
      expect(exact).not.toBeNull()
      // The exact /content entry should fetch list data
      vi.mocked(getContents).mockResolvedValue({
        contents: mockContentsData,
        total: 2,
        page: 1,
        limit: 20,
      })
      const data = await exact!.fetch('/content', {})
      expect(data).toHaveProperty('contents')
      expect(data).toHaveProperty('total')
    })
  })

  describe('/content — list page', () => {
    it('should fetch content list', async () => {
      vi.mocked(getContents).mockResolvedValue({
        contents: mockContentsData,
        total: 2,
        page: 1,
        limit: 20,
      })

      const { isrRegistry } = await import('@server/core/isr-registry')
      const entry = isrRegistry.match('/content')!
      const data = (await entry.fetch('/content', {})) as { contents: MockContent[]; total: number }

      expect(data.contents).toHaveLength(2)
      expect(data.total).toBe(2)
    })

    it('should return correct list meta', async () => {
      const { isrRegistry } = await import('@server/core/isr-registry')
      const entry = isrRegistry.match('/content')!
      const meta = entry.meta({}, '/content')
      expect(meta.title).toContain('内容中心')
    })
  })

  describe('/content/:id — detail page', () => {
    it('should fetch content detail', async () => {
      vi.mocked(getContentById).mockResolvedValue(mockContentsData[0])

      const { isrRegistry } = await import('@server/core/isr-registry')
      const entry = isrRegistry.match('/content/content-1')!
      const data = (await entry.fetch('/content/content-1', {})) as { content: MockContent | null }

      expect(data.content).not.toBeNull()
      expect(data.content!.title).toBe('Article One')
    })

    it('should return detail meta with title', async () => {
      vi.mocked(getContentById).mockResolvedValue(mockContentsData[0])

      const { isrRegistry } = await import('@server/core/isr-registry')
      const entry = isrRegistry.match('/content/content-1')!
      const data = await entry.fetch('/content/content-1', {})
      const meta = entry.meta(data, '/content/content-1')

      expect(meta.title).toContain('Article One')
    })

    it('should return not-found meta for missing content', async () => {
      vi.mocked(getContentById).mockResolvedValue(null)

      const { isrRegistry } = await import('@server/core/isr-registry')
      const entry = isrRegistry.match('/content/missing')!
      const data = await entry.fetch('/content/missing', {})
      const meta = entry.meta(data, '/content/missing')

      expect(meta.title).toContain('内容不存在')
    })
  })
})
