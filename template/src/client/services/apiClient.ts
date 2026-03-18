/**
 * @framework-baseline ab16e97716a7556e
 * @framework-modify
 * @reason 添加客户端认证支持，自动在请求头中携带 Authorization token
 * @impact 影响所有客户端 API 请求，需要用户登录后才能访问受保护的接口
 */

import { hc } from 'hono/client'
import type { AppType } from '@server/index'
import { WSClientImpl } from '@shared/core/ws-client'
import { SSEClientImpl } from '@shared/core/sse-client'

// Use environment variable for API base URL if available, otherwise use window.location.origin
const baseUrl = import.meta.env.API_BASE_URL || window.location.origin

const TOKEN_KEY = 'auth-token'

function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

const authenticatedFetch = (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
  const token = getAuthToken()
  const headers = new Headers(init?.headers)

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return window.fetch(url, {
    ...init,
    headers,
  })
}

export const apiClient = hc<AppType>(baseUrl, {
  fetch: authenticatedFetch as typeof fetch,
  webSocket: url => {
    const token = getAuthToken()
    if (token) {
      const wsUrl = new URL(url)
      wsUrl.searchParams.set('token', token)
      return new WSClientImpl(wsUrl)
    }
    return new WSClientImpl(url)
  },
  sse: url => {
    const token = getAuthToken()
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return new SSEClientImpl(url, headers)
  },
})
