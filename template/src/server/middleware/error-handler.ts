import type { MiddlewareHandler } from 'hono'
import { createModuleLoggerSync } from '../utils/logger'
import type { LogFnFields } from '../utils/logger'

export type ErrorHandlerOptions = {
  includeStackTrace?: boolean
  logErrors?: boolean
}

const defaultErrorHandlerOptions: ErrorHandlerOptions = {
  includeStackTrace: false,
  logErrors: true,
}

export function errorHandlerMiddleware(options: ErrorHandlerOptions = {}): MiddlewareHandler {
  const mergedOptions = { ...defaultErrorHandlerOptions, ...options }
  const log = createModuleLoggerSync('api')

  return async (c, next) => {
    try {
      await next()
    } catch (error) {
      if (mergedOptions.logErrors) {
        const fields: LogFnFields = {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          path: c.req.path,
          method: c.req.method,
        }
        log.error(fields, 'Unhandled error')
      }

      const message = error instanceof Error ? error.message : 'Internal server error'
      const response: { success: false; error: string; stack?: string } = {
        success: false,
        error: message,
      }

      if (mergedOptions.includeStackTrace && error instanceof Error && error.stack) {
        response.stack = error.stack
      }

      return c.json(response, 500)
    }
  }
}

export function createErrorHandlerMiddleware(options: ErrorHandlerOptions = {}) {
  return errorHandlerMiddleware(options)
}
