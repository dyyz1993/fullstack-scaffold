/**
 * @framework-baseline 68a6e13bffb67f13
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createISRCache } from '@server/core/isr-cache'

describe('ISR Cache', () => {
  let cache: ReturnType<typeof createISRCache>

  beforeEach(() => {
    cache = createISRCache({ maxAge: 1, staleWhileRevalidate: 2 })
  })

  describe('lookup — no cache', () => {
    it('should return miss for uncached path', async () => {
      const result = await cache.lookup('/todos')
      expect(result.status).toBe('miss')
      expect(result.html).toBeNull()
    })
  })

  describe('store → lookup fresh', () => {
    it('should return fresh after store', async () => {
      await cache.store('/todos', '<html>todos</html>')
      const result = await cache.lookup('/todos')
      expect(result.status).toBe('fresh')
      expect(result.html).toBe('<html>todos</html>')
    })
  })

  describe('store → wait → lookup stale', () => {
    it('should return stale after maxAge', async () => {
      await cache.store('/todos', '<html>todos</html>')
      // Wait beyond maxAge (1s) but within staleWhileRevalidate (1+2=3s)
      await new Promise(r => setTimeout(r, 1200))
      const result = await cache.lookup('/todos')
      expect(result.status).toBe('stale')
      expect(result.html).toBe('<html>todos</html>')
    })
  })

  describe('store → wait → lookup miss (expired)', () => {
    it('should return miss after maxAge + staleWhileRevalidate', async () => {
      await cache.store('/todos', '<html>todos</html>')
      // Wait beyond both maxAge and staleWhileRevalidate
      await new Promise(r => setTimeout(r, 3500))
      const result = await cache.lookup('/todos')
      expect(result.status).toBe('miss')
      expect(result.html).toBeNull()
    })
  })

  describe('purge', () => {
    it('should purge specific path', async () => {
      await cache.store('/todos', '<html>todos</html>')
      await cache.store('/content', '<html>content</html>')

      await cache.purge('/todos')

      expect((await cache.lookup('/todos')).status).toBe('miss')
      expect((await cache.lookup('/content')).status).toBe('fresh')
    })

    it('should not error on purge of uncached path', async () => {
      await expect(cache.purge('/never-cached')).resolves.not.toThrow()
    })
  })

  describe('purgePattern', () => {
    it('should purge matching pattern', async () => {
      await cache.store('/content', '<html>list</html>')
      await cache.store('/content/article-1', '<html>a1</html>')
      await cache.store('/content/article-2', '<html>a2</html>')
      await cache.store('/todos', '<html>todos</html>')

      await cache.purgePattern('isr:/content/*')

      // /content (exact) should still be cached
      expect((await cache.lookup('/content')).status).toBe('fresh')
      // /content/* should be purged
      expect((await cache.lookup('/content/article-1')).status).toBe('miss')
      expect((await cache.lookup('/content/article-2')).status).toBe('miss')
      // /todos should be unaffected
      expect((await cache.lookup('/todos')).status).toBe('fresh')
    })
  })

  describe('full lifecycle', () => {
    it('miss → store → fresh → purge → miss', async () => {
      // Step 1: Initial miss
      let result = await cache.lookup('/todos')
      expect(result.status).toBe('miss')

      // Step 2: Store
      await cache.store('/todos', '<html>todos v1</html>')

      // Step 3: Fresh hit
      result = await cache.lookup('/todos')
      expect(result.status).toBe('fresh')
      expect(result.html).toBe('<html>todos v1</html>')

      // Step 4: Purge
      await cache.purge('/todos')

      // Step 5: Miss again
      result = await cache.lookup('/todos')
      expect(result.status).toBe('miss')
    })

    it('store v1 → purge → store v2 → returns v2', async () => {
      await cache.store('/todos', '<html>v1</html>')
      await cache.purge('/todos')
      await cache.store('/todos', '<html>v2</html>')

      const result = await cache.lookup('/todos')
      expect(result.status).toBe('fresh')
      expect(result.html).toBe('<html>v2</html>')
    })
  })
})
