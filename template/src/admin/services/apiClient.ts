/**
 * @framework-baseline ab16e97716a7556e
 */

import { hc } from 'hono/client'
import type { AppType } from '@server/index'
import { WSClientImpl } from '@shared/core/ws-client'
import { SSEClientImpl } from '@shared/core/sse-client'

const baseUrl = import.meta.env.API_BASE_URL || window.location.origin

const TOKEN_KEY = 'admin-storage'

function getStoredToken(): string | null {
  try {
    const stored = localStorage.getItem(TOKEN_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.state?.token || null
    }
  } catch {
    return null
  }
  return null
}

function clearAuthAndRedirect(): void {
  localStorage.removeItem(TOKEN_KEY)
  if (window.location.pathname !== '/admin/login') {
    window.location.href = '/admin/login'
  }
}

async function customFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getStoredToken()

  const headers = new Headers(init?.headers)

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await window.fetch(input, {
    ...init,
    headers,
  })

  if (response.status === 401) {
    clearAuthAndRedirect()
  }

  return response
}

export const apiClient = hc<AppType>(baseUrl, {
  fetch: customFetch,
  webSocket: url => new WSClientImpl(url),
  sse: url => new SSEClientImpl(url),
})
