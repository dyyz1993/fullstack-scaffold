/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryRateLimitStore, type RateLimitStore } from '../rate-limit-store'

describe('MemoryRateLimitStore', () => {
  let store: RateLimitStore

  beforeEach(() => {
    store = new MemoryRateLimitStore()
  })

  it('should return 1 for new key', async () => {
    const count = await store.increment('127.0.0.1', 60)
    expect(count).toBe(1)
  })

  it('should increment count for existing key', async () => {
    await store.increment('127.0.0.1', 60)
    const count = await store.increment('127.0.0.1', 60)
    expect(count).toBe(2)
  })

  it('should reset count after TTL expires', async () => {
    vi.useFakeTimers()
    await store.increment('127.0.0.1', 1)
    vi.advanceTimersByTime(1001)
    const count = await store.increment('127.0.0.1', 1)
    expect(count).toBe(1)
    vi.useRealTimers()
  })

  it('should handle different keys independently', async () => {
    const c1 = await store.increment('127.0.0.1', 60)
    const c2 = await store.increment('192.168.1.1', 60)
    expect(c1).toBe(1)
    expect(c2).toBe(1)
  })
})
