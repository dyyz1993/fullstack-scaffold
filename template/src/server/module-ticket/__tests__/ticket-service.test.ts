import { describe, it, expect } from 'bun:test'
import * as service from '../services/ticket-service'
import type { CreateTicketInput } from '@shared/modules/ticket'

describe('Ticket Service', () => {
  describe('getTickets', () => {
    it('should return all tickets', async () => {
      const result = await service.getTickets()
      expect(result).toBeArray()
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('getTicketById', () => {
    it('should return null for non-existent ticket', async () => {
      const result = await service.getTicketById('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('createTicket', () => {
    it('should create a new ticket', async () => {
      const data: CreateTicketInput = {
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        subject: 'Test Subject',
        description: 'Test Description',
        category: 'technical',
        priority: 'medium',
      }
      const result = await service.createTicket(data)
      expect(result).toMatchObject({
        customerName: 'Test Customer',
        subject: 'Test Subject',
      })
    })
  })

  describe('updateTicket', () => {
    it('should return null for non-existent ticket', async () => {
      const result = await service.updateTicket('non-existent', {})
      expect(result).toBeNull()
    })
  })
})
