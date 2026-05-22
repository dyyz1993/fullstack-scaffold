// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  toISOString,
  formatDate,
  parseDate,
  getTimestamp,
  transformDateField,
  transformRole,
  transformAuditLog,
} from '../date'

describe('date utils', () => {
  describe('toISOString', () => {
    it('should convert Date to ISO string', () => {
      const date = new Date('2024-01-15T10:30:00.000Z')
      expect(toISOString(date)).toBe('2024-01-15T10:30:00.000Z')
    })
  })

  describe('formatDate', () => {
    it('should format Date object', () => {
      const date = new Date('2024-01-15T10:30:00.000Z')
      expect(formatDate(date)).toBe('2024-01-15T10:30:00.000Z')
    })

    it('should format date string', () => {
      const result = formatDate('2024-01-15')
      expect(typeof result).toBe('string')
      expect(new Date(result).getFullYear()).toBe(2024)
    })

    it('should format timestamp number', () => {
      const ts = new Date('2024-01-15T10:30:00.000Z').getTime()
      expect(formatDate(ts)).toBe('2024-01-15T10:30:00.000Z')
    })
  })

  describe('parseDate', () => {
    it('should parse date string to Date', () => {
      const result = parseDate('2024-01-15T10:30:00.000Z')
      expect(result).toBeInstanceOf(Date)
      expect(result.toISOString()).toBe('2024-01-15T10:30:00.000Z')
    })
  })

  describe('getTimestamp', () => {
    it('should return current timestamp in milliseconds', () => {
      const before = Date.now()
      const result = getTimestamp()
      const after = Date.now()
      expect(result).toBeGreaterThanOrEqual(before)
      expect(result).toBeLessThanOrEqual(after)
      expect(typeof result).toBe('number')
    })
  })

  describe('transformDateField', () => {
    it('should convert Date to ISO string', () => {
      const date = new Date('2024-01-15T00:00:00.000Z')
      expect(transformDateField(date)).toBe('2024-01-15T00:00:00.000Z')
    })

    it('should return current time for null', () => {
      const before = new Date().toISOString()
      const result = transformDateField(null)
      const after = new Date().toISOString()
      expect(result >= before).toBe(true)
      expect(result <= after).toBe(true)
    })

    it('should return current time for undefined', () => {
      const before = new Date().toISOString()
      const result = transformDateField(undefined)
      const after = new Date().toISOString()
      expect(result >= before).toBe(true)
      expect(result <= after).toBe(true)
    })
  })

  describe('transformRole', () => {
    it('should transform role dates to strings', () => {
      const role = {
        id: 'role-1',
        name: 'admin',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-06-01T00:00:00.000Z'),
      }
      const result = transformRole(role)
      expect(result.id).toBe('role-1')
      expect(result.name).toBe('admin')
      expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z')
      expect(result.updatedAt).toBe('2024-06-01T00:00:00.000Z')
    })

    it('should handle null dates', () => {
      const role = {
        id: 'role-2',
        name: 'user',
        createdAt: null,
        updatedAt: null,
      }
      const result = transformRole(role)
      expect(result.id).toBe('role-2')
      expect(typeof result.createdAt).toBe('string')
      expect(typeof result.updatedAt).toBe('string')
    })
  })

  describe('transformAuditLog', () => {
    it('should transform audit log date to string', () => {
      const log = {
        id: 'log-1',
        action: 'CREATE',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
      }
      const result = transformAuditLog(log)
      expect(result.id).toBe('log-1')
      expect(result.action).toBe('CREATE')
      expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z')
    })

    it('should handle null createdAt', () => {
      const log = { id: 'log-2', createdAt: null }
      const result = transformAuditLog(log)
      expect(result.id).toBe('log-2')
      expect(typeof result.createdAt).toBe('string')
    })
  })
})
