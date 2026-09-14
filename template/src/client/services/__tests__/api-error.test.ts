/**
 * @framework-baseline d2338b5b2b151f0b
 */

import { describe, it, expect } from 'vitest'
import { parseApiError } from '../api-error'

describe('parseApiError', () => {
  it('returns error string when error is a plain string', () => {
    const result = { success: false, error: 'Title too long' }
    expect(parseApiError(result, 'fallback')).toBe('Title too long')
  })

  it('extracts issue messages when error is a ZodError object (zod-validator default 400 shape)', () => {
    // @hono/zod-openapi 未配置 defaultHook 时 400 响应体：
    // { success: false, error: { name: 'ZodError', issues: [...] } }
    const result = {
      success: false,
      error: {
        name: 'ZodError',
        issues: [
          {
            code: 'too_big',
            maximum: 200,
            type: 'string',
            inclusive: true,
            path: ['title'],
            message: 'Title too long',
          },
        ],
      },
    }
    expect(parseApiError(result, 'fallback')).toBe('title: Title too long')
  })

  it('joins multiple zod issues with semicolons', () => {
    const result = {
      success: false,
      error: {
        name: 'ZodError',
        issues: [
          { path: ['title'], message: 'Title too long' },
          { path: ['description'], message: 'Description too long' },
        ],
      },
    }
    expect(parseApiError(result, 'fallback')).toBe(
      'title: Title too long; description: Description too long'
    )
  })

  it('handles error as a plain array of issues', () => {
    const result = {
      success: false,
      error: [{ path: ['title'], message: 'Too long' }],
    }
    expect(parseApiError(result, 'fallback')).toBe('title: Too long')
  })

  it('handles error as a plain array of strings', () => {
    const result = { success: false, error: ['first error', 'second error'] }
    expect(parseApiError(result, 'fallback')).toBe('first error; second error')
  })

  it('uses error.message when error is an object with message', () => {
    const result = { success: false, error: { message: 'Something broke' } }
    expect(parseApiError(result, 'fallback')).toBe('Something broke')
  })

  it('appends details field messages from errorHandlerMiddleware 400 shape', () => {
    const result = {
      success: false,
      error: 'Validation failed',
      status: 400,
      details: [{ field: 'title', message: 'Title too long', code: 'too_big' }],
    }
    expect(parseApiError(result, 'fallback')).toBe('Validation failed: title: Title too long')
  })

  it('returns error string alone when details is empty', () => {
    const result = { success: false, error: 'Validation failed', details: [] }
    expect(parseApiError(result, 'fallback')).toBe('Validation failed')
  })

  it('falls back to top-level message when error missing', () => {
    const result = { success: false, message: 'top level message' }
    expect(parseApiError(result, 'fallback')).toBe('top level message')
  })

  it('returns fallback when nothing parseable', () => {
    expect(parseApiError(undefined, 'fallback')).toBe('fallback')
    expect(parseApiError(null, 'fallback')).toBe('fallback')
    expect(parseApiError('not an object', 'fallback')).toBe('fallback')
    expect(parseApiError({ success: false }, 'fallback')).toBe('fallback')
    expect(parseApiError({ error: 42 }, 'fallback')).toBe('fallback')
  })

  it('never returns a non-string even for deeply nested junk', () => {
    const result = { success: false, error: { issues: [{ message: 123 }] } }
    expect(parseApiError(result, 'fallback')).toBe('fallback')
  })
})
