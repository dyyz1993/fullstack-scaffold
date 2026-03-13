import { describe, it, expect } from 'bun:test'
import * as service from '../services/dispute-service'
import type { CreateDisputeInput } from '@shared/modules/dispute'

describe('Dispute Service', () => {
  describe('getDisputes', () => {
    it('should return all disputes', async () => {
      const result = await service.getDisputes()
      expect(result).toBeArray()
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('getDisputeById', () => {
    it('should return null for non-existent dispute', async () => {
      const result = await service.getDisputeById('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('createDispute', () => {
    it('should create a new dispute', async () => {
      const data: CreateDisputeInput = {
        orderId: 'order-1',
        orderNo: 'ORD123',
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        type: 'refund',
        description: 'Test Description',
        amount: 100,
      }
      const result = await service.createDispute(data)
      expect(result).toMatchObject({
        customerName: 'Test Customer',
        type: 'refund',
      })
    })
  })

  describe('updateDispute', () => {
    it('should return null for non-existent dispute', async () => {
      const result = await service.updateDispute('non-existent', {})
      expect(result).toBeNull()
    })
  })
})
