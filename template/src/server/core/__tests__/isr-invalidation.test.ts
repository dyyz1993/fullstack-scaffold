/**
 * @framework-baseline 202ba4a1c53d59e3
 * @framework-modify
 * @reason 移除未使用的 vi import，修复 TypeScript strict 检查
 * @impact 不影响功能，仅清理代码
 */

import { describe, it, expect } from 'vitest'
import {
  purgePage,
  purgeContentPages,
  purgeAllPages,
  setISRCache,
  getISRCache,
} from '@server/core/isr-invalidation'
import { createISRCache } from '@server/core/isr-cache'

// Side-effect: 注册 ISR 路由到全局 registry（purgeAllPages 遍历它）。
// content 模块在部分 preset 中不存在 —— 可选导入，缺省时跳过
import '@server/module-todos/isr'
const contentIsrModule = '@server/module-content/isr'
let hasContentModule = false
try {
  await import(/* @vite-ignore */ contentIsrModule)
  hasContentModule = true
} catch {
  // preset 无 content 模块
}

describe('isr-invalidation', () => {
  it('returns null cache when not set', () => {
    expect(getISRCache()).toBeNull()
  })

  it('sets and gets cache', () => {
    const cache = createISRCache()
    setISRCache(cache)
    expect(getISRCache()).toBe(cache)
  })

  describe('with cache set', () => {
    beforeEach(() => {
      const cache = createISRCache()
      setISRCache(cache)
    })

    it('purgePage purges specific page', async () => {
      const cache = getISRCache()!
      await cache.store('/todos', '<html>todos</html>')
      expect((await cache.lookup('/todos')).status).toBe('fresh')

      await purgePage('/todos')
      expect((await cache.lookup('/todos')).status).toBe('miss')
    })

    it('purgeContentPages purges content list and details', async () => {
      const cache = getISRCache()!
      await cache.store('/content', '<html>list</html>')
      await cache.store('/content/123', '<html>detail</html>')
      await cache.store('/todos', '<html>todos</html>')

      await purgeContentPages()

      expect((await cache.lookup('/content')).status).toBe('miss')
      expect((await cache.lookup('/content/123')).status).toBe('miss')
      expect((await cache.lookup('/todos')).status).toBe('fresh')
    })

    it('purgeAllPages purges everything', async () => {
      const cache = getISRCache()!
      await cache.store('/', '<html>home</html>')
      await cache.store('/todos', '<html>todos</html>')
      await cache.store('/content', '<html>content</html>')
      await cache.store('/content/123', '<html>detail</html>')

      await purgeAllPages()

      expect((await cache.lookup('/')).status).toBe('miss')
      expect((await cache.lookup('/todos')).status).toBe('miss')
      if (hasContentModule) {
        // content 相关页仅在 preset 含 content 模块时被注册、才可被清理
        expect((await cache.lookup('/content')).status).toBe('miss')
        expect((await cache.lookup('/content/123')).status).toBe('miss')
      }
    })
  })
})
