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
import { renderPage, setIndexTemplate } from '@server/core/ssr-renderer'
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

    if (!cachedTemplate && env.ASSETS) {
      try {
        const indexResponse = await env.ASSETS.fetch(new URL('/index.html', request.url).href)
        if (indexResponse.ok) {
          cachedTemplate = await indexResponse.text()
          setIndexTemplate(cachedTemplate)
        } else {
          console.warn('ISR template load: index.html returned', indexResponse.status)
        }
      } catch (e) {
        console.warn('ISR template load failed:', e instanceof Error ? e.message : e)
      }
    }

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

      const html = await renderISRPage(pathname, env, request)

      ctx.waitUntil(isrCache.store(pathname, html))

      return new Response(html, {
        status: 200,
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
    const html = await renderISRPage(pathname, env, request)
    await isrCache.store(pathname, html)
  } catch (error) {
    console.error('ISR regeneration failed:', error)
  }
}

const ROUTE_META: Record<string, { title: string; description: string }> = {
  '/': { title: 'Todo List - Biomimic App', description: 'A full-stack application template' },
  '/todos': {
    title: 'Todo List - Biomimic App',
    description: 'Manage your todos with real-time updates',
  },
  '/content': {
    title: '内容中心 - Biomimic App',
    description: 'Content management with categories and search',
  },
  '/notifications': {
    title: 'Notifications - Biomimic App',
    description: 'Real-time notifications via Server-Sent Events',
  },
  '/websocket': {
    title: 'WebSocket Demo - Biomimic App',
    description: 'Type-safe WebSocket communication demo',
  },
}

async function renderISRPage(
  pathname: string,
  env: CloudflareBindings,
  request: Request
): Promise<string> {
  const meta = ROUTE_META[pathname] || {
    title: pathname.startsWith('/content/') ? '内容详情 - Biomimic App' : 'Biomimic App',
    description: 'View content details',
  }

  let template = cachedTemplate

  if (!template && env.ASSETS) {
    try {
      const indexUrl = new URL('/index.html', request.url).href
      const resp = await env.ASSETS.fetch(indexUrl)
      if (resp.ok) {
        template = await resp.text()
        cachedTemplate = template
      }
    } catch {
      // fallback below
    }
  }

  const ssrScript = `<script>window.__SSR_DATA__={};window.__SSR_PATH__=${JSON.stringify(pathname)};</script>`

  if (template) {
    let html = template
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(meta.title)}</title>`)
    html = html.replace(
      '</head>',
      `    <meta name="description" content="${escapeHtml(meta.description)}" />\n    <meta property="og:title" content="${escapeHtml(meta.title)}" />\n    <meta property="og:description" content="${escapeHtml(meta.description)}" />\n    <meta name="generator" content="ISR" />\n  </head>`
    )
    html = html.replace('<div id="root"></div>', `<div id="root"></div>\n    ${ssrScript}`)
    return html
  }

  return renderPage(pathname).then(r => r.html)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export { isrCache, cachedTemplate }
export { RealtimeDurableObject, getDb }
export type AppType = typeof wrappedApp
