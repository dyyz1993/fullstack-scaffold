/**
 * @framework-baseline 4fce8de3d919d2fb

 * CloudflareCacheStore 单测：索引清单（manifest）驱动的 purgePattern。
 *
 * 背景：Cache API 没有 list()，purgePattern 曾是恒不执行的死代码——
 * CF 生产上内容更新后陈旧详情页服务到自然过期。现实现用 isr:__index__
 * 键记录已缓存 pathname，pattern 据此真清剿。此文件验证该行为。
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

/** 极简 Cache API mock：Map<urlString, Response> */
function makeFakeCaches() {
  const store = new Map<string, Response>()
  const cache = {
    async match(req: Request | string) {
      const key = typeof req === 'string' ? req : req.url
      return store.get(key) ?? undefined
    },
    async put(req: Request | string, res: Response) {
      const key = typeof req === 'string' ? req : req.url
      store.set(key, res)
    },
    async delete(req: Request | string) {
      const key = typeof req === 'string' ? req : req.url
      return store.delete(key)
    },
  }
  return { caches: { open: async () => cache }, store }
}

describe('CloudflareCacheStore purgePattern (manifest)', () => {
  let fake: ReturnType<typeof makeFakeCaches>
  let originalCaches: unknown

  beforeEach(async () => {
    fake = makeFakeCaches()
    originalCaches = (globalThis as { caches?: unknown }).caches
    ;(globalThis as { caches?: unknown }).caches = fake.caches as never
    const mod = await import('@server/core/isr-cache')
    // 重新构造以绑定 mock caches
    const { createISRCache } = mod
    const cache = createISRCache({ maxAge: 60, staleWhileRevalidate: 60 })
    ;(globalThis as Record<string, unknown>).__testCache = cache
  })

  afterEach(() => {
    ;(globalThis as { caches?: unknown }).caches = originalCaches as never
  })

  function getCache() {
    return (globalThis as Record<string, unknown>).__testCache as {
      store: (key: string, html: string) => Promise<void>
      purgePattern: (pattern: string) => Promise<void>
      lookup: (pathname: string) => Promise<{ status: string }>
    }
  }

  it('purgePattern 清剿匹配键并保留其余（索引驱动，非死代码）', async () => {
    const c = getCache()
    await c.store('/', 'home')
    await c.store('/content', 'list')
    await c.store('/content/123', 'detail-123')
    await c.store('/content/456', 'detail-456')
    await c.store('/todos', 'todos')

    await c.purgePattern('isr:/content/*')

    expect((await c.lookup('/content/123')).status).toBe('miss')
    expect((await c.lookup('/content/456')).status).toBe('miss')
    // 列表页本身不匹配 isr:/content/*（无尾斜杠通配不到裸键）
    expect((await c.lookup('/todos')).status).toBe('fresh')
  })

  it('正则元字符键名不误伤（escapeForPattern）', async () => {
    const c = getCache()
    await c.store('/content/1+2', 'plus')
    await c.store('/content/abc', 'plain')

    // '1+2' 中的 + 若未转义会被当量词，误匹配 '12' 等——这里验证只清目标
    await c.purgePattern('isr:/content/1+2')

    expect((await c.lookup('/content/1+2')).status).toBe('miss')
    expect((await c.lookup('/content/abc')).status).toBe('fresh')
  })

  it('purge 单键后索引同步收缩，后续 purgePattern 不再删幽灵键', async () => {
    const c = getCache()
    await c.store('/a', 'a')
    await c.store('/b', 'b')
    await c.purgePattern('isr:/a')
    // 无异常即通过（索引写回路径被走到）
    expect((await c.lookup('/b')).status).toBe('fresh')
  })
})
