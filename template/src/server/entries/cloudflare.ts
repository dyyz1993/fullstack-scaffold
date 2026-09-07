/**
 * @framework-baseline e350401421193896
 * @framework-modify
 * @reason 模块化 ISR 改造 + SSR 渲染：调用 renderSSR 生成 React body，注入到 ISR 模板
 * @impact CF 入口集成 React SSR，ISR 同时负责 SEO meta 标签和 body 渲染
 */

import { createApp } from '../app'
import type { AppBindings } from '../types/bindings'
import { getDb } from '../db/driver-cloudflare'
import { RealtimeDurableObject } from '@server/core'
import { setRuntimeAdapter } from '@server/core/runtime'
import { getCloudflareRuntimeAdapter } from '@server/core/runtime-cloudflare'
import { createISRCache, isISRRoute } from '@server/core/isr-cache'
import { setISRCache } from '@server/core/isr-invalidation'
import { isrRegistry, type ISRRouterContext } from '@server/core/isr-registry'
import { renderISRPage } from '@server/core/isr-renderer'
import { renderSSR } from '@client/entry-server'

// Import module ISR registrations (side-effect: registers routes)
import '@server/module-todos/isr'
import '@server/module-content/isr'

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

let cachedTemplate: string | null = null

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
        ctx.waitUntil(regeneratePage(pathname, env, request))
        return new Response(result.html, {
          headers: { 'Content-Type': 'text/html;charset=UTF-8', 'X-ISR-Status': 'stale' },
        })
      }

      const html = await renderISRForRoute(pathname, env, request)
      ctx.waitUntil(isrCache.store(pathname, html))
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
          'X-ISR-Status': 'miss',
          'X-ISR-Rendered': 'true',
        },
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

async function regeneratePage(
  pathname: string,
  env: CloudflareBindings,
  request: Request
): Promise<void> {
  try {
    const html = await renderISRForRoute(pathname, env, request)
    await isrCache.store(pathname, html)
  } catch (error) {
    console.error('ISR regeneration failed:', error)
  }
}

async function renderISRForRoute(
  pathname: string,
  env: CloudflareBindings,
  request: Request
): Promise<string> {
  const entry = isrRegistry.match(pathname)
  if (!entry) {
    throw new Error(`No ISR handler for ${pathname}`)
  }

  const ctx: ISRRouterContext = { db: env.DB, env }
  let data: unknown = {}
  let meta = { title: 'Biomimic App', description: 'A full-stack application template' }

  try {
    data = await entry.fetch(pathname, ctx)
    meta = entry.meta(data, pathname)
  } catch {
    // DB error — fall through with default meta
  }

  if (!cachedTemplate && env.ASSETS) {
    try {
      const indexUrl = new URL('/index.html', request.url).href
      const resp = await env.ASSETS.fetch(new Request(indexUrl))
      if (resp.ok) {
        cachedTemplate = await resp.text()
      }
    } catch {
      // fallback below
    }
  }

  // Render React SSR body
  let body = ''
  try {
    const ssrResult = renderSSR(pathname, data as Parameters<typeof renderSSR>[1])
    body = ssrResult.html
    // Helmet takes priority for title/meta
    const helmetTitle = ssrResult.helmet.title
      ?.replace(/<title[^>]*>/, '')
      ?.replace(/<\/title>/, '')
      ?.trim()
    if (helmetTitle) {
      meta = { ...meta, title: helmetTitle }
    }
  } catch (e) {
    console.error('SSR render failed:', e)
    // Fallback: empty body, SPA will hydrate
  }

  return renderISRPage({ template: cachedTemplate, body, meta })
}

export { isrCache }
export { RealtimeDurableObject, getDb }
