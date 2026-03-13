import { describe, it, expect } from 'bun:test'
import * as service from '../services/order-service'
import type { CreateOrderInput } from '@shared/modules/order'

describe('Order Service', () => {
  describe('getOrders', () => {
    it('should return all orders', async () => {
      const result = await service.getOrders()
      expect(result).toBeArray()
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('getOrderById', () => {
    it('should return null for non-existent order', async () => {
      const result = await service.getOrderById('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('createOrder', () => {
    it('should create a new order', async () => {
      const data: CreateOrderInput = {
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        productName: 'Test Product',
        amount: 100,
      }
      const result = await service.createOrder(data)
      expect(result).toMatchObject({
        customerName: 'Test Customer',
        amount: 100,
      })
    })
  })

  describe('updateOrder', () => {
    it('should return null for non-existent order', async () => {
      const result = await service.updateOrder('non-existent', {})
      expect(result).toBeNull()
    })
  })
})
