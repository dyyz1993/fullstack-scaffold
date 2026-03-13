import { describe, it, expect } from 'vitest'
import * as service from '../services/permission-service'
import { Role } from '@shared/modules/permission'

describe('Permission Service', () => {
  describe('getAllRoles', () => {
    it('should return all roles', () => {
      const result = service.getAllRoles()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(3)
      expect(result[0]).toHaveProperty('role')
      expect(result[0]).toHaveProperty('label')
      expect(result[0]).toHaveProperty('permissions')
    })

    it('should contain correct role values', () => {
      const result = service.getAllRoles()
      const roles = result.map(r => r.role)
      expect(roles).toContain(Role.SUPER_ADMIN)
      expect(roles).toContain(Role.CUSTOMER_SERVICE)
      expect(roles).toContain(Role.USER)
    })
  })

  describe('getAllPermissions', () => {
    it('should return all permissions', () => {
      const result = service.getAllPermissions()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0]).toHaveProperty('permission')
      expect(result[0]).toHaveProperty('label')
      expect(result[0]).toHaveProperty('category')
    })

    it('should have valid category values', () => {
      const result = service.getAllPermissions()
      const categories = result.map(r => r.category)
      const validCategories = ['user', 'content', 'system', 'data', 'order', 'ticket', 'other']
      categories.forEach(cat => {
        expect(validCategories).toContain(cat)
      })
    })
  })

  describe('getUserPermissions', () => {
    it('should return user permissions for super admin', () => {
      const result = service.getUserPermissions('user-1', Role.SUPER_ADMIN)
      expect(result).toHaveProperty('userId', 'user-1')
      expect(result).toHaveProperty('role', Role.SUPER_ADMIN)
      expect(result.permissions.length).toBeGreaterThan(0)
    })

    it('should return user permissions for customer service', () => {
      const result = service.getUserPermissions('user-2', Role.CUSTOMER_SERVICE)
      expect(result).toHaveProperty('userId', 'user-2')
      expect(result).toHaveProperty('role', Role.CUSTOMER_SERVICE)
      expect(result.permissions.length).toBeGreaterThan(0)
    })

    it('should return user permissions for regular user', () => {
      const result = service.getUserPermissions('user-3', Role.USER)
      expect(result).toHaveProperty('userId', 'user-3')
      expect(result).toHaveProperty('role', Role.USER)
      expect(result.permissions.length).toBeGreaterThan(0)
    })

    it('should return different permission counts for different roles', () => {
      const superAdminPermissions = service.getUserPermissions('user-1', Role.SUPER_ADMIN)
      const customerServicePermissions = service.getUserPermissions('user-2', Role.CUSTOMER_SERVICE)
      const userPermissions = service.getUserPermissions('user-3', Role.USER)

      expect(superAdminPermissions.permissions.length).toBeGreaterThan(
        customerServicePermissions.permissions.length
      )
      expect(customerServicePermissions.permissions.length).toBeGreaterThan(
        userPermissions.permissions.length
      )
    })
  })

  describe('Error Scenarios', () => {
    it('should handle empty userId gracefully', () => {
      const result = service.getUserPermissions('', Role.USER)
      expect(result).not.toBeNull()
      expect(result.userId).toBe('')
      expect(result.permissions.length).toBeGreaterThan(0)
    })

    it('should handle unknown role gracefully', () => {
      const result = service.getUserPermissions('user-unknown', 'unknown_role' as Role)
      expect(result).not.toBeNull()
      expect(result).toHaveProperty('userId')
      expect(result).toHaveProperty('role')
      expect(Array.isArray(result.permissions)).toBe(true)
    })

    it('should return empty permissions for invalid role', () => {
      const result = service.getUserPermissions('user-test', 'invalid' as Role)
      expect(result).toBeDefined()
      expect(result.permissions).toBeDefined()
      expect(Array.isArray(result.permissions)).toBe(true)
    })

    it('should handle null role parameter', () => {
      expect(() => {
        service.getUserPermissions('user-test', null as unknown as Role)
      }).not.toThrow()
    })
  })
})
