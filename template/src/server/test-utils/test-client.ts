/**
 * @framework-baseline 21fc56af7c4c3995
 * @framework-modify
 * @reason 修复 Hono RPC 客户端的 headers 传递问题
 * @impact 测试客户端现在可以正确传递认证 headers
 */

import { hc } from 'hono/client'
import type { AppType } from '@server/index'
import { createApp } from '@server/app'
import type { SSEClient } from '@shared/schemas'

export type TestClient = ReturnType<typeof hc<AppType>>

export interface TestClientOptions {
  webSocket?: (url: string | URL) => WebSocket
  sse?: (url: string | URL) => SSEClient
  headers?: Record<string, string>
}

export function createTestClient(
  _baseUrl?: string | null,
  options?: TestClientOptions
): TestClient {
  const app = createApp()
  const defaultHeaders: Record<string, string> = {
    'User-Agent': 'TestClient/1.0 (Unit Test)',
    ...options?.headers,
  }

  return hc<AppType>('http://localhost', {
    headers: defaultHeaders,
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      return app.fetch(request)
    },
    webSocket: options?.webSocket ? (url: string | URL) => options.webSocket!(url) : undefined,
    sse: options?.sse,
  })
}
