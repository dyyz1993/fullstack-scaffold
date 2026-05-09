/**
 * @framework-baseline e350401421193896
 * @framework-modify
 * @reason 集成 ISR 缓存层，为页面路由提供增量静态再生能力
 * @impact 影响 Cloudflare Workers 环境的页面响应流程，新增 ISR 缓存查找/存储/失效逻辑
 *
 * Note: In Cloudflare Workers, each request runs in its own isolate,
 * so globalThis is request-scoped and there's no race condition risk.
 * The middleware sets the DB binding for each request.
 */

import { createApp } from '../app'
import type { AppBindings } from '../types/bindings'
import { getDb } from '../db/driver-cloudflare'
import { RealtimeDurableObject } from '@server/core'
import { setRuntimeAdapter } from '@server/core/runtime'
import { getCloudflareRuntimeAdapter } from '@server/core/runtime-cloudflare'
import { createISRCache, isISRRoute } from '@server/core/isr-cache'
import { renderPage } from '@server/core/ssr-renderer'
import { setISRCache } from '@server/core/isr-invalidation'

export interface CloudflareBindings extends AppBindings {
  DB: D1Database
  REALTIME_DO: DurableObjectNamespace
}

const runtimeAdapter = getCloudflareRuntimeAdapter()
setRuntimeAdapter(runtimeAdapter)

runtimeAdapter.handleWS('/api/chat/ws')
runtimeAdapter.handleSSE('/api/notifications/stream')
runtimeAdapter.handleSSE('/api/admin/notifications/stream')

const app = createApp<CloudflareBindings>()

const isrCache = createISRCache()
setISRCache(isrCache)

const wrappedApp = app
  .use('*', async (c, next) => {
    ;(globalThis as unknown as { DB: D1Database }).DB = c.env.DB
    await next()
  })
  .get('/', c =>
    c.json({
      name: 'Biomimic Todo App',
      version: '0.1.0',
      environment: 'cloudflare-workers',
    })
  )
  .onError((err, c) => {
    console.error('Server error:', err)
    c.res.headers.set('Content-Type', 'application/json')
    let statusCode = 500
    if ('statusCode' in err && typeof (err as { statusCode: unknown }).statusCode === 'number') {
      statusCode = (err as { statusCode: number }).statusCode
    } else if ('status' in err && typeof (err as { status: unknown }).status === 'number') {
      statusCode = (err as { status: number }).status
    }
    const message = err.message || 'Internal server error'
    return c.json(
      { success: false as const, error: message, status: statusCode },
      statusCode as 500
    )
  })

export default {
  fetch: async (request: Request, env: CloudflareBindings, ctx: ExecutionContext) => {
    ;(globalThis as unknown as { DB: D1Database }).DB = env.DB

    const url = new URL(request.url)
    const pathname = url.pathname

    if (pathname.startsWith('/api/') || pathname === '/health') {
      return wrappedApp.fetch(request, env, ctx)
    }

    if (env.ASSETS) {
      if (
        pathname.startsWith('/assets/') ||
        pathname.endsWith('.js') ||
        pathname.endsWith('.css') ||
        pathname.endsWith('.svg') ||
        pathname.endsWith('.png') ||
        pathname.endsWith('.ico') ||
        pathname === '/vite.svg'
      ) {
        const assetResponse = await env.ASSETS.fetch(request)
        if (assetResponse.status !== 404) {
          return assetResponse
        }
      }
    }

    if (isISRRoute(pathname)) {
      const result = await isrCache.lookup(pathname)

      if (result.status === 'fresh' && result.html) {
        return new Response(result.html, {
          headers: { 'Content-Type': 'text/html;charset=UTF-8', 'X-ISR-Status': 'fresh' },
        })
      }

      if (result.status === 'stale' && result.html) {
        ctx.waitUntil(regeneratePage(pathname, env))
        return new Response(result.html, {
          headers: { 'Content-Type': 'text/html;charset=UTF-8', 'X-ISR-Status': 'stale' },
        })
      }

      const rendered = await renderPage(pathname)

      ctx.waitUntil(isrCache.store(pathname, rendered.html))

      return new Response(rendered.html, {
        status: rendered.status,
        headers: { ...rendered.headers, 'X-ISR-Status': 'miss' },
      })
    }

    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request)
      if (assetResponse.status !== 404) {
        return assetResponse
      }
    }

    return wrappedApp.fetch(request, env, ctx)
  },
}

async function regeneratePage(pathname: string, _env: CloudflareBindings): Promise<void> {
  try {
    const rendered = await renderPage(pathname)
    await isrCache.store(pathname, rendered.html)
  } catch (error) {
    console.error('ISR regeneration failed:', error)
  }
}

export { isrCache }
export { RealtimeDurableObject, getDb }
export type AppType = typeof wrappedApp
