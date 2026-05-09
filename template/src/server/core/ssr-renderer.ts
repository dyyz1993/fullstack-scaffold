/**
 * @framework-baseline cabb57f8f865d571
 *
 * SSR renderer for ISR. Generates HTML shells with SEO meta tags.
 * Phase 1: Shell rendering with meta tags (no React renderToString).
 * Phase 2 (future): Full renderToString with data-driven content.
 *
 * @framework-modify
 * @reason 修复 RouteConfig.pattern 类型从 string 改为 RegExp，修复 TypeScript 类型错误
 * @impact 不影响运行时行为，仅修复类型定义
 */

export interface RouteMeta {
  title: string
  description: string
  ogType?: string
}

export interface RouteConfig {
  path: string
  pattern: RegExp
  meta: RouteMeta
  loader?: (params: Record<string, string>) => Promise<Record<string, unknown>>
}

export interface RenderResult {
  html: string
  status: number
  headers: Record<string, string>
}

const STATIC_ROUTES: RouteConfig[] = [
  {
    path: '/',
    pattern: /^\/$/,
    meta: {
      title: 'Todo List - Biomimic App',
      description: 'A full-stack application template with React and Hono',
    },
  },
  {
    path: '/todos',
    pattern: /^\/todos$/,
    meta: {
      title: 'Todo List - Biomimic App',
      description: 'Manage your todos with real-time updates',
    },
  },
  {
    path: '/notifications',
    pattern: /^\/notifications$/,
    meta: {
      title: 'Notifications - Biomimic App',
      description: 'Real-time notifications via Server-Sent Events',
    },
  },
  {
    path: '/websocket',
    pattern: /^\/websocket$/,
    meta: {
      title: 'WebSocket Demo - Biomimic App',
      description: 'Type-safe WebSocket communication demo',
    },
  },
  {
    path: '/content',
    pattern: /^\/content$/,
    meta: {
      title: '内容中心 - Biomimic App',
      description: 'Content management with categories and search',
    },
  },
  {
    path: '/content/:id',
    pattern: /^\/content\/([^/]+)$/,
    meta: {
      title: '内容详情 - Biomimic App',
      description: 'View content details',
    },
    loader: async params => {
      try {
        const { getContentById } = await import('@server/module-content/services/content-service')
        const content = await getContentById(params.id)
        if (content) {
          return {
            __meta: {
              title: `${content.title} - Biomimic App`,
              description: content.content?.substring(0, 160) || 'View content details',
            },
            content,
          }
        }
      } catch {
        // DB not available, return default meta
      }
      return {}
    },
  },
]

export function matchRoute(
  pathname: string
): { route: RouteConfig; params: Record<string, string> } | null {
  for (const route of STATIC_ROUTES) {
    const match = pathname.match(route.pattern)
    if (match) {
      const params: Record<string, string> = {}
      if (route.path === '/content/:id' && match[1]) {
        params.id = match[1]
      }
      return { route, params }
    }
  }
  return null
}

export async function renderPage(
  pathname: string,
  options?: {
    assetHash?: string
    data?: Record<string, unknown>
  }
): Promise<RenderResult> {
  const matched = matchRoute(pathname)

  if (!matched) {
    return renderFallback()
  }

  const { route, params } = matched
  let meta = { ...route.meta }
  let pageData: Record<string, unknown> = {}

  if (route.loader) {
    try {
      const loaderResult = await route.loader(params)
      if (loaderResult.__meta) {
        meta = { ...meta, ...(loaderResult.__meta as RouteMeta) }
        delete loaderResult.__meta
      }
      pageData = loaderResult
    } catch {
      // Loader failed, use default meta
    }
  }

  if (options?.data) {
    pageData = { ...pageData, ...options.data }
  }

  const html = renderShell({
    title: meta.title,
    description: meta.description,
    ogType: meta.ogType || 'website',
    data: pageData,
    pathname,
  })

  return {
    html,
    status: 200,
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'X-ISR-Rendered': 'true',
    },
  }
}

interface ShellOptions {
  title: string
  description: string
  ogType: string
  data: Record<string, unknown>
  pathname: string
}

function renderShell(options: ShellOptions): string {
  const dataJson = JSON.stringify(options.data)
  const escapedJson = dataJson.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(options.title)}</title>
    <meta name="description" content="${escapeHtml(options.description)}" />
    <meta property="og:title" content="${escapeHtml(options.title)}" />
    <meta property="og:description" content="${escapeHtml(options.description)}" />
    <meta property="og:type" content="${escapeHtml(options.ogType)}" />
    <meta property="og:url" content="${escapeHtml(options.pathname)}" />
    <meta name="generator" content="ISR" />
  </head>
  <body>
    <div id="root"></div>
    <script>window.__SSR_DATA__ = ${escapedJson};window.__SSR_PATH__ = ${JSON.stringify(options.pathname)};</script>
    <script type="module" src="/src/client/main.tsx"></script>
  </body>
</html>`
}

function renderFallback(): RenderResult {
  return {
    html: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Biomimic App</title>
    <meta name="description" content="Biomimic App - A full-stack application template" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/client/main.tsx"></script>
  </body>
</html>`,
    status: 200,
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
    },
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
