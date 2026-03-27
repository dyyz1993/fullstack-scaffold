import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAgentStore } from '../agentStore'
import type { Agent } from '@shared/modules/agent'

vi.mock('@client/services/apiClient', () => ({
  apiClient: {
    api: {
      agents: {
        $get: vi.fn(),
        ':id': {
          $put: vi.fn(),
          chat: {
            $post: vi.fn(),
            stop: {
              $post: vi.fn(),
            },
          },
          messages: {
            $delete: vi.fn(),
          },
          rounds: {
            $get: vi.fn(),
          },
        },
      },
      workspace: {
        $get: vi.fn(),
      },
    },
  },
}))

const mockAgent: Agent = {
  id: 'agent-1',
  name: 'Test Agent',
  description: 'A test agent',
  model: 'gpt-4',
  systemPrompt: 'You are a helpful assistant',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

describe('Agent Store', () => {
  beforeEach(() => {
    useAgentStore.setState({
      agent: null,
      workspace: null,
      rounds: [],
      loading: false,
      loadingMore: false,
      error: null,
      sseStatus: 'closed',
      isRunning: false,
      pendingMessages: [],
      hasMoreRounds: true,
      oldestTimestamp: undefined,
      newestTimestamp: undefined,
    })
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAgentStore())

      expect(result.current.agent).toBeNull()
      expect(result.current.workspace).toBeNull()
      expect(result.current.rounds).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.loadingMore).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.sseStatus).toBe('closed')
      expect(result.current.isRunning).toBe(false)
      expect(result.current.pendingMessages).toEqual([])
      expect(result.current.hasMoreRounds).toBe(true)
    })
  })

  describe('setError', () => {
    it('should set error message', () => {
      const { result } = renderHook(() => useAgentStore())

      act(() => {
        result.current.setError('Test error')
      })

      expect(result.current.error).toBe('Test error')
    })

    it('should clear error message when set to null', () => {
      const { result } = renderHook(() => useAgentStore())

      act(() => {
        result.current.setError('Test error')
      })
      expect(result.current.error).toBe('Test error')

      act(() => {
        result.current.setError(null)
      })
      expect(result.current.error).toBeNull()
    })
  })

  describe('setSseStatus', () => {
    it('should set SSE status', () => {
      const { result } = renderHook(() => useAgentStore())

      act(() => {
        result.current.setSseStatus('connecting')
      })
      expect(result.current.sseStatus).toBe('connecting')

      act(() => {
        result.current.setSseStatus('open')
      })
      expect(result.current.sseStatus).toBe('open')

      act(() => {
        result.current.setSseStatus('closed')
      })
      expect(result.current.sseStatus).toBe('closed')
    })
  })

  describe('setIsRunning', () => {
    it('should set isRunning status', () => {
      const { result } = renderHook(() => useAgentStore())

      act(() => {
        result.current.setIsRunning(true)
      })
      expect(result.current.isRunning).toBe(true)

      act(() => {
        result.current.setIsRunning(false)
      })
      expect(result.current.isRunning).toBe(false)
    })
  })

  describe('pendingMessages', () => {
    it('should add pending message', () => {
      const { result } = renderHook(() => useAgentStore())

      act(() => {
        result.current.addPendingMessage('Message 1')
      })
      expect(result.current.pendingMessages).toEqual(['Message 1'])

      act(() => {
        result.current.addPendingMessage('Message 2')
      })
      expect(result.current.pendingMessages).toEqual(['Message 1', 'Message 2'])
    })

    it('should remove pending message by index', () => {
      const { result } = renderHook(() => useAgentStore())

      act(() => {
        result.current.addPendingMessage('Message 1')
        result.current.addPendingMessage('Message 2')
        result.current.addPendingMessage('Message 3')
      })
      expect(result.current.pendingMessages).toEqual(['Message 1', 'Message 2', 'Message 3'])

      act(() => {
        result.current.removePendingMessage(1)
      })
      expect(result.current.pendingMessages).toEqual(['Message 1', 'Message 3'])
    })

    it('should handle removePendingMessage with invalid index', () => {
      const { result } = renderHook(() => useAgentStore())

      act(() => {
        result.current.addPendingMessage('Message 1')
      })

      act(() => {
        result.current.removePendingMessage(5)
      })
      expect(result.current.pendingMessages).toEqual(['Message 1'])

      act(() => {
        result.current.removePendingMessage(-1)
      })
      expect(result.current.pendingMessages).toEqual(['Message 1'])
    })
  })

  describe('addAgentMessage', () => {
    it('should add agent message to the last round', () => {
      const { result } = renderHook(() => useAgentStore())

      useAgentStore.setState({
        agent: mockAgent,
        rounds: [
          {
            userMessage: {
              id: 'msg-1',
              agentId: 'agent-1',
              role: 'user',
              content: 'Hello',
              createdAt: '2024-01-01T00:00:00Z',
            },
            agentMessages: [],
            timestamp: '2024-01-01T00:00:00Z',
          },
        ],
      })

      act(() => {
        result.current.addAgentMessage('agent-msg-1')
      })

      const rounds = useAgentStore.getState().rounds
      expect(rounds[0].agentMessages).toHaveLength(1)
      expect(rounds[0].agentMessages[0].id).toBe('agent-msg-1')
      expect(rounds[0].agentMessages[0].role).toBe('agent')
    })

    it('should not add agent message when no agent is set', () => {
      const { result } = renderHook(() => useAgentStore())

      act(() => {
        result.current.addAgentMessage('agent-msg-1')
      })

      expect(useAgentStore.getState().rounds).toEqual([])
    })

    it('should not add agent message when rounds is empty', () => {
      const { result } = renderHook(() => useAgentStore())
      useAgentStore.setState({ agent: mockAgent })

      act(() => {
        result.current.addAgentMessage('agent-msg-1')
      })

      expect(useAgentStore.getState().rounds).toEqual([])
    })
  })

  describe('addSubRound', () => {
    it('should add sub round to existing agent message with tool calls', () => {
      const { result } = renderHook(() => useAgentStore())

      useAgentStore.setState({
        agent: mockAgent,
        rounds: [
          {
            userMessage: {
              id: 'msg-1',
              agentId: 'agent-1',
              role: 'user',
              content: 'Hello',
              createdAt: '2024-01-01T00:00:00Z',
            },
            agentMessages: [
              {
                id: 'agent-msg-1',
                agentId: 'agent-1',
                role: 'agent',
                subRounds: [
                  {
                    id: 'subround-1',
                    toolCalls: [{ id: 'tc-1', name: 'test', args: {}, result: null, error: null }],
                    createdAt: '2024-01-01T00:00:00Z',
                  },
                ],
                createdAt: '2024-01-01T00:00:00Z',
              },
            ],
            timestamp: '2024-01-01T00:00:00Z',
          },
        ],
      })

      act(() => {
        result.current.addSubRound('agent-msg-1')
      })

      const rounds = useAgentStore.getState().rounds
      expect(rounds[0].agentMessages[0].subRounds).toHaveLength(2)
    })

    it('should not add sub round when last sub round has no tool calls', () => {
      const { result } = renderHook(() => useAgentStore())

      useAgentStore.setState({
        agent: mockAgent,
        rounds: [
          {
            userMessage: {
              id: 'msg-1',
              agentId: 'agent-1',
              role: 'user',
              content: 'Hello',
              createdAt: '2024-01-01T00:00:00Z',
            },
            agentMessages: [
              {
                id: 'agent-msg-1',
                agentId: 'agent-1',
                role: 'agent',
                subRounds: [
                  {
                    id: 'subround-1',
                    content: 'Some content',
                    createdAt: '2024-01-01T00:00:00Z',
                  },
                ],
                createdAt: '2024-01-01T00:00:00Z',
              },
            ],
            timestamp: '2024-01-01T00:00:00Z',
          },
        ],
      })

      act(() => {
        result.current.addSubRound('agent-msg-1')
      })

      const rounds = useAgentStore.getState().rounds
      expect(rounds[0].agentMessages[0].subRounds).toHaveLength(1)
    })
  })

  describe('updateCurrentSubRoundThinking', () => {
    it('should update thinking in the last sub round', () => {
      const { result } = renderHook(() => useAgentStore())

      useAgentStore.setState({
        agent: mockAgent,
        rounds: [
          {
            userMessage: {
              id: 'msg-1',
              agentId: 'agent-1',
              role: 'user',
              content: 'Hello',
              createdAt: '2024-01-01T00:00:00Z',
            },
            agentMessages: [
              {
                id: 'agent-msg-1',
                agentId: 'agent-1',
                role: 'agent',
                subRounds: [
                  {
                    id: 'subround-1',
                    thinking: 'Initial thought',
                    createdAt: '2024-01-01T00:00:00Z',
                  },
                ],
                createdAt: '2024-01-01T00:00:00Z',
              },
            ],
            timestamp: '2024-01-01T00:00:00Z',
          },
        ],
      })

      act(() => {
        result.current.updateCurrentSubRoundThinking('agent-msg-1', prev => prev + ' updated')
      })

      const rounds = useAgentStore.getState().rounds
      expect(rounds[0].agentMessages[0].subRounds?.[0].thinking).toBe('Initial thought updated')
    })

    it('should handle empty thinking', () => {
      const { result } = renderHook(() => useAgentStore())

      useAgentStore.setState({
        agent: mockAgent,
        rounds: [
          {
            userMessage: {
              id: 'msg-1',
              agentId: 'agent-1',
              role: 'user',
              content: 'Hello',
              createdAt: '2024-01-01T00:00:00Z',
            },
            agentMessages: [
              {
                id: 'agent-msg-1',
                agentId: 'agent-1',
                role: 'agent',
                subRounds: [
                  {
                    id: 'subround-1',
                    createdAt: '2024-01-01T00:00:00Z',
                  },
                ],
                createdAt: '2024-01-01T00:00:00Z',
              },
            ],
            timestamp: '2024-01-01T00:00:00Z',
          },
        ],
      })

      act(() => {
        result.current.updateCurrentSubRoundThinking('agent-msg-1', prev => prev + 'new')
      })

      const rounds = useAgentStore.getState().rounds
      expect(rounds[0].agentMessages[0].subRounds?.[0].thinking).toBe('new')
    })
  })

  describe('updateCurrentSubRoundContent', () => {
    it('should update content in the last sub round', () => {
      const { result } = renderHook(() => useAgentStore())

      useAgentStore.setState({
        agent: mockAgent,
        rounds: [
          {
            userMessage: {
              id: 'msg-1',
              agentId: 'agent-1',
              role: 'user',
              content: 'Hello',
              createdAt: '2024-01-01T00:00:00Z',
            },
            agentMessages: [
              {
                id: 'agent-msg-1',
                agentId: 'agent-1',
                role: 'agent',
                subRounds: [
                  {
                    id: 'subround-1',
                    content: 'Initial content',
                    createdAt: '2024-01-01T00:00:00Z',
                  },
                ],
                createdAt: '2024-01-01T00:00:00Z',
              },
            ],
            timestamp: '2024-01-01T00:00:00Z',
          },
        ],
      })

      act(() => {
        result.current.updateCurrentSubRoundContent('agent-msg-1', prev => prev + ' more')
      })

      const rounds = useAgentStore.getState().rounds
      expect(rounds[0].agentMessages[0].subRounds?.[0].content).toBe('Initial content more')
    })
  })

  describe('addToolCallToCurrentSubRound', () => {
    it('should add tool call to the last sub round', () => {
      const { result } = renderHook(() => useAgentStore())

      useAgentStore.setState({
        agent: mockAgent,
        rounds: [
          {
            userMessage: {
              id: 'msg-1',
              agentId: 'agent-1',
              role: 'user',
              content: 'Hello',
              createdAt: '2024-01-01T00:00:00Z',
            },
            agentMessages: [
              {
                id: 'agent-msg-1',
                agentId: 'agent-1',
                role: 'agent',
                subRounds: [
                  {
                    id: 'subround-1',
                    createdAt: '2024-01-01T00:00:00Z',
                  },
                ],
                createdAt: '2024-01-01T00:00:00Z',
              },
            ],
            timestamp: '2024-01-01T00:00:00Z',
          },
        ],
      })

      act(() => {
        result.current.addToolCallToCurrentSubRound('agent-msg-1', {
          id: 'tc-1',
          name: 'testTool',
          args: { arg1: 'value1' },
        })
      })

      const rounds = useAgentStore.getState().rounds
      expect(rounds[0].agentMessages[0].subRounds?.[0].toolCalls).toHaveLength(1)
      expect(rounds[0].agentMessages[0].subRounds?.[0].toolCalls?.[0].name).toBe('testTool')
    })

    it('should not add tool call when no sub rounds exist', () => {
      const { result } = renderHook(() => useAgentStore())

      useAgentStore.setState({
        agent: mockAgent,
        rounds: [
          {
            userMessage: {
              id: 'msg-1',
              agentId: 'agent-1',
              role: 'user',
              content: 'Hello',
              createdAt: '2024-01-01T00:00:00Z',
            },
            agentMessages: [
              {
                id: 'agent-msg-1',
                agentId: 'agent-1',
                role: 'agent',
                createdAt: '2024-01-01T00:00:00Z',
              },
            ],
            timestamp: '2024-01-01T00:00:00Z',
          },
        ],
      })

      act(() => {
        result.current.addToolCallToCurrentSubRound('agent-msg-1', {
          id: 'tc-1',
          name: 'testTool',
          args: {},
        })
      })

      const rounds = useAgentStore.getState().rounds
      expect(rounds[0].agentMessages[0].subRounds).toBeUndefined()
    })
  })

  describe('updateToolCallResultInSubRound', () => {
    it('should update tool call result', () => {
      const { result } = renderHook(() => useAgentStore())

      useAgentStore.setState({
        agent: mockAgent,
        rounds: [
          {
            userMessage: {
              id: 'msg-1',
              agentId: 'agent-1',
              role: 'user',
              content: 'Hello',
              createdAt: '2024-01-01T00:00:00Z',
            },
            agentMessages: [
              {
                id: 'agent-msg-1',
                agentId: 'agent-1',
                role: 'agent',
                subRounds: [
                  {
                    id: 'subround-1',
                    toolCalls: [
                      { id: 'tc-1', name: 'testTool', args: {}, result: null, error: null },
                    ],
                    createdAt: '2024-01-01T00:00:00Z',
                  },
                ],
                createdAt: '2024-01-01T00:00:00Z',
              },
            ],
            timestamp: '2024-01-01T00:00:00Z',
          },
        ],
      })

      act(() => {
        result.current.updateToolCallResultInSubRound('agent-msg-1', 'tc-1', { success: true })
      })

      const rounds = useAgentStore.getState().rounds
      expect(rounds[0].agentMessages[0].subRounds?.[0].toolCalls?.[0].result).toEqual({
        success: true,
      })
    })

    it('should update tool call error', () => {
      const { result } = renderHook(() => useAgentStore())

      useAgentStore.setState({
        agent: mockAgent,
        rounds: [
          {
            userMessage: {
              id: 'msg-1',
              agentId: 'agent-1',
              role: 'user',
              content: 'Hello',
              createdAt: '2024-01-01T00:00:00Z',
            },
            agentMessages: [
              {
                id: 'agent-msg-1',
                agentId: 'agent-1',
                role: 'agent',
                subRounds: [
                  {
                    id: 'subround-1',
                    toolCalls: [
                      { id: 'tc-1', name: 'testTool', args: {}, result: null, error: null },
                    ],
                    createdAt: '2024-01-01T00:00:00Z',
                  },
                ],
                createdAt: '2024-01-01T00:00:00Z',
              },
            ],
            timestamp: '2024-01-01T00:00:00Z',
          },
        ],
      })

      act(() => {
        result.current.updateToolCallResultInSubRound('agent-msg-1', 'tc-1', null, 'Tool failed')
      })

      const rounds = useAgentStore.getState().rounds
      expect(rounds[0].agentMessages[0].subRounds?.[0].toolCalls?.[0].error).toBe('Tool failed')
    })
  })

  describe('setMessageStreaming', () => {
    it('should set message streaming status', () => {
      const { result } = renderHook(() => useAgentStore())

      useAgentStore.setState({
        agent: mockAgent,
        rounds: [
          {
            userMessage: {
              id: 'msg-1',
              agentId: 'agent-1',
              role: 'user',
              content: 'Hello',
              createdAt: '2024-01-01T00:00:00Z',
            },
            agentMessages: [
              {
                id: 'agent-msg-1',
                agentId: 'agent-1',
                role: 'agent',
                isStreaming: true,
                createdAt: '2024-01-01T00:00:00Z',
              },
            ],
            timestamp: '2024-01-01T00:00:00Z',
          },
        ],
      })

      act(() => {
        result.current.setMessageStreaming('agent-msg-1', false)
      })

      const rounds = useAgentStore.getState().rounds
      expect(rounds[0].agentMessages[0].isStreaming).toBe(false)
    })
  })

  describe('updateMessageError', () => {
    it('should update message error', () => {
      const { result } = renderHook(() => useAgentStore())

      useAgentStore.setState({
        agent: mockAgent,
        rounds: [
          {
            userMessage: {
              id: 'msg-1',
              agentId: 'agent-1',
              role: 'user',
              content: 'Hello',
              createdAt: '2024-01-01T00:00:00Z',
            },
            agentMessages: [
              {
                id: 'agent-msg-1',
                agentId: 'agent-1',
                role: 'agent',
                createdAt: '2024-01-01T00:00:00Z',
              },
            ],
            timestamp: '2024-01-01T00:00:00Z',
          },
        ],
      })

      act(() => {
        result.current.updateMessageError('agent-msg-1', {
          code: 'api_error',
          message: 'API Error occurred',
          recoverable: true,
        })
      })

      const rounds = useAgentStore.getState().rounds
      expect(rounds[0].agentMessages[0].error).toEqual({
        code: 'api_error',
        message: 'API Error occurred',
        recoverable: true,
      })
    })

    it('should handle rate_limit error', () => {
      const { result } = renderHook(() => useAgentStore())

      useAgentStore.setState({
        agent: mockAgent,
        rounds: [
          {
            userMessage: {
              id: 'msg-1',
              agentId: 'agent-1',
              role: 'user',
              content: 'Hello',
              createdAt: '2024-01-01T00:00:00Z',
            },
            agentMessages: [
              {
                id: 'agent-msg-1',
                agentId: 'agent-1',
                role: 'agent',
                createdAt: '2024-01-01T00:00:00Z',
              },
            ],
            timestamp: '2024-01-01T00:00:00Z',
          },
        ],
      })

      act(() => {
        result.current.updateMessageError('agent-msg-1', {
          code: 'rate_limit',
          message: 'Rate limit exceeded',
          recoverable: true,
        })
      })

      const rounds = useAgentStore.getState().rounds
      expect(rounds[0].agentMessages[0].error?.code).toBe('rate_limit')
    })
  })

  describe('fetchAgent', () => {
    it('should not fetch if agent already exists', async () => {
      const { result } = renderHook(() => useAgentStore())
      useAgentStore.setState({ agent: mockAgent })

      await act(async () => {
        await result.current.fetchAgent()
      })

      expect(result.current.agent).toEqual(mockAgent)
    })

    it('should not fetch if loading is in progress', async () => {
      const { result } = renderHook(() => useAgentStore())
      useAgentStore.setState({ loading: true })

      await act(async () => {
        await result.current.fetchAgent()
      })

      expect(result.current.loading).toBe(true)
    })
  })

  describe('updateAgent', () => {
    it('should not update if no agent is set', async () => {
      const { result } = renderHook(() => useAgentStore())

      await act(async () => {
        await result.current.updateAgent({ name: 'New Name' })
      })

      expect(result.current.loading).toBe(false)
    })
  })

  describe('sendMessage', () => {
    it('should not send message if no agent is set', async () => {
      const { result } = renderHook(() => useAgentStore())

      await act(async () => {
        await result.current.sendMessage('Hello')
      })

      expect(result.current.rounds).toEqual([])
    })
  })

  describe('fetchRounds', () => {
    it('should not fetch rounds if no agent is set', async () => {
      const { result } = renderHook(() => useAgentStore())

      await act(async () => {
        await result.current.fetchRounds()
      })

      expect(result.current.loading).toBe(false)
    })
  })

  describe('loadMoreRounds', () => {
    it('should not load more rounds if no agent is set', async () => {
      const { result } = renderHook(() => useAgentStore())

      await act(async () => {
        await result.current.loadMoreRounds()
      })

      expect(result.current.loadingMore).toBe(false)
    })

    it('should not load more rounds if already loading', async () => {
      const { result } = renderHook(() => useAgentStore())
      useAgentStore.setState({ agent: mockAgent, loadingMore: true })

      await act(async () => {
        await result.current.loadMoreRounds()
      })

      expect(result.current.loadingMore).toBe(true)
    })

    it('should not load more rounds if hasMoreRounds is false', async () => {
      const { result } = renderHook(() => useAgentStore())
      useAgentStore.setState({ agent: mockAgent, hasMoreRounds: false })

      await act(async () => {
        await result.current.loadMoreRounds()
      })

      expect(result.current.loadingMore).toBe(false)
    })
  })

  describe('clearMessages', () => {
    it('should not clear messages if no agent is set', async () => {
      const { result } = renderHook(() => useAgentStore())

      await act(async () => {
        await result.current.clearMessages()
      })

      expect(result.current.rounds).toEqual([])
    })
  })

  describe('stopGeneration', () => {
    it('should set isRunning to false even without agent', async () => {
      const { result } = renderHook(() => useAgentStore())
      useAgentStore.setState({ isRunning: true })

      await act(async () => {
        await result.current.stopGeneration()
      })

      expect(result.current.isRunning).toBe(false)
    })
  })

  describe('sendPendingMessages', () => {
    it('should not send messages if pendingMessages is empty', async () => {
      const { result } = renderHook(() => useAgentStore())

      await act(async () => {
        await result.current.sendPendingMessages()
      })

      expect(result.current.pendingMessages).toEqual([])
    })
  })
})
