import { create } from 'zustand'
import type {
  Agent,
  ChatMessage,
  UpdateAgentInput,
  AgentSubRound,
  MessageRound,
} from '@shared/modules/agent'
import type { Workspace } from '@shared/modules/workspace'
import { apiClient } from '@client/services/apiClient'

interface AgentState {
  agent: Agent | null
  workspace: Workspace | null
  rounds: MessageRound[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  sseStatus: 'connecting' | 'open' | 'closed'
  isRunning: boolean
  pendingMessages: string[]
  hasMoreRounds: boolean
  oldestTimestamp?: string
  newestTimestamp?: string

  fetchAgent: () => Promise<void>
  updateAgent: (input: UpdateAgentInput) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  fetchRounds: (limit?: number, before?: string, append?: boolean) => Promise<void>
  loadMoreRounds: () => Promise<void>
  setError: (error: string | null) => void
  setSseStatus: (status: 'connecting' | 'open' | 'closed') => void
  setIsRunning: (isRunning: boolean) => void
  clearMessages: () => Promise<void>
  stopGeneration: () => void
  addPendingMessage: (content: string) => void
  removePendingMessage: (index: number) => void
  sendPendingMessages: () => Promise<void>
  addAgentMessage: (messageId: string) => void
  addSubRound: (messageId: string) => void
  updateCurrentSubRoundThinking: (messageId: string, updater: (prev: string) => string) => void
  updateCurrentSubRoundContent: (messageId: string, updater: (prev: string) => string) => void
  addToolCallToCurrentSubRound: (
    messageId: string,
    toolCall: { id: string; name: string; args: Record<string, unknown> }
  ) => void
  updateToolCallResultInSubRound: (
    messageId: string,
    toolCallId: string,
    result: unknown,
    error?: string
  ) => void
  setMessageStreaming: (messageId: string, isStreaming: boolean) => void
  updateMessageError: (
    messageId: string,
    error: {
      code: 'rate_limit' | 'token_exceeded' | 'api_error' | 'unknown'
      message: string
      recoverable: boolean
    }
  ) => void
}

export const useAgentStore = create<AgentState>((set, get) => ({
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

  fetchAgent: async () => {
    const { agent, loading } = get()
    if (agent || loading) return

    set({ loading: true, error: null })
    try {
      const [agentResponse, workspaceResponse] = await Promise.all([
        apiClient.api.agents.$get(),
        apiClient.api.workspace.$get(),
      ])

      const agentResult = await agentResponse.json()
      const workspaceResult = await workspaceResponse.json()

      if (agentResult.success && workspaceResult.success) {
        set({
          agent: agentResult.data,
          workspace: workspaceResult.data,
          loading: false,
        })
      } else {
        const errors: string[] = []
        if (!agentResult.success) {
          errors.push('Failed to fetch agent')
        }
        if (!workspaceResult.success) {
          errors.push('Failed to fetch workspace')
        }
        set({
          error: errors.join(', '),
          loading: false,
        })
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      })
    }
  },

  updateAgent: async (input: UpdateAgentInput) => {
    const agent = get().agent
    if (!agent) return

    set({ loading: true, error: null })
    try {
      const response = await apiClient.api.agents[':id'].$put({
        param: { id: agent.id },
        json: input,
      })
      const result = await response.json()
      if (result.success) {
        set({ agent: result.data, loading: false })
      } else {
        set({ error: result.error, loading: false })
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      })
    }
  },

  sendMessage: async (content: string) => {
    const agent = get().agent
    if (!agent) return

    const agentId = agent.id

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      agentId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }

    const newRound: MessageRound = {
      userMessage,
      agentMessages: [],
      timestamp: userMessage.createdAt,
    }

    set(state => ({
      rounds: [...state.rounds, newRound],
    }))

    try {
      const response = await apiClient.api.agents[':id'].chat.$post({
        param: { id: agentId },
        json: { agentId, content },
      })
      const result = await response.json()
      if (!result.success) {
        set({ error: result.error })
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      set({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  },

  fetchRounds: async (limit?: number, before?: string, append?: boolean) => {
    const agent = get().agent
    if (!agent) return

    const isLoading = append ? 'loadingMore' : 'loading'
    set({ [isLoading]: true, error: null })
    try {
      const agentId = agent.id
      const response = await apiClient.api.agents[':id'].rounds.$get({
        param: { id: agentId },
        query: {
          limit: limit?.toString(),
          before,
        },
      })
      const result = await response.json()
      if (result.success) {
        const newRounds = result.data.rounds
        const hasMore = newRounds.length === (limit || 10)

        set(state => ({
          rounds: append ? [...newRounds, ...state.rounds] : newRounds,
          hasMoreRounds: hasMore,
          oldestTimestamp: result.data.oldestTimestamp ?? undefined,
          [isLoading]: false,
        }))
      } else {
        set({ error: result.error, [isLoading]: false })
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        [isLoading]: false,
      })
    }
  },

  loadMoreRounds: async () => {
    const { agent, loadingMore, hasMoreRounds, oldestTimestamp } = get()
    if (!agent || loadingMore || !hasMoreRounds) return

    await get().fetchRounds(10, oldestTimestamp, true)
  },

  setError: error => set({ error }),
  setSseStatus: sseStatus => set({ sseStatus }),
  setIsRunning: isRunning => set({ isRunning }),

  addAgentMessage: messageId => {
    const agent = get().agent
    if (!agent) return

    const agentMessage: ChatMessage = {
      id: messageId,
      agentId: agent.id,
      role: 'agent',
      subRounds: [
        {
          id: `subround-${Date.now()}-0`,
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      isStreaming: true,
    }

    set(state => {
      const lastRoundIndex = state.rounds.length - 1
      if (lastRoundIndex < 0) return state

      const lastRound = state.rounds[lastRoundIndex]
      return {
        rounds: [
          ...state.rounds.slice(0, lastRoundIndex),
          {
            ...lastRound,
            agentMessages: [...lastRound.agentMessages, agentMessage],
          },
        ],
      }
    })
  },

  addSubRound: (messageId: string) => {
    set(state => ({
      rounds: state.rounds.map(round => {
        const agentMsg = round.agentMessages.find(msg => msg.id === messageId)
        if (!agentMsg) return round

        const subRounds = agentMsg.subRounds || []
        const lastSubRound = subRounds[subRounds.length - 1]

        if (lastSubRound?.toolCalls && lastSubRound.toolCalls.length > 0) {
          const newSubRound: AgentSubRound = {
            id: `subround-${Date.now()}-${subRounds.length}`,
            createdAt: new Date().toISOString(),
          }

          const updatedAgentMsg = {
            ...agentMsg,
            subRounds: [...subRounds, newSubRound],
          }

          return {
            ...round,
            agentMessages: round.agentMessages.map(msg =>
              msg.id === messageId ? updatedAgentMsg : msg
            ),
          }
        }

        return round
      }),
    }))
  },

  updateCurrentSubRoundThinking: (messageId: string, updater: (prev: string) => string) => {
    set(state => ({
      rounds: state.rounds.map(round => {
        const agentMsg = round.agentMessages.find(msg => msg.id === messageId)
        if (!agentMsg) return round

        const subRounds = agentMsg.subRounds || []
        if (subRounds.length === 0) return round

        const lastIndex = subRounds.length - 1
        const updatedSubRounds = [...subRounds]
        updatedSubRounds[lastIndex] = {
          ...updatedSubRounds[lastIndex],
          thinking: updater(updatedSubRounds[lastIndex].thinking || ''),
        }

        const updatedAgentMsg = {
          ...agentMsg,
          subRounds: updatedSubRounds,
        }

        return {
          ...round,
          agentMessages: round.agentMessages.map(msg =>
            msg.id === messageId ? updatedAgentMsg : msg
          ),
        }
      }),
    }))
  },

  updateCurrentSubRoundContent: (messageId: string, updater: (prev: string) => string) => {
    set(state => ({
      rounds: state.rounds.map(round => {
        const agentMsg = round.agentMessages.find(msg => msg.id === messageId)
        if (!agentMsg) return round

        const subRounds = agentMsg.subRounds || []
        if (subRounds.length === 0) return round

        const lastIndex = subRounds.length - 1
        const updatedSubRounds = [...subRounds]
        updatedSubRounds[lastIndex] = {
          ...updatedSubRounds[lastIndex],
          content: updater(updatedSubRounds[lastIndex].content || ''),
        }

        const updatedAgentMsg = {
          ...agentMsg,
          subRounds: updatedSubRounds,
        }

        return {
          ...round,
          agentMessages: round.agentMessages.map(msg =>
            msg.id === messageId ? updatedAgentMsg : msg
          ),
        }
      }),
    }))
  },

  addToolCallToCurrentSubRound: (
    messageId: string,
    toolCall: { id: string; name: string; args: Record<string, unknown> }
  ) => {
    set(state => ({
      rounds: state.rounds.map(round => {
        const agentMsg = round.agentMessages.find(msg => msg.id === messageId)
        if (!agentMsg) return round

        const subRounds = agentMsg.subRounds || []
        if (subRounds.length === 0) return round

        const lastIndex = subRounds.length - 1
        const updatedSubRounds = [...subRounds]
        const currentSubRound = updatedSubRounds[lastIndex]

        updatedSubRounds[lastIndex] = {
          ...currentSubRound,
          toolCalls: [
            ...(currentSubRound.toolCalls || []),
            { ...toolCall, result: null, error: null },
          ],
        }

        const updatedAgentMsg = {
          ...agentMsg,
          subRounds: updatedSubRounds,
        }

        return {
          ...round,
          agentMessages: round.agentMessages.map(msg =>
            msg.id === messageId ? updatedAgentMsg : msg
          ),
        }
      }),
    }))
  },

  updateToolCallResultInSubRound: (
    messageId: string,
    toolCallId: string,
    result: unknown,
    error?: string
  ) => {
    set(state => ({
      rounds: state.rounds.map(round => {
        const agentMsg = round.agentMessages.find(msg => msg.id === messageId)
        if (!agentMsg) return round

        const updatedAgentMsg = {
          ...agentMsg,
          subRounds: agentMsg.subRounds?.map(subRound => {
            if (!subRound.toolCalls) return subRound

            const toolCallIndex = subRound.toolCalls.findIndex(tc => tc.id === toolCallId)
            if (toolCallIndex === -1) return subRound

            const updatedToolCalls = [...subRound.toolCalls]
            updatedToolCalls[toolCallIndex] = {
              ...updatedToolCalls[toolCallIndex],
              result,
              error: error || null,
            }

            return { ...subRound, toolCalls: updatedToolCalls }
          }),
        }

        return {
          ...round,
          agentMessages: round.agentMessages.map(msg =>
            msg.id === messageId ? updatedAgentMsg : msg
          ),
        }
      }),
    }))
  },

  setMessageStreaming: (messageId: string, isStreaming: boolean) => {
    set(state => {
      const newRounds: MessageRound[] = state.rounds.map(round => ({
        ...round,
        agentMessages: round.agentMessages.map(msg =>
          msg.id === messageId ? { ...msg, isStreaming } : msg
        ),
      }))
      return { rounds: newRounds }
    })
  },

  updateMessageError: (
    messageId: string,
    error: {
      code: 'rate_limit' | 'token_exceeded' | 'api_error' | 'unknown'
      message: string
      recoverable: boolean
    }
  ) => {
    set(state => {
      const newRounds: MessageRound[] = state.rounds.map(round => ({
        ...round,
        agentMessages: round.agentMessages.map(msg =>
          msg.id === messageId ? { ...msg, error } : msg
        ),
      }))
      return { rounds: newRounds }
    })
  },

  clearMessages: async () => {
    const agent = get().agent
    if (!agent) return

    try {
      await apiClient.api.agents[':id'].messages.$delete({
        param: { id: agent.id },
      })
      set({ rounds: [] })
    } catch (error) {
      console.error('Failed to clear messages:', error)
    }
  },

  stopGeneration: async () => {
    const agent = get().agent
    if (agent) {
      try {
        await apiClient.api.agents[':id'].chat.stop.$post({
          param: { id: agent.id },
        })
      } catch (error) {
        console.error('Failed to stop generation:', error)
      }
    }
    set({ isRunning: false })
  },

  addPendingMessage: (content: string) => {
    set(state => ({
      pendingMessages: [...state.pendingMessages, content],
    }))
  },

  removePendingMessage: (index: number) => {
    set(state => ({
      pendingMessages: state.pendingMessages.filter((_, i) => i !== index),
    }))
  },

  sendPendingMessages: async () => {
    const { pendingMessages, sendMessage } = get()

    if (pendingMessages.length === 0) return

    set({ pendingMessages: [] })

    for (const content of pendingMessages) {
      await sendMessage(content)
    }
  },
}))
