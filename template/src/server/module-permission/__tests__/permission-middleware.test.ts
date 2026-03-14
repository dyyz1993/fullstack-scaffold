import { describe, it, expect, beforeAll } from 'bun:test'
import { permissionService } from '../services/permission-service-impl'
import { roleService } from '../services/role-service'

describe('Permission Middleware Integration', () => {
  beforeAll(async () => {
    // 确保数据库已初始化
  })

  describe('hasPermission', () => {
    it('should return true when user has the required permission', async () => {
      // 客服人员有 order:view 权限
      const hasPermission = await permissionService.hasPermission(
        'test-customer-service-2',
        'order:view'
      )
      expect(hasPermission).toBe(true)
    })

    it('should return false when user does not have the required permission', async () => {
      // 客服人员没有 user:delete 权限
      const hasPermission = await permissionService.hasPermission(
        'test-customer-service-2',
        'user:delete'
      )
      expect(hasPermission).toBe(false)
    })

    it('should return true for super admin with any permission', async () => {
      // 超级管理员有所有权限
      const hasPermission = await permissionService.hasPermission(
        'test-super-admin-1',
        'user:delete'
      )
      expect(hasPermission).toBe(true)
    })

    it('should return false for non-existent user', async () => {
      const hasPermission = await permissionService.hasPermission('non-existent-user', 'user:view')
      expect(hasPermission).toBe(false)
    })
  })

  describe('getUserRoles', () => {
    it('should return roles for user with test token', async () => {
      const roles = await roleService.getUserRoles('test-customer-service-2')
      expect(roles.length).toBeGreaterThan(0)
      expect(roles[0].code).toBe('customer_service')
    })

    it('should return empty array for non-existent user', async () => {
      const roles = await roleService.getUserRoles('non-existent-user')
      expect(roles).toEqual([])
    })
  })
})
