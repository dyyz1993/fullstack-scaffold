import type { OpenAPIHono } from '@hono/zod-openapi'
import { getRuntimeAdapter } from './runtime'

interface RouteWithGet {
  get?: {
    output?: unknown
    outputFormat?: string
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function autoRegisterRealtime(app: OpenAPIHono<any, any, any>): void {
  let runtime
  try {
    runtime = getRuntimeAdapter()
  } catch {
    return
  }

  const routes = app.routes as (RouteWithGet & { path?: string; method?: string })[]
  const registeredPaths = new Set<string>()

  for (const route of routes) {
    const path = route.path
    if (!path) continue

    const fullPath = path.startsWith('/') ? path : `/${path}`
    const method = route.method?.toUpperCase()

    if (method && method !== 'GET') continue

    const isWebSocket = /\/ws$/i.test(fullPath) || /\/websocket$/i.test(fullPath)
    const isSSE = /\/stream$/i.test(fullPath) || /\/sse$/i.test(fullPath)

    if (isWebSocket) {
      if (!registeredPaths.has(fullPath)) {
        runtime.handleWS(fullPath)
        registeredPaths.add(fullPath)
      }
    }

    if (isSSE) {
      if (!registeredPaths.has(fullPath)) {
        runtime.handleSSE(fullPath)
        registeredPaths.add(fullPath)
      }
    }
  }
}
