// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { parseJsonField, serializeJsonField } from '../json'

describe('json utils', () => {
  describe('parseJsonField', () => {
    it('should parse valid JSON string', () => {
      expect(parseJsonField<{ name: string }>('{"name":"test"}')).toEqual({ name: 'test' })
    })

    it('should return undefined for null', () => {
      expect(parseJsonField(null)).toBeUndefined()
    })

    it('should return undefined for undefined', () => {
      expect(parseJsonField(undefined)).toBeUndefined()
    })

    it('should return undefined for empty string', () => {
      expect(parseJsonField('')).toBeUndefined()
    })

    it('should return undefined for invalid JSON', () => {
      expect(parseJsonField('{invalid}')).toBeUndefined()
    })

    it('should parse array JSON', () => {
      expect(parseJsonField<number[]>('[1,2,3]')).toEqual([1, 2, 3])
    })
  })

  describe('serializeJsonField', () => {
    it('should serialize object to JSON string', () => {
      expect(serializeJsonField({ name: 'test' })).toBe('{"name":"test"}')
    })

    it('should return null for undefined', () => {
      expect(serializeJsonField(undefined)).toBeNull()
    })

    it('should return null for null', () => {
      expect(serializeJsonField(null)).toBeNull()
    })

    it('should serialize arrays', () => {
      expect(serializeJsonField([1, 2, 3])).toBe('[1,2,3]')
    })
  })
})
