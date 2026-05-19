// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { parseModuleId } from '../id-helpers'

describe('parseModuleId', () => {
  it('should parse numeric id with prefix', () => {
    expect(parseModuleId('order', 'order-123')).toBe(123)
  })

  it('should parse id with single digit', () => {
    expect(parseModuleId('todo', 'todo-5')).toBe(5)
  })

  it('should return -1 for non-numeric id', () => {
    expect(parseModuleId('order', 'order-abc')).toBe(-1)
  })

  it('should return -1 for missing prefix', () => {
    expect(parseModuleId('order', 'ticket-123')).toBe(-1)
  })

  it('should handle zero id', () => {
    expect(parseModuleId('test', 'test-0')).toBe(0)
  })

  it('should parse large numeric id', () => {
    expect(parseModuleId('item', 'item-999999')).toBe(999999)
  })
})
