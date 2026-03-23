import { describe, it, expect, afterEach } from 'vitest'
import {
  getOrCreateAgent,
  getAgent,
  updateAgent,
  clearMessages,
  getRounds,
} from '../services/agent-service'
import type { CreateAgentInput, UpdateAgentInput } from '@shared/modules/agent'

describe('Agent Service Functions', () => {
  const testUserId = 'test-user-agent-service-xyz'
  let createdAgentIds: string[] = []

  afterEach(async () => {
    // Cleanup created agents
    for (const id of createdAgentIds) {
      try {
        await clearMessages(id, testUserId)
      } catch {
        // Ignore cleanup errors
      }
    }
    createdAgentIds = []
  })

  describe('getOrCreateAgent', () => {
    it('should create a new agent with valid data', async () => {
      const data: CreateAgentInput = {
        name: 'Test Agent',
        description: 'Test Description',
        systemPrompt: 'You are a helpful assistant',
        model: 'claude-3-5-sonnet-20241022',
      }
      const result = await getOrCreateAgent(testUserId, data)
      expect(result).toBeDefined()
      expect(result.name).toBe('Test Agent')
      expect(result.description).toBe('Test Description')
      expect(result.id).toBeDefined()
      expect(typeof result.id).toBe('string')
      createdAgentIds.push(result.id)
    })

    it('should create agent with default model', async () => {
      const data: CreateAgentInput = {
        name: 'Default Model Agent',
        description: 'Agent with default model',
        systemPrompt: 'You are helpful',
      }
      const result = await getOrCreateAgent(testUserId, data)
      expect(result).toBeDefined()
      expect(result.model).toBe('claude-3-5-sonnet-20241022')
      expect(result.name).toBe('Default Model Agent')
      createdAgentIds.push(result.id)
    })
  })

  describe('getAgent', () => {
    it('should return agent by id', async () => {
      const created = await getOrCreateAgent(testUserId, {
        name: 'Get Test Agent',
        description: 'Test',
        systemPrompt: 'Test',
      })
      createdAgentIds.push(created.id)

      const result = await getAgent(created.id, testUserId)
      expect(result).toBeDefined()
      expect(result?.id).toBe(created.id)
      expect(result?.name).toBe('Get Test Agent')
    })

    it('should return null for non-existent agent', async () => {
      const result = await getAgent('non-existent-agent-id-xyz', testUserId)
      expect(result).toBeNull()
      expect(result).toBeFalsy()
      expect(result).not.toBeDefined()
    })
  })

  describe('updateAgent', () => {
    it('should update agent successfully', async () => {
      const created = await getOrCreateAgent(testUserId, {
        name: 'Update Test Agent',
        description: 'Before Update',
        systemPrompt: 'Test',
      })
      createdAgentIds.push(created.id)

      const updateData: UpdateAgentInput = {
        name: 'Updated Agent Name',
        description: 'After Update',
      }
      const result = await updateAgent(created.id, testUserId, updateData)
      expect(result).toBeDefined()
      expect(result?.name).toBe('Updated Agent Name')
      expect(result?.description).toBe('After Update')
    })

    it('should return null for non-existent agent', async () => {
      const result = await updateAgent('non-existent-agent-id-xyz', testUserId, { name: 'Test' })
      expect(result).toBeNull()
      expect(result).toBeFalsy()
      expect(result).not.toBeDefined()
    })
  })

  describe('getRounds', () => {
    it('should return rounds for agent', async () => {
      const created = await getOrCreateAgent(testUserId, {
        name: 'Rounds Test Agent',
        description: 'Test',
        systemPrompt: 'Test',
      })
      createdAgentIds.push(created.id)

      const result = await getRounds(created.id, testUserId, { limit: 10 })
      expect(result).toBeDefined()
      expect(result.rounds).toBeDefined()
      expect(Array.isArray(result.rounds)).toBe(true)
      expect(result.hasMore).toBeDefined()
      expect(typeof result.hasMore).toBe('boolean')
    })

    it('should handle non-existent agent', async () => {
      const result = await getRounds('non-existent-agent-id-xyz', testUserId, { limit: 10 })
      expect(result).toBeDefined()
      expect(result.rounds).toBeDefined()
      expect(Array.isArray(result.rounds)).toBe(true)
      expect(result.rounds.length).toBe(0)
    })
  })

  describe('clearMessages', () => {
    it('should clear messages successfully', async () => {
      const created = await getOrCreateAgent(testUserId, {
        name: 'Clear Test Agent',
        description: 'Test',
        systemPrompt: 'Test',
      })
      createdAgentIds.push(created.id)

      await expect(clearMessages(created.id, testUserId)).resolves.toBeUndefined()
      expect(true).toBe(true)
    })
  })
})
