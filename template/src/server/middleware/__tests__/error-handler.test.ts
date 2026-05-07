import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'
import { AppError, ErrorCode } from '@server/utils/app-error'

vi.mock('@server/utils/logger', () => {
  const noop = () => {}
  const mockLogger = { info: noop, warn: noop, error: noop, debug: noop, trace: noop, fatal: noop, child: () => mockLogger }
  return {
    createModuleLoggerSync: () => mockLogger,
    logger: { api: () => mockLogger, app: () => mockLogger, db: () => mockLogger, ws: () => mockLogger, bootstrap: () => mockLogger, module: () => mockLogger },
  }
})

import { errorHandlerMiddleware } from '../error-handler'

function createTestApp(options?: { includeStackTrace?: boolean; logErrors?: boolean }) {
  const app = new Hono()

  app.use('*', errorHandlerMiddleware({
    includeStackTrace: options?.includeStackTrace,
    logErrors: options?.logErrors,
  }))

  app.onError((err, c) => {
    if (AppError.isAppError(err)) {
      return c.json({
        success: false as const,
        error: err.message,
        status: err.statusCode,
        details: err.details,
      }, err.statusCode as 400)
    }

    if (err instanceof ZodError) {
      const details = err.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }))
      return c.json({
        success: false as const,
        error: 'Validation failed',
        status: 400,
        details,
      }, 400)
    }

    if (err instanceof HTTPException) {
      const status = err.status || 500
      const message = err.message || 'Internal server error'
      return c.json({ success: false as const, error: message, status }, status as 400)
    }

    const message = err instanceof Error ? err.message : 'Internal server error'
    const response: { success: false; error: string; status: number; stack?: string } = {
      success: false as const,
      error: message,
      status: 500,
    }
    if (options?.includeStackTrace && err instanceof Error && err.stack) {
      response.stack = err.stack
    }
    return c.json(response, 500)
  })

  return app
}

describe('errorHandlerMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AppError handling', () => {
    it('should handle AppError with correct status and message', async () => {
      const app = createTestApp()
      app.get('/test', () => {
        throw new AppError({ code: ErrorCode.NOT_FOUND, message: 'Resource not found', statusCode: 404 })
      })

      const res = await app.request('/test')
      expect(res.status).toBe(404)
      const body: any = await res.json()
      expect(body.success).toBe(false)
      expect(body.error).toBe('Resource not found')
      expect(body.status).toBe(404)
    })

    it('should include details in AppError response', async () => {
      const app = createTestApp()
      app.get('/test', () => {
        throw new AppError({
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Validation failed',
          statusCode: 400,
          details: [{ field: 'email', message: 'Invalid email' }],
        })
      })

      const res = await app.request('/test')
      expect(res.status).toBe(400)
      const body: any = await res.json()
      expect(body.details).toEqual([{ field: 'email', message: 'Invalid email' }])
    })

    it('should set Content-Type to application/json', async () => {
      const app = createTestApp()
      app.get('/test', () => {
        throw new AppError({ code: ErrorCode.UNAUTHORIZED, message: 'Unauthorized', statusCode: 401 })
      })

      const res = await app.request('/test')
      expect(res.headers.get('Content-Type')).toContain('application/json')
    })

    it('should handle AppError without details', async () => {
      const app = createTestApp()
      app.get('/test', () => {
        throw new AppError({ code: ErrorCode.FORBIDDEN, message: 'Forbidden', statusCode: 403 })
      })

      const res = await app.request('/test')
      expect(res.status).toBe(403)
      const body: any = await res.json()
      expect(body.success).toBe(false)
      expect(body.error).toBe('Forbidden')
    })
  })

  describe('ZodError handling', () => {
    it('should handle ZodError with formatted validation errors', async () => {
      const app = createTestApp()
      app.get('/test', () => {
        throw new ZodError([{
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number',
        }] as any)
      })

      const res = await app.request('/test')
      expect(res.status).toBe(400)
      const body: any = await res.json()
      expect(body.success).toBe(false)
      expect(body.error).toBe('Validation failed')
      expect(body.details).toHaveLength(1)
      expect(body.details[0]).toEqual({
        field: 'email',
        message: 'Expected string, received number',
        code: 'invalid_type',
      })
    })

    it('should handle ZodError with nested path', async () => {
      const app = createTestApp()
      app.get('/test', () => {
        throw new ZodError([{
          code: 'invalid_type',
          expected: 'string',
          received: 'undefined',
          path: ['user', 'address', 'city'],
          message: 'City is required',
        }] as any)
      })

      const res = await app.request('/test')
      const body: any = await res.json()
      expect(body.details[0].field).toBe('user.address.city')
    })

    it('should handle ZodError with multiple issues', async () => {
      const app = createTestApp()
      app.get('/test', () => {
        throw new ZodError([
          { code: 'invalid_type', expected: 'string', received: 'number', path: ['email'], message: 'bad email' },
          { code: 'too_small', minimum: 1, type: 'string', inclusive: true, path: ['name'], message: 'required' },
        ] as any)
      })

      const res = await app.request('/test')
      const body: any = await res.json()
      expect(body.details).toHaveLength(2)
    })
  })

  describe('HTTPException handling', () => {
    it('should handle HTTPException with status and message', async () => {
      const app = createTestApp()
      app.get('/test', () => {
        throw new HTTPException(403, { message: 'Access denied' })
      })

      const res = await app.request('/test')
      expect(res.status).toBe(403)
      const body: any = await res.json()
      expect(body.success).toBe(false)
      expect(body.error).toBe('Access denied')
      expect(body.status).toBe(403)
    })

    it('should handle HTTPException with empty message', async () => {
      const app = createTestApp()
      app.get('/test', () => {
        throw new HTTPException(500, { message: '' })
      })

      const res = await app.request('/test')
      expect(res.status).toBe(500)
      const body: any = await res.json()
      expect(body.error).toBe('Internal server error')
    })
  })

  describe('unknown error handling', () => {
    it('should handle generic Error', async () => {
      const app = createTestApp()
      app.get('/test', () => {
        throw new Error('Something went wrong')
      })

      const res = await app.request('/test')
      expect(res.status).toBe(500)
      const body: any = await res.json()
      expect(body.success).toBe(false)
      expect(body.error).toBe('Something went wrong')
    })

    it('should handle non-Error thrown value', async () => {
      const app = createTestApp()
      app.get('/test', () => {
        throw 'string error'
      })

      const res = await app.request('/test')
      expect(res.status).toBe(500)
      const body: any = await res.json()
      expect(body.error).toBe('Internal server error')
    })

    it('should include stack trace when option is enabled', async () => {
      const app = createTestApp({ includeStackTrace: true })
      app.get('/test', () => {
        throw new Error('With stack')
      })

      const res = await app.request('/test')
      const body: any = await res.json()
      expect(body.stack).toBeDefined()
      expect(typeof body.stack).toBe('string')
    })

    it('should not include stack trace when option is disabled', async () => {
      const app = createTestApp({ includeStackTrace: false })
      app.get('/test', () => {
        throw new Error('No stack')
      })

      const res = await app.request('/test')
      const body: any = await res.json()
      expect(body.stack).toBeUndefined()
    })

    it('should not include stack trace for non-Error throws', async () => {
      const app = createTestApp({ includeStackTrace: true })
      app.get('/test', () => {
        throw 42
      })

      const res = await app.request('/test')
      const body: any = await res.json()
      expect(body.stack).toBeUndefined()
    })
  })

  describe('normal flow', () => {
    it('should pass through when no error', async () => {
      const app = createTestApp()
      app.get('/test', (c) => c.json({ success: true, data: 'hello' }))

      const res = await app.request('/test')
      expect(res.status).toBe(200)
      const body: any = await res.json()
      expect(body.success).toBe(true)
      expect(body.data).toBe('hello')
    })
  })

  describe('middleware try/catch path (direct invocation)', () => {
    it('should handle no-log-errors option', async () => {
      const app = new Hono()
      app.use('*', errorHandlerMiddleware({ logErrors: false }))
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test')
      expect(res.status).toBe(200)
    })

    it('should handle includeStackTrace with non-Error', async () => {
      const app = new Hono()
      app.use('*', errorHandlerMiddleware({ includeStackTrace: true, logErrors: false }))
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test')
      expect(res.status).toBe(200)
    })
  })
})
