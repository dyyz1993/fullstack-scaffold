/**
 * @framework-baseline b18502d5cc33f07d
 *
 * @framework-modify
 * @reason 添加 headers 参数支持，以便在测试中传递认证头
 * @impact 测试客户端现在支持自定义 headers，用于认证测试
 */

import { hc } from 'hono/client'
import type { AppType } from '@server/index'
import { createApp } from '@server/app'

/**
 * 测试客户端类型
 *
 * 注意：TypeScript 在推导 Hono Client 类型时可能触发 TS2589，
 * 该警告不影响运行时行为，测试客户端可正常工作。
 */
// @ts-ignore TS2589: Hono UnionToIntersection exceeds type instantiation depth
export type TestClient = ReturnType<typeof hc<AppType>>

export interface TestClientOptions {
  webSocket?: (url: string | URL) => WebSocket
  sse?: (url: string | URL) => unknown
  headers?: Record<string, string>
}

/**
 * 创建测试客户端
 */
export function createTestClient(baseUrl?: string, options?: TestClientOptions) {
  const app = createApp()
  const defaultHeaders = {
    'User-Agent': 'TestClient/1.0 (Unit Test)',
    ...options?.headers,
  }

  if (baseUrl) {
    return hc<AppType>(baseUrl, {
      headers: defaultHeaders,
      webSocket: options?.webSocket ? url => options.webSocket!(url) : undefined,
    })
  }
  return hc<AppType>('http://localhost', {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetch: (input: any, init?: any) => {
      const request = new Request(input, init)
      // Add default headers if not present
      Object.entries(defaultHeaders).forEach(([key, value]) => {
        if (!request.headers.has(key)) {
          request.headers.set(key, value)
        }
      })
      return app.fetch(request)
    },
  })
}
