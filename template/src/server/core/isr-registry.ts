/**
 * @framework-baseline faa47d8c6e71847d
 *
 *
 * @framework-modify
 * @reason prettier 格式化与注释结构整理（无逻辑改动）
 * @impact 框架文件维护性修改，行为见测试
 */

/**
 * ISR Route Registry — modules register their ISR routes here.
 * Full SSG mode: fetches data for meta tags AND pre-populates stores for React SSR.
 * The CF entry and ISR cache use this to discover which routes need ISR.
 */

export type ISRMatcher = string | ((pathname: string) => boolean)

export interface ISRRouterContext {
  /** D1 database binding (Cloudflare) or null (Node.js / test) */
  db?: unknown
  /** Raw env object (for module-specific needs) */
  env?: unknown
}

export interface ISRRouteEntry {
  /** Module name that owns this route */
  module: string
  /**
   * Path matcher: exact string or function.
   * String starting with '/' and ending with '/' = prefix match.
   * String starting with '/' = exact match.
   * Function = custom matcher.
   */
  match: ISRMatcher
  /** Fetch data needed for SSR rendering and meta tags */
  fetch: (pathname: string, ctx: ISRRouterContext) => Promise<unknown>
  /** Generate meta tags from fetched data */
  meta: (data: unknown, pathname: string) => { title: string; description: string }
  /** Max age in seconds (optional, per-route override) */
  maxAge?: number
}

class ISRRegistry {
  private entries: ISRRouteEntry[] = []

  register(entry: ISRRouteEntry): void {
    const idx = this.entries.findIndex(e => e.module === entry.module && e.match === entry.match)
    if (idx >= 0) {
      this.entries[idx] = entry
    } else {
      this.entries.push(entry)
    }
  }

  registerMany(entries: ISRRouteEntry[]): void {
    for (const entry of entries) {
      this.register(entry)
    }
  }

  match(pathname: string): ISRRouteEntry | null {
    for (const entry of this.entries) {
      if (typeof entry.match === 'string' && !entry.match.endsWith('/')) {
        if (pathname === entry.match) return entry
      }
    }
    for (const entry of this.entries) {
      if (typeof entry.match === 'string' && entry.match.endsWith('/') && entry.match !== '/') {
        if (pathname.startsWith(entry.match)) return entry
      }
    }
    for (const entry of this.entries) {
      if (typeof entry.match === 'function') {
        if (entry.match(pathname)) return entry
      }
    }
    for (const entry of this.entries) {
      if (entry.match === '/' && pathname === '/') return entry
    }
    return null
  }

  isISRRoute(pathname: string): boolean {
    return this.match(pathname) !== null
  }

  getExactPaths(): string[] {
    return this.entries.filter(e => typeof e.match === 'string').map(e => e.match as string)
  }

  getAll(): ISRRouteEntry[] {
    return [...this.entries]
  }

  clear(): void {
    this.entries = []
  }
}

export const isrRegistry = new ISRRegistry()

export function createISRRegistry(): ISRRegistry {
  return new ISRRegistry()
}
