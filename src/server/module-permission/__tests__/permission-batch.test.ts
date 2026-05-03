/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { permissionService } from '../services/permission-service-impl'
import { setupTestDatabase, cleanupTestDatabase } from '../../db/test-setup'

describe('hasPermissionBatch', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  it('should return true for all super admin permissions', async () => {
    const result = await permissionService.hasPermissionBatch('super-admin-1', [
      'order:view',
      'order:create',
      'user:delete',
    ])
    expect(result).toEqual({
      'order:view': true,
      'order:create': true,
      'user:delete': true,
    })
  })

  it('should return false for permissions user does not have', async () => {
    const result = await permissionService.hasPermissionBatch('customer-service-1', [
      'order:view',
      'user:delete',
    ])
    expect(result['order:view']).toBe(true)
    expect(result['user:delete']).toBe(false)
  })

  it('should return empty object for empty array', async () => {
    const result = await permissionService.hasPermissionBatch('super-admin-1', [])
    expect(result).toEqual({})
  })

  it('should handle non-existent user', async () => {
    const result = await permissionService.hasPermissionBatch('non-existent-user', ['order:view'])
    expect(result['order:view']).toBe(false)
  })
})
