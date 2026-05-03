import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Agent, ChatMessage, UpdateAgentInput } from '@shared/modules/agent'
import { apiClient } from '@client/services/apiClient'
import { useAuthStore } from './authStore'

interface AgentState {
  agent: Agent | null
  messages: ChatMessage[]
  loading: boolean
  error: string | null
  sseStatus: 'connecting' | 'open' | 'closed'

  fetchAgent: () => Promise<void>
  updateAgent: (input: UpdateAgentInput) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  fetchMessages: (limit?: number, offset?: number) => Promise<void>
  setError: (error: string | null) => void
  setSseStatus: (status: 'connecting' | 'open' | 'closed') => void
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void
  updateMessageContent: (messageId: string, content: string) => void
  setMessageStreaming: (messageId: string, isStreaming: boolean) => void
  addAgentMessage: (messageId: string) => void
  clearMessages: () => void
}

function getCurrentUserId(): string {
  const user = useAuthStore.getState().user
  if (!user) {
    throw new Error('User not authenticated')
  }
  return user.id
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agent: null,
  messages: [],
  loading: false,
  error: null,
  sseStatus: 'closed',

  fetchAgent: async () => {
    set({ loading: true, error: null })
    try {
      const userId = getCurrentUserId()
      const response = await apiClient.api.agents.$get({
        query: { userId },
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

    const userId = getCurrentUserId()
    const agentId = agent.id

    // 添加用户消息到本地
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      agentId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }

    set(state => ({
      messages: [...state.messages, userMessage],
    }))

    try {
      await apiClient.api.agents[':id'].chat.$post({
        param: { id: agentId },
        json: { agentId, content, userId },
      })
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  },

  fetchMessages: async (limit?: number, offset?: number) => {
    const agent = get().agent
    if (!agent) return

    set({ loading: true, error: null })
    try {
      const agentId = agent.id
      const userId = getCurrentUserId()
      const response = await apiClient.api.agents[':id'].messages.$get({
        param: { id: agentId },
        query: {
          userId,
          limit: limit?.toString(),
          offset: offset?.toString(),
        },
      })
      const result = await response.json()
      if (result.success) {
        set({ messages: result.data.messages, loading: false })
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

  setError: error => set({ error }),
  setSseStatus: sseStatus => set({ sseStatus }),

  updateMessage: (messageId, updates) => {
    set(state => ({
      messages: state.messages.map(msg => (msg.id === messageId ? { ...msg, ...updates } : msg)),
    }))
  },

  updateMessageContent: (messageId, content) => {
    set(state => ({
      messages: state.messages.map(msg => (msg.id === messageId ? { ...msg, content } : msg)),
    }))
  },

  setMessageStreaming: (messageId, isStreaming) => {
    set(state => ({
      messages: state.messages.map(msg => (msg.id === messageId ? { ...msg, isStreaming } : msg)),
    }))
  },

  addAgentMessage: messageId => {
    const agent = get().agent
    if (!agent) return

    const agentMessage: ChatMessage = {
      id: messageId,
      agentId: agent.id,
      role: 'agent',
      content: '',
      createdAt: new Date().toISOString(),
      isStreaming: true,
      thinking: '',
      toolCalls: [],
    }

    set(state => ({
      messages: [...state.messages, agentMessage],
    }))
  },

  clearMessages: () => set({ messages: [] }),
}))
