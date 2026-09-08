/**
 * @framework-baseline b18502d5cc33f07d
 *
 * @framework-modify
 * @reason 添加 headers 参数支持，以便在测试中传递认证头
 * @impact 测试客户端现在支持自定义 headers，用于认证测试
 */

import { createApiFacade, type ApiFacade } from '@server/rpc-surface'
import { createApp } from '@server/app'
import { SSEClientImpl } from '@shared/core/sse-client'
import { setRuntimeAdapter } from '@server/core/runtime'
import { getNodeRuntimeAdapter } from '@server/core/runtime-node'

setRuntimeAdapter(getNodeRuntimeAdapter())

/**
 * 测试客户端类型 —— 按模块拆分的门面（见 rpc-surface.ts）。
 * 旧的 `ReturnType<typeof hc<AppType>>>` 会深度实例化整个 merge 链并触发
 * TS2589，已被 eslint 规则 no-merged-api-type-export 禁止。
 */
export type TestClient = ApiFacade

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

  const sseFactory = options?.sse
    ? (url: string | URL) => options.sse!(url)
    : (url: string | URL) => new SSEClientImpl(url, defaultHeaders)

  if (baseUrl) {
    return createApiFacade(baseUrl, {
      headers: defaultHeaders,
      webSocket: options?.webSocket ? (url: string | URL) => options.webSocket!(url) : undefined,
      sse: sseFactory as (url: string) => unknown,
    })
  }
  return createApiFacade('http://localhost', {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      Object.entries(defaultHeaders).forEach(([key, value]) => {
        if (!request.headers.has(key)) {
          request.headers.set(key, value)
        }
      })
      return app.fetch(request)
    },
    sse: sseFactory as (url: string) => unknown,
  })
}
