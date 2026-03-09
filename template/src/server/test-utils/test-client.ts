import { hc } from 'hono/client'
import type { AppType } from '@server/index'
import { createApp } from '@server/app'
import type { SSEClient } from '@shared/schemas'

export type TestClient = ReturnType<typeof hc<AppType>>

export interface TestClientOptions {
  webSocket?: (url: string | URL) => WebSocket
  sse?: (url: string | URL) => SSEClient
}

export function createTestClient(baseUrl?: string, options?: TestClientOptions): TestClient {
  const app = createApp()
  if (baseUrl) {
    return hc<AppType>(baseUrl, {
      webSocket: options?.webSocket ? url => options.webSocket!(url) : undefined,
      sse: options?.sse,
    })
  }
  return hc<AppType>('http://localhost', {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetch: (input: any, init?: any) => app.fetch(new Request(input, init)),
    sse: options?.sse,
  })
}
