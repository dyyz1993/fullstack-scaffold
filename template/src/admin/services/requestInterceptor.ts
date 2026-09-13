import type { CaptchaType } from './types'

type PendingRequest = {
  resolve: (value: Response) => void
  reject: (error: Error) => void
  request: () => Promise<Response>
}

export interface InterceptorCallbacks {
  onShowLogin: () => void
  onShowCaptcha: (config: { type: CaptchaType; captchaUrl?: string }) => Promise<boolean>
}

export class RequestInterceptor {
  private pendingRequests: PendingRequest[] = []
  private isShowingCaptcha = false

  constructor(private callbacks: InterceptorCallbacks) {}

  async intercept(url: string, init: RequestInit): Promise<Response> {
    const request = () => this.executeRequest(url, init)

    // 验证码族端点不走拦截：弹窗打开期间（isShowingCaptcha=true）拉取验证码、
    // 校验 verify-captcha 的请求会被排队等待"自己"完成，形成死锁
    // （图永不加载 / 提交按钮永久 loading）
    if (url.includes('/api/captcha') || url.includes('/api/verify-captcha')) {
      return request()
    }

    if (this.isShowingCaptcha) {
      return new Promise((resolve, reject) => {
        this.pendingRequests.push({ resolve, reject, request })
      })
    }

    const response = await request()
    return this.handleResponseStatus(response, request)
  }

  private async executeRequest(url: string, init: RequestInit): Promise<Response> {
    const token = this.getStoredToken()
    const headers = new Headers(init.headers)

    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    return window.fetch(url, {
      ...init,
      headers,
    })
  }

  private async handleResponseStatus(
    response: Response,
    retryRequest: () => Promise<Response>
  ): Promise<Response> {
    if (response.status === 401) {
      this.callbacks.onShowLogin()
      throw new Error('Unauthorized')
    }

    if (this.shouldShowCaptcha(response)) {
      return this.handleCaptcha(retryRequest)
    }

    return response
  }

  private shouldShowCaptcha(response: Response): boolean {
    return response.status === 403 || response.status === 429
  }

  private async handleCaptcha(retryRequest: () => Promise<Response>): Promise<Response> {
    if (this.isShowingCaptcha) {
      return new Promise((resolve, reject) => {
        this.pendingRequests.push({ resolve, reject, request: retryRequest })
      })
    }

    this.isShowingCaptcha = true

    try {
      const success = await this.callbacks.onShowCaptcha({
        type: 'image',
        captchaUrl: '/api/captcha',
      })

      if (success) {
        const response = await retryRequest()
        await this.processPendingRequests()
        return response
      } else {
        throw new Error('Captcha verification failed')
      }
    } finally {
      this.isShowingCaptcha = false
    }
  }

  private async processPendingRequests(): Promise<void> {
    const requests = [...this.pendingRequests]
    this.pendingRequests = []

    await Promise.all(
      requests.map(async ({ resolve, reject, request }) => {
        try {
          const response = await request()
          resolve(response)
        } catch (error) {
          reject(error as Error)
        }
      })
    )
  }

  private getStoredToken(): string | null {
    try {
      const stored = localStorage.getItem('admin-storage')
      if (stored) {
        const parsed = JSON.parse(stored)
        return parsed.state?.token || null
      }
    } catch {
      return null
    }
    return null
  }
}

export function createRequestInterceptor(callbacks: InterceptorCallbacks) {
  const interceptor = new RequestInterceptor(callbacks)
  return (url: string, init: RequestInit) => interceptor.intercept(url, init)
}
