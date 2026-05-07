// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  verifyToken,
  getMockUsers,
  getMockTokens,
} from '../auth'

describe('auth utilities', () => {
  describe('verifyToken', () => {
    it('should return superadmin user for super-admin-token', () => {
      const user = verifyToken('super-admin-token')
      expect(user).not.toBeNull()
      expect(user!.id).toBe('1')
      expect(user!.username).toBe('superadmin')
    })

    it('should return customer service user for customer-service-token', () => {
      const user = verifyToken('customer-service-token')
      expect(user).not.toBeNull()
      expect(user!.id).toBe('2')
      expect(user!.username).toBe('customerservice')
    })

    it('should return user1 for user-token', () => {
      const user = verifyToken('user-token')
      expect(user).not.toBeNull()
      expect(user!.id).toBe('3')
      expect(user!.username).toBe('user1')
    })

    it('should return null for invalid token', () => {
      const user = verifyToken('invalid-token')
      expect(user).toBeNull()
    })

    it('should return null for empty string token', () => {
      const user = verifyToken('')
      expect(user).toBeNull()
    })
  })

  describe('getMockUsers', () => {
    it('should return array of 3 mock users', () => {
      const users = getMockUsers()
      expect(users).toHaveLength(3)
      expect(users[0].role).toBe('super_admin')
      expect(users[1].role).toBe('customer_service')
      expect(users[2].role).toBe('user')
    })

    it('should have all required user fields', () => {
      const users = getMockUsers()
      for (const user of users) {
        expect(user).toHaveProperty('id')
        expect(user).toHaveProperty('username')
        expect(user).toHaveProperty('email')
        expect(user).toHaveProperty('role')
        expect(user).toHaveProperty('status')
        expect(user).toHaveProperty('avatar')
        expect(user).toHaveProperty('createdAt')
        expect(user).toHaveProperty('updatedAt')
      }
    })
  })

  describe('getMockTokens', () => {
    it('should return map with 3 tokens', () => {
      const tokens = getMockTokens()
      expect(tokens.size).toBe(3)
      expect(tokens.get('super-admin-token')).toBe('1')
      expect(tokens.get('customer-service-token')).toBe('2')
      expect(tokens.get('user-token')).toBe('3')
    })
  })
})
