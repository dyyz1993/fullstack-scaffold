import { describe, it, expect } from 'vitest'

describe('extractToken', () => {
  function extractToken(authHeader: string | undefined): string | null {
    if (!authHeader) return null
    if (!authHeader.startsWith('Bearer ')) return null
    const token = authHeader.slice(7).trim()
    return token || null
  }

  it('should return null for undefined', () => {
    expect(extractToken(undefined)).toBeNull()
  })

  it('should return null for empty string', () => {
    expect(extractToken('')).toBeNull()
  })

  it('should return null for invalid format', () => {
    expect(extractToken('InvalidFormat token')).toBeNull()
  })

  it('should return null for Bearer with only spaces', () => {
    expect(extractToken('Bearer ')).toBeNull()
    expect(extractToken('Bearer    ')).toBeNull()
  })

  it('should return token for valid Bearer token', () => {
    expect(extractToken('Bearer my-token')).toBe('my-token')
  })

  it('should trim token', () => {
    expect(extractToken('Bearer  my-token  ')).toBe('my-token')
  })
})
