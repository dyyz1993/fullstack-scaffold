import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'
import { createModuleLoggerSync } from '../utils/logger'
import { AppError } from '../utils/app-error'

export type ErrorHandlerOptions = {
  includeStackTrace?: boolean
  logErrors?: boolean
}

const defaultErrorHandlerOptions: ErrorHandlerOptions = {
  includeStackTrace: false,
  logErrors: true,
}

type ZodIssueFormatted = {
  field: string
  message: string
  code?: string
}

function formatZodError(error: ZodError): ZodIssueFormatted[] {
  return error.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }))
}

function createErrorResponse(status: number, message: string, details?: unknown) {
  const response: { success: false; error: string; status: number; details?: unknown } = {
    success: false,
    error: message,
    status,
  }
  if (details) {
    response.details = details
  }
  return response
}

export function createErrorMiddleware(options: ErrorHandlerOptions = {}) {
  const mergedOptions = { ...defaultErrorHandlerOptions, ...options }
  const log = createModuleLoggerSync('api')

  return (err: Error, c: Context): Response => {
    if (AppError.isAppError(err)) {
      if (mergedOptions.logErrors) {
        const logFn =
          err.logLevel === 'error' && typeof log.error === 'function'
            ? log.error
            : err.logLevel === 'warn' && typeof log.warn === 'function'
              ? log.warn
              : typeof log.info === 'function'
                ? log.info
                : log.warn
        logFn(
          {
            errorType: err.name,
            error: err.message,
            code: err.code,
            status: err.statusCode,
            path: c.req.path,
            method: c.req.method,
          },
          `Application error: ${err.name}`
        )
      }

      return c.json(
        createErrorResponse(err.statusCode, err.message, err.details),
        err.statusCode as ContentfulStatusCode
      )
    }

    if (err instanceof ZodError) {
      const formattedErrors = formatZodError(err)

      if (mergedOptions.logErrors) {
        log.warn(
          {
            errorType: 'ZodError',
            errors: formattedErrors,
            path: c.req.path,
            method: c.req.method,
          },
          'Validation error'
        )
      }

      return c.json(createErrorResponse(400, 'Validation failed', formattedErrors), 400)
    }

    if (err instanceof HTTPException) {
      if (mergedOptions.logErrors) {
        log.warn(
          {
            errorType: 'HTTPException',
            error: err.message,
            status: err.status,
            path: c.req.path,
            method: c.req.method,
          },
          'HTTP exception'
        )
      }

      const status = err.status || 500
      const message = err.message || 'Internal server error'
      return c.json(createErrorResponse(status, message), status as ContentfulStatusCode)
    }

    if (mergedOptions.logErrors) {
      log.error(
        {
          errorType: 'UnknownError',
          error: err.message,
          stack: err.stack,
          path: c.req.path,
          method: c.req.method,
        },
        'Unhandled error'
      )
    }

    const response: { success: false; error: string; status: number; stack?: string } = {
      success: false,
      error: err.message || 'Internal server error',
      status: 500,
    }

    if (mergedOptions.includeStackTrace && err.stack) {
      response.stack = err.stack
    }

    return c.json(response, 500)
  }
}

export {
  createErrorMiddleware as createAppErrorHandler,
  createErrorMiddleware as createErrorHandlerMiddleware,
}
