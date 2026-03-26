import { describe, it, expect, afterEach } from 'vitest'
import { getOrCreateAgent, getAgent, updateAgent, clearMessages } from '../services/agent-service'
import type { CreateAgentInput, UpdateAgentInput } from '@shared/modules/agent'

describe('Agent Service Functions', () => {
  const testWorkspaceId = 'test-workspace-agent-service-xyz'
  const testUserId = 'test-user-agent-service-xyz'
  let createdAgentIds: string[] = []

  afterEach(async () => {
    for (const id of createdAgentIds) {
      try {
        await clearMessages(id, `/test/path/${id}`)
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
      const result = await getOrCreateAgent(testWorkspaceId, testUserId, data)
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
      const result = await getOrCreateAgent(testWorkspaceId, testUserId, data)
      expect(result).toBeDefined()
      expect(result.model).toBe('claude-3-5-sonnet-20241022')
      expect(result.name).toBe('Default Model Agent')
      createdAgentIds.push(result.id)
    })
  })

  describe('getAgent', () => {
    it('should return agent by id', async () => {
      const created = await getOrCreateAgent(testWorkspaceId, testUserId, {
        name: 'Get Test Agent',
        description: 'Test',
        systemPrompt: 'Test',
      })
      createdAgentIds.push(created.id)

      const result = await getAgent(created.id, testWorkspaceId)
      expect(result).toBeDefined()
      expect(result?.id).toBe(created.id)
      expect(result?.name).toBe('Get Test Agent')
    })

    it('should return null for non-existent agent', async () => {
      const result = await getAgent('non-existent-agent-id-xyz', testWorkspaceId)
      expect(result).toBeNull()
      expect(result).toBeFalsy()
      expect(result).not.toBeDefined()
    })
  })

  describe('updateAgent', () => {
    it('should update agent successfully', async () => {
      const created = await getOrCreateAgent(testWorkspaceId, testUserId, {
        name: 'Update Test Agent',
        description: 'Before Update',
        systemPrompt: 'Test',
      })
      createdAgentIds.push(created.id)

      const updateData: UpdateAgentInput = {
        name: 'Updated Agent Name',
        description: 'After Update',
      }
      const result = await updateAgent(created.id, testWorkspaceId, updateData)
      expect(result).toBeDefined()
      expect(result?.name).toBe('Updated Agent Name')
      expect(result?.description).toBe('After Update')
    })

    it('should return null for non-existent agent', async () => {
      const result = await updateAgent('non-existent-agent-id-xyz', testWorkspaceId, {
        name: 'Test',
      })
      expect(result).toBeNull()
      expect(result).toBeFalsy()
      expect(result).not.toBeDefined()
    })
  })

  describe('clearMessages', () => {
    it('should clear messages successfully', async () => {
      const created = await getOrCreateAgent(testWorkspaceId, testUserId, {
        name: 'Clear Test Agent',
        description: 'Test',
        systemPrompt: 'Test',
      })
      createdAgentIds.push(created.id)

      await expect(clearMessages(created.id, `/test/path/${created.id}`)).resolves.toBeUndefined()
      expect(true).toBe(true)
    })
  })
})
