import { hc } from 'hono/client'
import type { AppType } from '@server/index'
import { WSClientImpl } from '@shared/core/ws-client'
import { SSEClientImpl } from '@shared/core/sse-client'

export function createRPCClient(baseUrl: string) {
  return hc<AppType>(baseUrl, {
    webSocket: url => new WSClientImpl(url),
    sse: url => new SSEClientImpl(url),
  })
}

export type { AppType }
