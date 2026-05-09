/**
 * @framework-baseline dd5cd4fe46320b03
 * @framework-modify
 * @reason 移除未使用的 vi import，修复 TypeScript strict 检查
 * @impact 不影响功能，仅清理代码
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { isISRRoute, generateCacheKey, createISRCache, type ISRCache } from '@server/core/isr-cache'

describe('isISRRoute', () => {
  it('matches static ISR routes', () => {
    expect(isISRRoute('/')).toBe(true)
    expect(isISRRoute('/todos')).toBe(true)
    expect(isISRRoute('/content')).toBe(true)
    expect(isISRRoute('/notifications')).toBe(true)
    expect(isISRRoute('/websocket')).toBe(true)
  })

  it('matches dynamic content routes', () => {
    expect(isISRRoute('/content/123')).toBe(true)
    expect(isISRRoute('/content/content-456')).toBe(true)
    expect(isISRRoute('/content/abc-def')).toBe(true)
  })

  it('does not match non-ISR routes', () => {
    expect(isISRRoute('/api/todos')).toBe(false)
    expect(isISRRoute('/api/health')).toBe(false)
    expect(isISRRoute('/assets/main.js')).toBe(false)
    expect(isISRRoute('/admin/dashboard')).toBe(false)
    expect(isISRRoute('/health')).toBe(false)
    expect(isISRRoute('/vite.svg')).toBe(false)
  })
})

describe('generateCacheKey', () => {
  it('normalizes root path', () => {
    expect(generateCacheKey('/')).toBe('isr:/index')
  })

  it('generates keys for regular paths', () => {
    expect(generateCacheKey('/todos')).toBe('isr:/todos')
    expect(generateCacheKey('/content/123')).toBe('isr:/content/123')
  })

  it('removes trailing slash', () => {
    expect(generateCacheKey('/todos/')).toBe('isr:/todos')
  })
})

describe('ISRCache (memory)', () => {
  let cache: ISRCache

  beforeEach(() => {
    cache = createISRCache({ maxAge: 1, staleWhileRevalidate: 1 })
  })

  it('returns miss for uncached routes', async () => {
    const result = await cache.lookup('/todos')
    expect(result.status).toBe('miss')
    expect(result.html).toBeNull()
  })

  it('stores and retrieves pages', async () => {
    await cache.store('/todos', '<html>todos</html>')
    const result = await cache.lookup('/todos')
    expect(result.status).toBe('fresh')
    expect(result.html).toBe('<html>todos</html>')
  })

  it('serves stale content after maxAge', async () => {
    cache = createISRCache({ maxAge: 0, staleWhileRevalidate: 60 })

    await cache.store('/todos', '<html>todos</html>')

    await new Promise(resolve => setTimeout(resolve, 10))

    const result = await cache.lookup('/todos')
    expect(result.status).toBe('stale')
    expect(result.html).toBe('<html>todos</html>')
  })

  it('returns miss after maxAge + staleWhileRevalidate', async () => {
    cache = createISRCache({ maxAge: 0, staleWhileRevalidate: 0 })

    await cache.store('/todos', '<html>todos</html>')

    await new Promise(resolve => setTimeout(resolve, 10))

    const result = await cache.lookup('/todos')
    expect(result.status).toBe('miss')
  })

  it('purges specific pages', async () => {
    await cache.store('/todos', '<html>todos</html>')
    await cache.store('/content', '<html>content</html>')

    await cache.purge('/todos')

    expect((await cache.lookup('/todos')).status).toBe('miss')
    expect((await cache.lookup('/content')).status).toBe('fresh')
  })

  it('purges by pattern', async () => {
    await cache.store('/content', '<html>list</html>')
    await cache.store('/content/123', '<html>detail 123</html>')
    await cache.store('/content/456', '<html>detail 456</html>')
    await cache.store('/todos', '<html>todos</html>')

    await cache.purgePattern('isr:/content/*')

    expect((await cache.lookup('/content')).status).toBe('fresh')
    expect((await cache.lookup('/content/123')).status).toBe('miss')
    expect((await cache.lookup('/content/456')).status).toBe('miss')
    expect((await cache.lookup('/todos')).status).toBe('fresh')
  })
})
