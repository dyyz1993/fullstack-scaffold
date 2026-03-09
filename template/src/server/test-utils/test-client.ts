import { hc } from 'hono/client'
import type { AppType } from '@server/index'
import { createApp } from '@server/app'
import { createWSClient } from '@client/services/wsClient'
import { SSEClientImpl } from '@client/services/sseClient'

export type TestClient = ReturnType<typeof hc<AppType>>

export function createTestClient(baseUrl?: string): TestClient {
  const app = createApp()
  if (baseUrl) {
    return hc<AppType>(baseUrl, {
      webSocket: url => createWSClient(url) as unknown as WebSocket,
      sse: (url: string) => new SSEClientImpl(url),
    })
  }
  return hc<AppType>('http://localhost', {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetch: (input: any, init?: any) => app.fetch(new Request(input, init)),
    sse: (url: string) => new SSEClientImpl(url),
  })
}
