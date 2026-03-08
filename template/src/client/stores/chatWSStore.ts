import { create } from 'zustand'
import { apiClient } from '@client/services/apiClient'
import type { AppWSProtocol, WSClient, WSStatus } from '@shared/schemas'

interface WSMessage {
  type: string
  payload: unknown
  timestamp?: number
}

interface WSState {
  status: WSStatus
  messages: WSMessage[]

  connect: () => void
  disconnect: () => void
  echo: (params: { message: string }) => Promise<void>
  ping: () => Promise<void>
  broadcast: (params: { message: string; timestamp: number }) => void
  notification: (params: { title: string; body: string; timestamp: number }) => void
  clearMessages: () => void
}

let wsClient: WSClient<AppWSProtocol> | null = null

export const useChatWsStore = create<WSState>((set, get) => ({
  status: 'closed',
  messages: [],

  connect: () => {
    if (wsClient) return

    wsClient = apiClient.api.chat.ws.$ws()

    if (!wsClient) return

    wsClient.onStatusChange((newStatus: WSStatus) => {
      set({ status: newStatus })
    })

    wsClient.on('notification', (payload: unknown) => {
      const p = payload as { title: string; body: string; timestamp: number }
      set(state => ({
        messages: [...state.messages, { type: 'notification', payload: p, timestamp: p.timestamp }],
      }))
    })

    wsClient.on('broadcast', (payload: unknown) => {
      const p = payload as { message: string; timestamp: number }
      set(state => ({
        messages: [...state.messages, { type: 'broadcast', payload: p, timestamp: p.timestamp }],
      }))
    })

    wsClient.on('connected', (payload: unknown) => {
      const p = payload as { timestamp: number }
      set(state => ({
        messages: [...state.messages, { type: 'connected', payload: p, timestamp: p.timestamp }],
      }))
    })
  },

  disconnect: () => {
    if (wsClient) {
      wsClient.close()
      wsClient = null
      set({ status: 'closed' })
    }
  },

  echo: async params => {
    if (!wsClient || get().status !== 'open') return
    set(state => ({
      messages: [
        ...state.messages,
        { type: 'echo_request', payload: params, timestamp: Date.now() },
      ],
    }))
    try {
      const result = await wsClient.call('echo', params)
      set(state => ({
        messages: [
          ...state.messages,
          { type: 'echo_response', payload: result, timestamp: result.timestamp },
        ],
      }))
    } catch (error) {
      console.error('Echo failed:', error)
    }
  },

  ping: async () => {
    if (!wsClient || get().status !== 'open') return
    try {
      const result = await wsClient.call('ping', {})
      set(state => ({
        messages: [
          ...state.messages,
          { type: 'pong', payload: result, timestamp: result.timestamp },
        ],
      }))
    } catch (error) {
      console.error('Ping failed:', error)
    }
  },

  broadcast: params => {
    if (!wsClient || get().status !== 'open') return
    wsClient.emit('broadcast', params)
  },

  notification: params => {
    if (!wsClient || get().status !== 'open') return
    wsClient.emit('notification', params)
  },

  clearMessages: () => {
    set({ messages: [] })
  },
}))
