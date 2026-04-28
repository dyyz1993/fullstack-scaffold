import type { MiddlewareHandler } from 'hono'

export function bodyLimitMiddleware(limit: number): MiddlewareHandler {
  return async (c, next) => {
    const contentLength = c.req.header('content-length')
    if (contentLength && parseInt(contentLength, 10) > limit) {
      return c.json({ success: false, error: 'Request body too large', status: 413 }, 413)
    }
    await next()
  }
}
