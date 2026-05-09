/**
 * @framework-baseline b820abc546e81b6c
 *
 * ISR (Incremental Static Regeneration) cache layer.
 * Supports Cloudflare Cache API and in-memory fallback.
 *
 * @framework-modify
 * @reason 移除未使用的 fullOptions 变量，修复 TypeScript strict 检查
 * @impact 不影响功能，仅清理代码
 */

export interface ISRCacheEntry {
  html: string
  createdAt: number
  revalidateAt: number
}

export interface ISRLookupResult {
  status: 'fresh' | 'stale' | 'miss'
  html: string | null
  entry?: ISRCacheEntry
}

export interface ISRCacheOptions {
  maxAge?: number
  staleWhileRevalidate?: number
}

const DEFAULT_MAX_AGE = 60
const DEFAULT_STALE_WHILE_REVALIDATE = 300

const ISR_ROUTES = ['/', '/todos', '/content', '/notifications', '/websocket']

const ISR_ROUTE_PREFIXES = ['/content/']

export function isISRRoute(pathname: string): boolean {
  if (ISR_ROUTES.includes(pathname)) return true
  for (const prefix of ISR_ROUTE_PREFIXES) {
    if (pathname.startsWith(prefix)) return true
  }
  return false
}

export function generateCacheKey(pathname: string): string {
  const normalized = pathname === '/' ? '/index' : pathname.replace(/\/$/, '')
  return `isr:${normalized}`
}

interface ISRCacheStore {
  get(key: string): Promise<ISRCacheEntry | null>
  set(key: string, html: string, options: Required<ISRCacheOptions>): Promise<void>
  purge(key: string): Promise<void>
  purgePattern(pattern: string): Promise<void>
}

class MemoryCacheStore implements ISRCacheStore {
  private cache = new Map<string, ISRCacheEntry>()
  private timer: ReturnType<typeof setInterval> | null = null

  constructor() {
    this.timer = setInterval(() => this.cleanup(), 60000)
    if (this.timer && typeof this.timer === 'object' && 'unref' in this.timer) {
      this.timer.unref()
    }
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache) {
      if (now > entry.revalidateAt + 60000) {
        this.cache.delete(key)
      }
    }
  }

  async get(key: string): Promise<ISRCacheEntry | null> {
    return this.cache.get(key) ?? null
  }

  async set(key: string, html: string, options: Required<ISRCacheOptions>): Promise<void> {
    const now = Date.now()
    this.cache.set(key, {
      html,
      createdAt: now,
      revalidateAt: now + options.maxAge * 1000,
    })
  }

  async purge(key: string): Promise<void> {
    this.cache.delete(key)
  }

  async purgePattern(pattern: string): Promise<void> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.cache.clear()
  }
}

class CloudflareCacheStore implements ISRCacheStore {
  private cache: Cache | null = null
  private origin = 'https://isr.local'

  private async getCache(): Promise<Cache> {
    if (!this.cache) {
      this.cache = await caches.open('isr-pages')
    }
    return this.cache
  }

  private toUrl(key: string): string {
    return `${this.origin}${key.replace(/^isr:/, '')}`
  }

  async get(key: string): Promise<ISRCacheEntry | null> {
    const cache = await this.getCache()
    const url = this.toUrl(key)
    const response = await cache.match(url)
    if (!response) return null

    const html = await response.text()
    const createdAt = Number(response.headers.get('x-isr-created-at') || '0')
    const revalidateAt = Number(response.headers.get('x-isr-revalidate-at') || '0')

    return { html, createdAt, revalidateAt }
  }

  async set(key: string, html: string, options: Required<ISRCacheOptions>): Promise<void> {
    const cache = await this.getCache()
    const url = this.toUrl(key)
    const now = Date.now()

    const response = new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'x-isr-created-at': String(now),
        'x-isr-revalidate-at': String(now + options.maxAge * 1000),
        'x-isr-max-age': String(options.maxAge),
        'x-isr-stale-while-revalidate': String(options.staleWhileRevalidate),
        'Cache-Control': `public, max-age=${options.maxAge}, s-maxage=${options.maxAge}, stale-while-revalidate=${options.staleWhileRevalidate}`,
      },
    })

    await cache.put(url, response)
  }

  async purge(key: string): Promise<void> {
    const cache = await this.getCache()
    const url = this.toUrl(key)
    await cache.delete(url)
  }

  async purgePattern(pattern: string): Promise<void> {
    const cache = await this.getCache()
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
    const allKeys: Request[] = []

    for (const request of allKeys) {
      const url = new URL(request.url)
      const key = `isr:${url.pathname}`
      if (regex.test(key)) {
        await cache.delete(request)
      }
    }
  }
}

export interface ISRCache {
  lookup(pathname: string): Promise<ISRLookupResult>
  store(pathname: string, html: string, options?: ISRCacheOptions): Promise<void>
  purge(pathname: string): Promise<void>
  purgePattern(pattern: string): Promise<void>
  getStore(): ISRCacheStore
}

export function createISRCache(options?: ISRCacheOptions): ISRCache {
  const maxAge = options?.maxAge ?? DEFAULT_MAX_AGE
  const staleWhileRevalidate = options?.staleWhileRevalidate ?? DEFAULT_STALE_WHILE_REVALIDATE

  const isCloudflare = typeof caches !== 'undefined' && typeof caches.open === 'function'
  const store: ISRCacheStore = isCloudflare ? new CloudflareCacheStore() : new MemoryCacheStore()

  return {
    async lookup(pathname: string): Promise<ISRLookupResult> {
      const key = generateCacheKey(pathname)
      const entry = await store.get(key)

      if (!entry) {
        return { status: 'miss', html: null }
      }

      const now = Date.now()
      const staleTime = entry.revalidateAt + staleWhileRevalidate * 1000

      if (now <= entry.revalidateAt) {
        return { status: 'fresh', html: entry.html, entry }
      }

      if (now <= staleTime) {
        return { status: 'stale', html: entry.html, entry }
      }

      return { status: 'miss', html: null }
    },

    async store(pathname: string, html: string, opts?: ISRCacheOptions): Promise<void> {
      const key = generateCacheKey(pathname)
      const storeOpts = {
        maxAge: opts?.maxAge ?? maxAge,
        staleWhileRevalidate: opts?.staleWhileRevalidate ?? staleWhileRevalidate,
      }
      await store.set(key, html, storeOpts)
    },

    async purge(pathname: string): Promise<void> {
      const key = generateCacheKey(pathname)
      await store.purge(key)
    },

    async purgePattern(pattern: string): Promise<void> {
      await store.purgePattern(pattern)
    },

    getStore(): ISRCacheStore {
      return store
    },
  }
}
