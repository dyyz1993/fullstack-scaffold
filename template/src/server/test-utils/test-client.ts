/**
 * @framework-baseline d16fe334284db1d7
 *
 * @framework-modify
 * @reason 添加 headers 参数支持，以便在测试中传递认证头
 * @impact 测试客户端现在支持自定义 headers，用于认证测试
 */

import { hc } from 'hono/client'
import type { AppType } from '@server/index'
import { createApp } from '@server/app'
import type { SSEClient } from '@shared/schemas'

/**
 * 测试客户端类型
 *
 * 注意：此项目通过 patch-package 修改了 TypeScript 的类型实例化深度限制
 * 从默认的 100 增加到 500，以支持复杂的路由类型推导。
 *
 * 参见：patches/typescript+5.8.3.patch
 */
export type TestClient = ReturnType<typeof hc<AppType>>

export interface TestClientOptions {
  webSocket?: (url: string | URL) => WebSocket
  sse?: (url: string | URL) => SSEClient
  headers?: Record<string, string>
}

/**
 * 创建测试客户端
 */
export function createTestClient(baseUrl?: string, options?: TestClientOptions): TestClient {
  const app = createApp()
  const defaultHeaders = {
    'User-Agent': 'TestClient/1.0 (Unit Test)',
    ...options?.headers,
  }

  if (baseUrl) {
    return hc<AppType>(baseUrl, {
      headers: defaultHeaders,
      webSocket: options?.webSocket ? url => options.webSocket!(url) : undefined,
      sse: options?.sse,
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
    sse: options?.sse,
  })
}
