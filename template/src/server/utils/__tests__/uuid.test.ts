// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { generateUUID } from '../uuid'

describe('generateUUID', () => {
  it('should return a string', () => {
    expect(typeof generateUUID()).toBe('string')
  })

  it('should match UUID format', () => {
    const uuid = generateUUID()
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{3,4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('should generate unique values', () => {
    expect(generateUUID()).not.toBe(generateUUID())
  })

  it('should generate 100 unique values', () => {
    const uuids = new Set(Array.from({ length: 100 }, () => generateUUID()))
    expect(uuids.size).toBe(100)
  })
})
