/**
 * @framework-baseline ab16e97716a7556e
 */

import { hc } from 'hono/client'
import type { AppType } from '@server/index'
import { WSClientImpl } from '@shared/core/ws-client'
import { SSEClientImpl } from '@shared/core/sse-client'

// Use environment variable for API base URL if available, otherwise use window.location.origin
const baseUrl = import.meta.env.API_BASE_URL || window.location.origin

export const apiClient = hc<AppType>(baseUrl, {
  webSocket: url => new WSClientImpl(url),
  sse: url => new SSEClientImpl(url),
})
