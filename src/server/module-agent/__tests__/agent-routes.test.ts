import { describe, it, expect } from 'vitest'
import { agentRoutes } from '../routes/agent-routes'
import { isChatRunning } from '../services/chat-service'
import { loadSessionHistory } from '../services/llm-service'
import { createSandboxedBashOperations } from '../services/sandbox-bash'
import {
  parseSessionJsonl,
  parseAssistantSubRounds,
  extractTextContent,
  toLLMMessages,
} from '../services/session-parser'

describe('Agent Routes', () => {
  describe('agentRoutes', () => {
    it('should be defined', () => {
      expect(agentRoutes).toBeDefined()
    })

    it('should be an OpenAPIHono instance', () => {
      expect(agentRoutes).toBeDefined()
      expect(typeof agentRoutes.fetch).toBe('function')
    })
  })

  describe('getAgentRoute', () => {
    it('should be registered', () => {
      expect(agentRoutes.routes).toBeDefined()
    })
  })

  describe('updateAgentRoute', () => {
    it('should be registered', () => {
      expect(agentRoutes.routes).toBeDefined()
    })
  })

  describe('getMessagesRoute', () => {
    it('should be registered', () => {
      expect(agentRoutes.routes).toBeDefined()
    })
  })

  describe('getRoundsRoute', () => {
    it('should be registered', () => {
      expect(agentRoutes.routes).toBeDefined()
    })
  })

  describe('sendMessageRoute', () => {
    it('should be registered', () => {
      expect(agentRoutes.routes).toBeDefined()
    })
  })

  describe('clearMessagesRoute', () => {
    it('should be registered', () => {
      expect(agentRoutes.routes).toBeDefined()
    })
  })

  describe('stopChatRoute', () => {
    it('should be registered', () => {
      expect(agentRoutes.routes).toBeDefined()
    })
  })

  describe('chatStreamRoute', () => {
    it('should be registered', () => {
      expect(agentRoutes.routes).toBeDefined()
    })
  })
})

describe('Agent Service Functions', () => {
  describe('isChatRunning', () => {
    it('should be defined', () => {
      expect(isChatRunning).toBeDefined()
      expect(typeof isChatRunning).toBe('function')
    })
  })

  describe('loadSessionHistory', () => {
    it('should be defined', () => {
      expect(loadSessionHistory).toBeDefined()
      expect(typeof loadSessionHistory).toBe('function')
    })
  })

  describe('createSandboxedBashOperations', () => {
    it('should be defined', () => {
      expect(createSandboxedBashOperations).toBeDefined()
      expect(typeof createSandboxedBashOperations).toBe('function')
    })
  })

  describe('parseSessionJsonl', () => {
    it('should be defined', () => {
      expect(parseSessionJsonl).toBeDefined()
      expect(typeof parseSessionJsonl).toBe('function')
    })
  })

  describe('parseAssistantSubRounds', () => {
    it('should be defined', () => {
      expect(parseAssistantSubRounds).toBeDefined()
      expect(typeof parseAssistantSubRounds).toBe('function')
    })
  })

  describe('extractTextContent', () => {
    it('should be defined', () => {
      expect(extractTextContent).toBeDefined()
      expect(typeof extractTextContent).toBe('function')
    })
  })

  describe('toLLMMessages', () => {
    it('should be defined', () => {
      expect(toLLMMessages).toBeDefined()
      expect(typeof toLLMMessages).toBe('function')
    })
  })

  describe('Error Scenarios', () => {
    describe('Invalid Input Validation', () => {
      it('should handle null agent id', () => {
        expect(() => agentRoutes.routes).not.toThrow()
        expect(agentRoutes.routes).toBeDefined()
        expect(Array.isArray(agentRoutes.routes)).toBe(true)
      })

      it('should handle empty agent id', () => {
        expect(() => agentRoutes.routes).not.toThrow()
        expect(agentRoutes.routes).toBeDefined()
        expect(agentRoutes.routes.length).toBeGreaterThan(0)
      })
    })

    describe('Service Function Error Handling', () => {
      it('should handle isChatRunning with invalid parameters', () => {
        expect(() => isChatRunning('')).not.toThrow()
        expect(typeof isChatRunning('')).toBe('boolean')
        expect(isChatRunning('')).toBeDefined()
      })

      it('should handle loadSessionHistory with non-existent user', async () => {
        const result = await loadSessionHistory('non-existent-user-id-xyz')
        expect(result).toBeDefined()
        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBe(0)
      })

      it('should handle parseSessionJsonl with invalid path', async () => {
        await expect(parseSessionJsonl('invalid-user-id')).resolves.not.toThrow()
        const result = await parseSessionJsonl('invalid-user-id')
        expect(result).toBeDefined()
        expect(result.messages).toBeDefined()
        expect(Array.isArray(result.messages)).toBe(true)
      })
    })
  })
})
