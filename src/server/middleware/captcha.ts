import type { MiddlewareHandler } from 'hono'
import { createModuleLoggerSync } from '../utils/logger'

interface SessionState {
  verified: boolean
  requestCount: number
  windowStart: number
  verifiedAt?: number
}

interface CaptchaOptions {
  maxRequests?: number
  windowMs?: number
  skipPaths?: string[]
}

const log = createModuleLoggerSync('captcha')

const DEFAULT_MAX_REQUESTS = 100
const DEFAULT_WINDOW_MS = 15 * 60 * 1000
const DEFAULT_SKIP_PATHS = [
  '/api/captcha',
  '/api/verify-captcha',
  '/api/admin/login',
  '/api/admin/register',
]

const BOT_PATTERNS = ['bot', 'crawler', 'spider', 'scraper']

const sessions = new Map<string, SessionState>()
const verifiedSessions = new Map<string, boolean>()

function isBot(userAgent: string | undefined): boolean {
  if (!userAgent || userAgent.length < 10) return true
  const lower = userAgent.toLowerCase()
  return BOT_PATTERNS.some(pattern => lower.includes(pattern))
}

function getSessionId(c: { req: { header: (name: string) => string | undefined } }): string {
  const cookie = c.req.header('Cookie') || ''
  const match = cookie.match(/session_id=([^;]+)/)
  return match ? match[1] : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function captchaMiddleware(options: CaptchaOptions = {}): MiddlewareHandler {
  const maxRequests = options.maxRequests ?? DEFAULT_MAX_REQUESTS
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS
  const skipPaths = [...DEFAULT_SKIP_PATHS, ...(options.skipPaths || [])]

  return async (c, next) => {
    if (process.env.NODE_ENV === 'test') {
      await next()
      return
    }

    const path = new URL(c.req.url).pathname
    if (skipPaths.some(sp => path.startsWith(sp))) {
      await next()
      return
    }

    const ua = c.req.header('User-Agent')
    if (isBot(ua)) {
      log.info({ path, ua }, 'Blocked bot request')
      return c.json({ success: false, needCaptcha: true, error: 'Suspicious request' }, 403)
    }

    const sessionId = getSessionId(c)
    const now = Date.now()
    let session = sessions.get(sessionId)

    if (verifiedSessions.get(sessionId)) {
      await next()
      return
    }

    if (!session || now - session.windowStart > windowMs) {
      session = { verified: false, requestCount: 0, windowStart: now }
      sessions.set(sessionId, session)
    }

    session.requestCount++

    if (session.requestCount > maxRequests) {
      log.info({ path, sessionId, count: session.requestCount }, 'Rate limit exceeded')
      const res = c.json({ success: false, needCaptcha: true, error: 'Rate limit exceeded' }, 429)
      if (!c.req.header('Cookie')?.includes('session_id')) {
        ;(res as unknown as { headers: { append: (n: string, v: string) => void } }).headers.append(
          'Set-Cookie',
          `session_id=${sessionId}; Path=/; HttpOnly`,
        )
      }
      return res
    }

    if (!c.req.header('Cookie')?.includes('session_id')) {
      c.header('Set-Cookie', `session_id=${sessionId}; Path=/; HttpOnly`)
    }

    await next()
  }
}

export function verifyCaptchaMiddleware(): MiddlewareHandler {
  return async c => {
    const cookie = c.req.header('Cookie') || ''
    const match = cookie.match(/session_id=([^;]+)/)
    if (!match) {
      return c.json({ error: 'Session not found' }, 400)
    }
    const sessionId = match[1]
    markCaptchaVerifiedMiddleware(sessionId)
    return c.json({ success: true })
  }
}

export function markCaptchaVerifiedMiddleware(sessionId: string): void {
  verifiedSessions.set(sessionId, true)
}

export function clearCaptchaSessionMiddleware(sessionId: string): void {
  sessions.delete(sessionId)
  verifiedSessions.delete(sessionId)
}
