/**
 * @vitest-environment node
 */
import { describe, it, expect, afterEach } from 'vitest'
import {
  createRateLimitStore,
  MemoryRateLimitStore,
  RedisRateLimitStore,
} from '../rate-limit-store'

describe('createRateLimitStore', () => {
  const originalEnv = process.env.REDIS_URL

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.REDIS_URL = originalEnv
    } else {
      delete process.env.REDIS_URL
    }
  })

  it('should return MemoryRateLimitStore when REDIS_URL is not set', () => {
    delete process.env.REDIS_URL
    const store = createRateLimitStore()
    expect(store).toBeInstanceOf(MemoryRateLimitStore)
  })

  it('should return RedisRateLimitStore when REDIS_URL is set', () => {
    process.env.REDIS_URL = 'redis://localhost:6379'
    const store = createRateLimitStore()
    expect(store).toBeInstanceOf(RedisRateLimitStore)
  })
})

describe('RedisRateLimitStore', () => {
  it('should implement RateLimitStore interface', () => {
    const store = new RedisRateLimitStore('redis://localhost:6379')
    expect(typeof store.increment).toBe('function')
    expect(typeof store.reset).toBe('function')
  })
})
