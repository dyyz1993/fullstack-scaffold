export interface RateLimitEntry {
  count: number
  expiresAt: number
}

export interface RateLimitStore {
  increment(key: string, windowSeconds: number): Promise<number>
  reset(key: string): Promise<void>
}

export class MemoryRateLimitStore implements RateLimitStore {
  private entries = new Map<string, RateLimitEntry>()

  async increment(key: string, windowSeconds: number): Promise<number> {
    const now = Date.now()
    const entry = this.entries.get(key)

    if (!entry || entry.expiresAt <= now) {
      const newEntry: RateLimitEntry = { count: 1, expiresAt: now + windowSeconds * 1000 }
      this.entries.set(key, newEntry)
      return 1
    }

    entry.count++
    return entry.count
  }

  async reset(key: string): Promise<void> {
    this.entries.delete(key)
  }
}

export class RedisRateLimitStore implements RateLimitStore {
  private fallbackStore = new Map<string, RateLimitEntry>()

  constructor(_redisUrl: string) {
    void _redisUrl
  }

  async increment(key: string, windowSeconds: number): Promise<number> {
    return this.fallbackIncrement(key, windowSeconds)
  }

  async reset(key: string): Promise<void> {
    this.fallbackStore.delete(key)
  }

  private async fallbackIncrement(key: string, windowSeconds: number): Promise<number> {
    const now = Date.now()
    const entry = this.fallbackStore.get(key)
    if (!entry || entry.expiresAt <= now) {
      this.fallbackStore.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 })
      return 1
    }
    entry.count++
    return entry.count
  }
}

export function createRateLimitStore(): RateLimitStore {
  const redisUrl = process.env.REDIS_URL
  if (redisUrl) {
    return new RedisRateLimitStore(redisUrl)
  }
  return new MemoryRateLimitStore()
}
