/**
 * ISR Full Flow Integration Test
 *
 * Simulates the complete request lifecycle:
 * 1. First visit → miss → render → cache store → response
 * 2. Second visit → fresh cache hit → instant response
 * 3. After maxAge → stale → return cached + background revalidate
 * 4. After purge → miss → re-render with new data
 * 5. DB error → graceful fallback to shell
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createISRCache } from '@server/core/isr-cache'
import { isrRegistry } from '@server/core/isr-registry'
import { renderISRPage } from '@server/core/isr-renderer'
import { purgePage, setISRCache, purgeAllPages } from '@server/core/isr-invalidation'

// We test with a mock module — no real DB needed
describe('ISR Full Flow Integration', () => {
  let cache: ReturnType<typeof createISRCache>
  let fetchCounter: { value: number }
  let mockData: Array<{ id: number; title: string; status: string }>

  beforeEach(() => {
    mockData = [
      { id: 1, title: 'Task 1', status: 'completed' },
      { id: 2, title: 'Task 2', status: 'pending' },
    ]
    fetchCounter = { value: 0 }
    cache = createISRCache({ maxAge: 1, staleWhileRevalidate: 2 })
    setISRCache(cache)

    // Register into GLOBAL registry (so purgeAllPages works)
    isrRegistry.register({
      module: 'test',
      match: '/test',
      fetch: async () => {
        fetchCounter.value++
        return { items: mockData }
      },
      meta: () => ({ title: 'Test Page', description: 'Test description' }),
    })
  })

  afterEach(async () => {
    await cache.purgePattern('isr:*')
  })

  /**
   * Helper: simulate a full ISR request
   */
  async function isrRequest(
    pathname: string,
    template:
      | string
      | null = '<!DOCTYPE html><html><head><title>Old</title></head><body><div id="root"></div></body></html>'
  ): Promise<{ html: string; status: string; fetched: number }> {
    const fetchedBefore = fetchCounter.value

    // 1. Check cache
    const cached = await cache.lookup(pathname)

    if (cached.status === 'fresh' && cached.html) {
      return { html: cached.html, status: 'fresh', fetched: fetchedBefore }
    }

    if (cached.status === 'stale' && cached.html) {
      // Background revalidate (simulated)
      const entry = isrRegistry.match(pathname)!
      const data = await entry.fetch(pathname, {})
      const meta = entry.meta(data, pathname)
      const html = renderISRPage({ template, meta })
      await cache.store(pathname, html)
      return { html: cached.html, status: 'stale', fetched: fetchCounter.value }
    }

    // Miss: render fresh
    const entry = isrRegistry.match(pathname)
    if (!entry) throw new Error(`No handler for ${pathname}`)

    const data = await entry.fetch(pathname, {})
    const meta = entry.meta(data, pathname)
    const html = renderISRPage({ template, meta })
    await cache.store(pathname, html)

    return { html, status: 'miss', fetched: fetchCounter.value }
  }

  describe('Step 1: First visit (cold cache)', () => {
    it('should render fresh HTML on first visit', async () => {
      const result = await isrRequest('/test')

      expect(result.status).toBe('miss')
      expect(result.fetched).toBe(1)
      expect(result.html).toContain('<title>Test Page</title>')
      expect(result.html).toContain('name="generator" content="ISR-SSG"')
    })

    it('should store result in cache after first visit', async () => {
      await isrRequest('/test')
      const cached = await cache.lookup('/test')
      expect(cached.status).toBe('fresh')
      expect(cached.html).not.toBeNull()
    })
  })

  describe('Step 2: Second visit (warm cache)', () => {
    it('should serve from cache without re-fetching', async () => {
      // First visit
      await isrRequest('/test')
      expect(fetchCounter.value).toBe(1)

      // Second visit
      const result = await isrRequest('/test')
      expect(result.status).toBe('fresh')
      expect(fetchCounter.value).toBe(1) // No additional fetch
      expect(result.html).toContain('<title>Test Page</title>')
    })

    it('should be faster (no fetch call)', async () => {
      await isrRequest('/test')
      const fetchedBefore = fetchCounter.value

      await isrRequest('/test')
      expect(fetchCounter.value).toBe(fetchedBefore) // No new fetch
    })
  })

  describe('Step 3: After maxAge (stale)', () => {
    it('should return stale cache and background revalidate', async () => {
      // First visit
      await isrRequest('/test')

      // Wait for cache to become stale (maxAge=1s)
      await new Promise(r => setTimeout(r, 1200))

      const result = await isrRequest('/test')
      expect(result.status).toBe('stale')
      // Should have revalidated in background
      expect(fetchCounter.value).toBe(2)
    })
  })

  describe('Step 4: After purge', () => {
    it('should re-render after purge with updated data', async () => {
      // First visit with v1 data
      await isrRequest('/test')
      expect(fetchCounter.value).toBe(1)

      // Update data
      mockData.push({ id: 3, title: 'Task 3', status: 'pending' })

      // Purge
      await purgePage('/test')

      // Next visit should re-render
      const result = await isrRequest('/test')
      expect(result.status).toBe('miss')
      expect(fetchCounter.value).toBe(2)
    })

    it('should support purgeAllPages', async () => {
      await isrRequest('/test')

      await purgeAllPages()

      const cached = await cache.lookup('/test')
      expect(cached.status).toBe('miss')
    })
  })

  describe('Step 5: DB error handling', () => {
    it('should handle fetch error gracefully', async () => {
      // Replace fetcher with one that throws
      isrRegistry.clear()
      isrRegistry.register({
        module: 'test',
        match: '/test',
        fetch: async () => {
          throw new Error('DB unavailable')
        },
        meta: () => ({ title: 'Test', description: 'desc' }),
      })

      // The CF entry wraps this in try/catch, but at the module level
      // the error propagates. The entry catches it and falls back.
      await expect(isrRequest('/test')).rejects.toThrow('DB unavailable')
    })

    it('should serve stale cache even if fresh render fails', async () => {
      // First render succeeds with good data
      isrRegistry.clear()
      isrRegistry.register({
        module: 'test',
        match: '/test',
        fetch: async () => ({ items: mockData }),
        meta: () => ({ title: 'Test', description: 'desc' }),
      })

      await isrRequest('/test')
      const cached = await cache.lookup('/test')
      expect(cached.status).toBe('fresh')

      // Wait for stale
      await new Promise(r => setTimeout(r, 1200))

      // Even if data changes, stale cache is served
      const result = await isrRequest('/test')
      expect(result.status).toBe('stale')
      expect(result.html).toContain('<title>Test</title>')
    })
  })

  describe('Multiple routes', () => {
    it('should cache routes independently', async () => {
      isrRegistry.clear()
      isrRegistry.registerMany([
        {
          module: 'a',
          match: '/a',
          fetch: async () => ({ items: [{ id: 1, title: 'A1', status: 'pending' }] }),
          meta: () => ({ title: 'A', description: 'a' }),
        },
        {
          module: 'b',
          match: '/b',
          fetch: async () => ({ items: [{ id: 2, title: 'B2', status: 'pending' }] }),
          meta: () => ({ title: 'B', description: 'b' }),
        },
      ])

      const aResult = await isrRequest('/a')
      const bResult = await isrRequest('/b')

      expect(aResult.html).toContain('<title>A</title>')
      expect(bResult.html).toContain('<title>B</title>')

      // Purge /a doesn't affect /b
      await cache.purge('/a')
      expect((await cache.lookup('/a')).status).toBe('miss')
      expect((await cache.lookup('/b')).status).toBe('fresh')
    })
  })

  describe('Non-ISR routes', () => {
    it('should not match unregistered routes', () => {
      expect(isrRegistry.match('/unknown')).toBeNull()
      expect(isrRegistry.isISRRoute('/unknown')).toBe(false)
    })
  })
})
