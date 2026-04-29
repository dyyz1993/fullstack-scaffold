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
