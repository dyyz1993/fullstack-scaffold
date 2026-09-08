// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { validatePermissions } from '../permission-utils'
import { Permission } from '@shared/modules/permission'

describe('validatePermissions', () => {
  it('should return true for valid permissions', () => {
    expect(validatePermissions([Permission.USER_VIEW, Permission.USER_CREATE])).toBe(true)
  })

  it('should return true for empty array', () => {
    expect(validatePermissions([])).toBe(true)
  })

  it('should return false for invalid permission string', () => {
    expect(validatePermissions(['invalid:permission' as Permission])).toBe(false)
  })

  it('should return false for mixed valid and invalid', () => {
    expect(validatePermissions([Permission.USER_VIEW, 'invalid:permission' as Permission])).toBe(false)
  })

  it('should return true for single valid permission', () => {
    expect(validatePermissions([Permission.ORDER_VIEW])).toBe(true)
  })
})
