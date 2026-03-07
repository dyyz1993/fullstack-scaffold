import type { OpenAPIHono } from '@hono/zod-openapi'
import { getRuntimeAdapter } from './runtime'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function autoRegisterRealtime(app: OpenAPIHono<any, any, any>): void {
  const runtime = getRuntimeAdapter()
  const routes = app.routes

  const registeredPaths = new Set<string>()

  for (const route of routes) {
    const path = route.path
    if (!path) continue

    // 检查是否是 WebSocket 路由（通过路径判断）
    if (path.includes('/ws') || path.includes('/websocket')) {
      const fullPath = path.startsWith('/') ? path : `/${path}`
      if (!registeredPaths.has(fullPath)) {
        runtime.handleWS(fullPath)
        registeredPaths.add(fullPath)
      }
    }

    // 检查是否是 SSE 路由（通过路径判断）
    if (path.includes('/stream') || path.includes('/sse')) {
      const fullPath = path.startsWith('/') ? path : `/${path}`
      if (!registeredPaths.has(fullPath)) {
        runtime.handleSSE(fullPath)
        registeredPaths.add(fullPath)
      }
    }
  }
}
