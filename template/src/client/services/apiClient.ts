/**
 * API Client configuration
 * Provides typed access to backend API
 */

import { hc } from 'hono/client'
import type { AppType } from '@server/index'
import type { ApiSuccess, ApiError, ApiResponse, AppWSProtocol } from '@shared/schemas'
import type { ClientResponse } from 'hono/client'
import { WSClient } from './wsClient'

export type { ApiSuccess, ApiError, ApiResponse }
export { isSuccess, isError, getErrorMessage } from '@shared/utils/type-guards'

const wsClientInstances = new Map<string, WSClient<AppWSProtocol>>()

export function createWSClient<P extends AppWSProtocol>(url: string | URL): WSClient<P> {
  const wsUrl = typeof url === 'string' ? url : url.toString()

  if (!wsClientInstances.has(wsUrl)) {
    wsClientInstances.set(wsUrl, new WSClient<AppWSProtocol>(() => new WebSocket(wsUrl)))
  }

  return wsClientInstances.get(wsUrl)! as unknown as WSClient<P>
}

const baseUrl = import.meta.env.API_BASE_URL || window.location.origin

export const apiClient = hc<AppType>(baseUrl, {
  webSocket: (url: string | URL) => {
    const client = createWSClient<AppWSProtocol>(url)
    return client.getSocket()!
  },
})

export type WSRoute = {
  $url: (options?: { query?: Record<string, string> }) => URL
}

type ExtractWSProtocol<T> = T extends AppWSProtocol ? T : never

type InferProtocolFromWSRoute<T> = T extends { $ws: () => infer P }
  ? ExtractWSProtocol<P>
  : AppWSProtocol

export function extendWSRoute<T extends WSRoute>(
  route: T
): Omit<T, '$ws'> & {
  $ws: (options?: { query?: Record<string, string> }) => WSClient<InferProtocolFromWSRoute<T>>
} {
  return {
    ...route,
    $ws: (options?: { query?: Record<string, string> }): WSClient<InferProtocolFromWSRoute<T>> => {
      const httpUrl = route.$url(options)
      const wsUrl = httpUrl.href.replace(/^http/, 'ws')
      return createWSClient<InferProtocolFromWSRoute<T>>(wsUrl)
    },
  }
}

export function getWSClient(url: string): WSClient<AppWSProtocol> | undefined {
  return wsClientInstances.get(url)
}

export async function* consumeStream<T>(
  responsePromise: Promise<ClientResponse<T>>
): AsyncIterable<T> {
  const res = (await responsePromise) as unknown as Response
  if (!res.ok || !res.body) return

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        try {
          yield JSON.parse(data) as T
        } catch (e) {
          console.error('Failed to parse SSE line', e)
        }
      }
    }
  }
}

export const USE_MOCK_SERVER = false
