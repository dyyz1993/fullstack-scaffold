/**
 * @framework-baseline 91c7b6f83b7c9913
 * @framework-modify
 * @reason 添加 SPA 前端路由处理，区分开发/生产环境
 * @impact 新增前端路由处理逻辑，/admin/* 返回 admin.html，其他路由返回 index.html
 */

import '../config'

import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { resolve } from 'path'
import { existsSync, readFileSync } from 'fs'
import { WebSocketServer } from 'ws'
import { getAppConfig } from '../config'
import { logger } from '../utils/logger'
import { createApp } from '../app'
import { getDb, runMigrations } from '../db'
import { createISRCache, isISRRoute } from '@server/core/isr-cache'
// Side-effect: 注册 ISR 路由到全局 registry（Node 入口此前漏了这一行——
// registry 空 → isISRRoute 恒 false → ISR 永远不触发，SSR 壳照旧）
import '@server/isr-modules'
import { renderISRPage } from '@server/core/isr-renderer'
import { isrRegistry, type ISRRouterContext } from '@server/core/isr-registry'
import { setISRCache } from '@server/core/isr-invalidation'
import { setRuntimeAdapter } from '@server/core/runtime'
import { getNodeRuntimeAdapter } from '@server/core/runtime-node'

const config = getAppConfig()
const isProduction = process.env.NODE_ENV === 'production'
const distPath = resolve(process.cwd(), 'dist/client')
const hasDist = isProduction && existsSync(distPath)

// HTML 文件路径
const indexHtmlPath = hasDist
  ? resolve(distPath, 'index.html')
  : resolve(process.cwd(), 'index.html')
const adminHtmlPath = hasDist
  ? resolve(distPath, 'admin.html')
  : resolve(process.cwd(), 'admin.html')

const indexHtml = existsSync(indexHtmlPath)
  ? readFileSync(indexHtmlPath, 'utf-8')
  : '<html><body>index.html not found</body></html>'
const adminHtml = existsSync(adminHtmlPath)
  ? readFileSync(adminHtmlPath, 'utf-8')
  : '<html><body>admin.html not found</body></html>'

const log = logger.api()

const isrCache = createISRCache()
setISRCache(isrCache)

const runtimeAdapter = getNodeRuntimeAdapter()
setRuntimeAdapter(runtimeAdapter)

runtimeAdapter.handleWS('/api/chat/ws')
runtimeAdapter.handleSSE('/api/notifications/stream')
runtimeAdapter.handleSSE('/api/admin/notifications/stream')

// 先创建基础应用
const baseApp = createApp()

// 添加日志中间件
const app = baseApp.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  log.info({ method: c.req.method, path: c.req.path, status: c.res.status, ms }, 'request')
})

if (config.enableDocs) {
  app.get('/docs', c =>
    c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>API Documentation</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
        <script>
          window.onload = function() {
            SwaggerUIBundle({
              url: "/api/docs",
              dom_id: '#swagger-ui',
              presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIBundle.SwaggerUIStandalonePreset
              ],
              layout: "BaseLayout"
            });
          }
        </script>
      </body>
    </html>
  `)
  )
}

// 生产环境：静态资源服务
if (hasDist) {
  app.use('/*', async (c, next) => {
    // API 路由不走静态资源
    if (c.req.path.startsWith('/api/') || c.req.path.startsWith('/files/')) {
      return await next()
    }
    return serveStatic({ root: distPath })(c, next)
  })
}

// Admin 路由返回 admin.html
app.get('/admin/*', c => {
  return c.html(adminHtml)
})

// 其他非 API 路由返回 index.html（ISR 路由尝试缓存）
app.get('*', async c => {
  if (c.req.path.startsWith('/api/') || c.req.path.startsWith('/files/')) {
    return c.notFound()
  }

  const pathname = c.req.path

  if (hasDist && isISRRoute(pathname)) {
    const result = await isrCache.lookup(pathname)

    if (result.status === 'fresh' && result.html) {
      return c.html(result.html)
    }

    if (result.status === 'stale' && result.html) {
      renderISRForRoute(pathname)
        .then(html => {
          if (html) {
            isrCache.store(pathname, html).catch(e => {
              console.warn('ISR cache store (background revalidation) failed:', e)
            })
          }
        })
        .catch(e => {
          console.warn('ISR background render failed:', e)
        })
      return c.html(result.html)
    }

    const html = await renderISRForRoute(pathname)
    if (html) {
      isrCache.store(pathname, html).catch(e => {
        console.warn('ISR cache store failed:', e)
      })
      return c.html(html)
    }
    return c.html(indexHtml)
  }

  return c.html(indexHtml)
})

// Note: errorHandlerMiddleware (from middleware/error-handler.ts) is the canonical error handler.
// This onError is kept as a last-resort fallback for errors that escape the middleware chain.
app.onError((err, c) => {
  log.error({ err, path: c.req.path }, 'server error')
  c.res.headers.set('Content-Type', 'application/json')
  const statusCode =
    err instanceof Error && 'status' in err ? (err as { status: number }).status : 500
  const message = err.message || 'Internal server error'
  const responseStatus = statusCode || 500
  return c.json(
    { success: false as const, error: message, status: responseStatus },
    responseStatus as 500
  )
})

export default app
export async function createServer() {
  const server = serve({
    fetch: app.fetch,
    port: config.port,
  })

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url || '', `http://localhost`)

    if (runtimeAdapter.hasWSPath(url.pathname)) {
      const wssInstance = new WebSocketServer({ noServer: true })

      wssInstance.handleUpgrade(req, socket, head, ws => {
        runtimeAdapter.handleConnection(ws)
      })
    } else {
      socket.destroy()
    }
  })

  return { server, port: config.port }
}

/**
 * 真 ISR 渲染（与 CF 入口同管线）：registry fetch 数据 → renderSSR
 * 页面级渲染 → renderISRPage 注入 body + meta + __SSR_DATA__。
 * 返回 null 表示无注册路由/渲染失败，调用方回退 SPA index.html。
 */
type SSRRenderer = (pathname: string, data: unknown) => { html: string } | null

// 渲染桥按需加载：静态 import 会把整个 React SSR 图（react-router-dom 等
// CJS 依赖）拉进 vite dev 的 SSR 模块图，dev server 全路由 500；动态加载
// 只在生产渲染 ISR 路由时触发，dev 下失败则回退 SPA 壳。
let cachedRenderer: SSRRenderer | null | undefined
async function loadSSRRenderer(): Promise<SSRRenderer | null> {
  if (cachedRenderer !== undefined) return cachedRenderer
  try {
    const mod = await import('@server/ssr-bridge')
    cachedRenderer = mod.renderSSR
  } catch {
    cachedRenderer = null
  }
  return cachedRenderer
}

async function renderISRForRoute(pathname: string): Promise<string | null> {
  const entry = isrRegistry.match(pathname)
  if (!entry) return null
  const renderSSR = await loadSSRRenderer()
  if (!renderSSR) return null // 无 client 的 preset（cli-only 等）回退 SPA 壳
  const ctx: ISRRouterContext = { db: await getDb(), env: {} }
  let data: unknown = {}
  let meta = { title: 'App', description: '' }
  try {
    data = await entry.fetch(pathname, ctx)
    meta = entry.meta(data, pathname)
  } catch {
    // DB 错误——回退默认 meta 继续渲染壳
  }
  try {
    const ssr = renderSSR(pathname, data)
    if (!ssr) return null // 渲染桥返回 null（无 client 变体）
    return renderISRPage({ template: indexHtml, body: ssr.html, meta, data })
  } catch (e) {
    console.warn('ISR render failed:', e)
    return null
  }
}

export async function startServer() {
  const bootstrapLog = logger.bootstrap()

  bootstrapLog.info({}, 'Initializing database...')
  try {
    await getDb()
    await runMigrations()
    const { initializeDatabase } = await import('../db/init')
    await initializeDatabase()
    bootstrapLog.info({}, 'Database ready')
  } catch (err) {
    // pino 走异步 thread-stream transport，process.exit 前不 flush——
    // 生产致命错误必须同步 console.error，否则静默死（exit 1 零输出）
    console.error('Database initialization failed:', err)
    process.exit(1)
  }

  const { server, port } = await createServer()

  bootstrapLog.info({ port }, 'Server running')
  if (config.enableDocs) {
    bootstrapLog.info({ url: `http://localhost:${port}/docs` }, 'API docs available')
  }

  const shutdown = async () => {
    bootstrapLog.info({}, 'Shutting down...')
    server.close()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

if (process.env.NODE_ENV === 'production') {
  startServer().catch(err => {
    console.error('Failed to start server:', err)
    process.exit(1)
  })
}
