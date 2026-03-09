import { hc } from 'hono/client'
import type { AppType } from '@server/index'
import { WSClientImpl } from '@shared/services/wsClient'
import { SSEClientImpl } from '@shared/services/sseClient'

const baseUrl = import.meta.env.API_BASE_URL || window.location.origin

export const apiClient = hc<AppType>(baseUrl, {
  webSocket: url => new WSClientImpl(url),
  sse: url => new SSEClientImpl(url),
})
