// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  generateOrderNo,
  generateTicketNo,
  generateDisputeNo,
  randomDate,
  randomElement,
} from '../generate'

describe('generate', () => {
  describe('generateOrderNo', () => {
    it('should start with ORD prefix', () => {
      expect(generateOrderNo()).toMatch(/^ORD/)
    })

    it('should generate unique values', () => {
      expect(generateOrderNo()).not.toBe(generateOrderNo())
    })

    it('should have length greater than 10', () => {
      expect(generateOrderNo().length).toBeGreaterThan(10)
    })
  })

  describe('generateTicketNo', () => {
    it('should start with TKT prefix', () => {
      expect(generateTicketNo()).toMatch(/^TKT/)
    })

    it('should generate unique values', () => {
      expect(generateTicketNo()).not.toBe(generateTicketNo())
    })
  })

  describe('generateDisputeNo', () => {
    it('should start with DSP prefix', () => {
      expect(generateDisputeNo()).toMatch(/^DSP/)
    })

    it('should generate unique values', () => {
      expect(generateDisputeNo()).not.toBe(generateDisputeNo())
    })
  })

  describe('randomDate', () => {
    it('should return ISO string between start and end', () => {
      const start = new Date('2024-01-01T00:00:00.000Z')
      const end = new Date('2024-12-31T23:59:59.999Z')
      const result = randomDate(start, end)
      const resultDate = new Date(result)
      expect(resultDate.getTime()).toBeGreaterThanOrEqual(start.getTime())
      expect(resultDate.getTime()).toBeLessThanOrEqual(end.getTime())
    })

    it('should return valid ISO string', () => {
      const start = new Date('2020-01-01')
      const end = new Date('2025-01-01')
      const result = randomDate(start, end)
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })

  describe('randomElement', () => {
    it('should return element from array', () => {
      const arr = [1, 2, 3, 4, 5]
      const result = randomElement(arr)
      expect(arr).toContain(result)
    })

    it('should handle single-element array', () => {
      expect(randomElement([42])).toBe(42)
    })

    it('should return string from string array', () => {
      const arr = ['a', 'b', 'c']
      const result = randomElement(arr)
      expect(typeof result).toBe('string')
      expect(arr).toContain(result)
    })
  })
})
