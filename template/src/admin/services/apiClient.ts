/**
 * @framework-baseline ab16e97716a7556e
 */

import { hc } from 'hono/client'
import type { AppType } from '@server/index'
import { WSClientImpl } from '@shared/core/ws-client'
import { SSEClientImpl } from '@shared/core/sse-client'
import { createRequestInterceptor } from './requestInterceptor'
import { useCaptchaStore } from '../stores/captchaStore'

const baseUrl = import.meta.env.API_BASE_URL || window.location.origin

const TOKEN_KEY = 'admin-storage'

function clearAuthAndRedirect(): void {
  localStorage.removeItem(TOKEN_KEY)
  if (window.location.pathname !== '/admin/login') {
    window.location.href = '/admin/login'
  }
}

function createCustomFetch() {
  const showCaptcha = useCaptchaStore.getState().show

  return createRequestInterceptor({
    onShowLogin: clearAuthAndRedirect,
    onShowCaptcha: async config => {
      return showCaptcha({
        type: config.type,
        captchaUrl: config.captchaUrl,
      })
    },
  })
}

export const apiClient = hc<AppType>(baseUrl, {
  fetch: createCustomFetch() as typeof fetch,
  webSocket: url => new WSClientImpl(url),
  sse: url => new SSEClientImpl(url),
})
