// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessError,
  RateLimitError,
  SystemError,
  ErrorCode,
  toAppError,
  tryCatch,
} from '../app-error'

describe('ErrorCode', () => {
  it('should have all error code categories', () => {
    expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR')
    expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED')
    expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN')
    expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND')
    expect(ErrorCode.CONFLICT).toBe('CONFLICT')
    expect(ErrorCode.BUSINESS_ERROR).toBe('BUSINESS_ERROR')
    expect(ErrorCode.RATE_LIMIT).toBe('RATE_LIMIT')
    expect(ErrorCode.SYSTEM_ERROR).toBe('SYSTEM_ERROR')
  })
})

describe('AppError', () => {
  it('should create with all options', () => {
    const cause = new Error('root cause')
    const err = new AppError({
      code: ErrorCode.VALIDATION_ERROR,
      message: 'test error',
      statusCode: 400,
      details: [{ field: 'name', message: 'required' }],
      cause,
      logLevel: 'error',
    })
    expect(err.name).toBe('AppError')
    expect(err.code).toBe(ErrorCode.VALIDATION_ERROR)
    expect(err.statusCode).toBe(400)
    expect(err.message).toBe('test error')
    expect(err.details).toEqual([{ field: 'name', message: 'required' }])
    expect(err.cause).toBe(cause)
    expect(err.logLevel).toBe('error')
    expect(err.timestamp).toBeTruthy()
  })

  it('should default logLevel to warn', () => {
    const err = new AppError({
      code: ErrorCode.SYSTEM_ERROR,
      message: 'x',
      statusCode: 500,
    })
    expect(err.logLevel).toBe('warn')
  })

  it('should produce correct toJSON', () => {
    const err = new AppError({
      code: ErrorCode.NOT_FOUND,
      message: 'not found',
      statusCode: 404,
      details: [{ message: 'detail' }],
    })
    const json = err.toJSON()
    expect(json).toEqual({
      success: false,
      error: 'not found',
      code: ErrorCode.NOT_FOUND,
      status: 404,
      details: [{ message: 'detail' }],
      timestamp: expect.any(String),
    })
  })

  it('isAppError returns true for AppError', () => {
    const err = new AppError({ code: ErrorCode.SYSTEM_ERROR, message: 'x', statusCode: 500 })
    expect(AppError.isAppError(err)).toBe(true)
  })

  it('isAppError returns false for regular Error', () => {
    expect(AppError.isAppError(new Error('x'))).toBe(false)
  })

  it('isAppError returns false for non-error', () => {
    expect(AppError.isAppError(null)).toBe(false)
    expect(AppError.isAppError('x')).toBe(false)
    expect(AppError.isAppError(undefined)).toBe(false)
  })
})

describe('ValidationError', () => {
  it('should create with message only', () => {
    const err = new ValidationError('invalid input')
    expect(err.name).toBe('ValidationError')
    expect(err.statusCode).toBe(400)
    expect(err.code).toBe(ErrorCode.VALIDATION_ERROR)
    expect(err.message).toBe('invalid input')
    expect(err.logLevel).toBe('info')
  })

  it('should create with details', () => {
    const err = new ValidationError('invalid', [{ field: 'email', message: 'bad format' }])
    expect(err.details).toEqual([{ field: 'email', message: 'bad format' }])
  })
})

describe('AuthenticationError', () => {
  it('should default to Unauthorized', () => {
    const err = new AuthenticationError()
    expect(err.name).toBe('AuthenticationError')
    expect(err.statusCode).toBe(401)
    expect(err.message).toBe('Unauthorized')
    expect(err.code).toBe(ErrorCode.UNAUTHORIZED)
  })

  it('should accept custom message and code', () => {
    const err = new AuthenticationError('custom', ErrorCode.TOKEN_EXPIRED)
    expect(err.message).toBe('custom')
    expect(err.code).toBe(ErrorCode.TOKEN_EXPIRED)
  })

  it('tokenExpired static', () => {
    const err = AuthenticationError.tokenExpired()
    expect(err.message).toBe('Token has expired')
    expect(err.code).toBe(ErrorCode.TOKEN_EXPIRED)
  })

  it('tokenInvalid static', () => {
    const err = AuthenticationError.tokenInvalid()
    expect(err.message).toBe('Invalid token')
    expect(err.code).toBe(ErrorCode.TOKEN_INVALID)
  })

  it('tokenMissing static', () => {
    const err = AuthenticationError.tokenMissing()
    expect(err.message).toBe('Authentication token is required')
    expect(err.code).toBe(ErrorCode.TOKEN_MISSING)
  })
})

describe('AuthorizationError', () => {
  it('should default to Forbidden', () => {
    const err = new AuthorizationError()
    expect(err.name).toBe('AuthorizationError')
    expect(err.statusCode).toBe(403)
    expect(err.message).toBe('Forbidden')
  })

  it('should accept custom message and details', () => {
    const err = new AuthorizationError('no access', [{ message: 'reason' }])
    expect(err.message).toBe('no access')
    expect(err.details).toEqual([{ message: 'reason' }])
  })

  it('permissionDenied static with permission', () => {
    const err = AuthorizationError.permissionDenied('admin.write')
    expect(err.message).toBe('Permission denied: admin.write')
    expect(err.details).toEqual([{ message: 'Missing required permission: admin.write' }])
  })

  it('permissionDenied static without permission', () => {
    const err = AuthorizationError.permissionDenied()
    expect(err.message).toBe('Permission denied')
    expect(err.details).toBeUndefined()
  })

  it('insufficientRole static with both roles', () => {
    const err = AuthorizationError.insufficientRole('user', 'admin')
    expect(err.message).toBe('Insufficient role privileges')
    expect(err.details).toEqual([
      { message: "Role 'user' does not meet required role 'admin'" },
    ])
  })

  it('insufficientRole static without roles', () => {
    const err = AuthorizationError.insufficientRole()
    expect(err.details).toBeUndefined()
  })

  it('insufficientRole static with only one role', () => {
    const err = AuthorizationError.insufficientRole('user', undefined)
    expect(err.details).toBeUndefined()
  })
})

describe('NotFoundError', () => {
  it('should create without identifier', () => {
    const err = new NotFoundError('User')
    expect(err.name).toBe('NotFoundError')
    expect(err.statusCode).toBe(404)
    expect(err.message).toBe('User not found')
  })

  it('should create with identifier', () => {
    const err = new NotFoundError('Order', '123')
    expect(err.message).toBe('Order not found: 123')
  })

  it('user static', () => {
    const err = NotFoundError.user('42')
    expect(err.message).toBe('User not found: 42')
  })

  it('user static without id', () => {
    const err = NotFoundError.user()
    expect(err.message).toBe('User not found')
  })

  it('order static', () => {
    const err = NotFoundError.order('100')
    expect(err.message).toBe('Order not found: 100')
  })

  it('dispute static', () => {
    const err = NotFoundError.dispute('d1')
    expect(err.message).toBe('Dispute not found: d1')
  })

  it('ticket static', () => {
    const err = NotFoundError.ticket('t1')
    expect(err.message).toBe('Ticket not found: t1')
  })
})

describe('ConflictError', () => {
  it('should create with message', () => {
    const err = new ConflictError('already exists')
    expect(err.name).toBe('ConflictError')
    expect(err.statusCode).toBe(409)
    expect(err.message).toBe('already exists')
  })

  it('duplicateEntry static', () => {
    const err = ConflictError.duplicateEntry('email', 'test@test.com')
    expect(err.message).toBe('Duplicate entry for email')
    expect(err.details).toEqual([{ field: 'email', message: "Value 'test@test.com' already exists" }])
  })
})

describe('BusinessError', () => {
  it('should create with message only', () => {
    const err = new BusinessError('bad state')
    expect(err.name).toBe('BusinessError')
    expect(err.statusCode).toBe(422)
    expect(err.code).toBe(ErrorCode.BUSINESS_ERROR)
  })

  it('should accept custom code and details', () => {
    const err = new BusinessError('bad', ErrorCode.INVALID_STATE, [{ message: 'detail' }])
    expect(err.code).toBe(ErrorCode.INVALID_STATE)
    expect(err.details).toEqual([{ message: 'detail' }])
  })

  it('invalidState static', () => {
    const err = BusinessError.invalidState('pending', ['active', 'closed'])
    expect(err.code).toBe(ErrorCode.INVALID_STATE)
    expect(err.details).toEqual([
      { message: "Current state 'pending' is not valid. Expected one of: active, closed" },
    ])
  })

  it('operationNotAllowed static', () => {
    const err = BusinessError.operationNotAllowed('not today')
    expect(err.code).toBe(ErrorCode.OPERATION_NOT_ALLOWED)
    expect(err.message).toBe('Operation not allowed: not today')
  })
})

describe('RateLimitError', () => {
  it('should default message', () => {
    const err = new RateLimitError()
    expect(err.name).toBe('RateLimitError')
    expect(err.statusCode).toBe(429)
    expect(err.message).toBe('Too many requests')
  })

  it('should accept custom message and retryAfter', () => {
    const err = new RateLimitError('slow down', 60)
    expect(err.message).toBe('slow down')
    expect(err.retryAfter).toBe(60)
  })
})

describe('SystemError', () => {
  it('should default message', () => {
    const err = new SystemError()
    expect(err.name).toBe('SystemError')
    expect(err.statusCode).toBe(500)
    expect(err.message).toBe('Internal server error')
    expect(err.logLevel).toBe('error')
  })

  it('should accept custom message and cause', () => {
    const cause = new Error('db down')
    const err = new SystemError('something broke', cause)
    expect(err.message).toBe('something broke')
    expect(err.cause).toBe(cause)
  })

  it('databaseError static', () => {
    const cause = new Error('conn refused')
    const err = SystemError.databaseError(cause)
    expect(err.message).toBe('Database operation failed')
    expect(err.cause).toBe(cause)
  })

  it('serviceUnavailable static', () => {
    const err = SystemError.serviceUnavailable('redis')
    expect(err.message).toBe("Service 'redis' is unavailable")
  })
})

describe('toAppError', () => {
  it('should return same AppError', () => {
    const original = new ValidationError('bad')
    expect(toAppError(original)).toBe(original)
  })

  it('should wrap Error into SystemError', () => {
    const err = toAppError(new Error('oops'))
    expect(err).toBeInstanceOf(SystemError)
    expect(err.message).toBe('oops')
  })

  it('should wrap string into SystemError', () => {
    const err = toAppError('string error')
    expect(err).toBeInstanceOf(SystemError)
    expect(err.message).toBe('string error')
  })

  it('should wrap null into SystemError', () => {
    const err = toAppError(null)
    expect(err).toBeInstanceOf(SystemError)
    expect(err.message).toBe('null')
  })

  it('should wrap number into SystemError', () => {
    const err = toAppError(42)
    expect(err).toBeInstanceOf(SystemError)
    expect(err.message).toBe('42')
  })
})

describe('tryCatch', () => {
  it('should return result on success', async () => {
    const result = await tryCatch(() => Promise.resolve(42))
    expect(result).toBe(42)
  })

  it('should convert error with default mapper', async () => {
    await expect(
      tryCatch(() => Promise.reject(new Error('fail')))
    ).rejects.toThrow('fail')
  })

  it('should use custom error mapper', async () => {
    await expect(
      tryCatch(
        () => Promise.reject(new Error('fail')),
        (err) => new ValidationError(String(err))
      )
    ).rejects.toThrow('Error: fail')
  })

  it('should convert non-Error throws', async () => {
    await expect(
      tryCatch(() => Promise.reject('string error'))
    ).rejects.toThrow('string error')
  })
})
