import { create } from 'zustand'
import { WSClient, type AppWSProtocol, type WSStatus } from '@client/services/wsClient'
import { apiClient, extendWSRoute } from '@client/services/apiClient'

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

export const useChatWSStore = create<WSState>((set, get) => ({
  status: 'closed',
  messages: [],

  connect: () => {
    if (wsClient) return
    
    const client = extendWSRoute(apiClient.api.chat.ws).$ws()
    wsClient = client

    client.onStatusChange((newStatus: WSStatus) => {
      set({ status: newStatus })
    })

    client.on('notification', (payload: { title: string; body: string; timestamp: number }) => {
      set((state) => ({
        messages: [...state.messages, { type: 'notification', payload, timestamp: payload.timestamp }]
      }))
    })

    client.on('broadcast', (payload: { message: string; timestamp: number }) => {
      set((state) => ({
        messages: [...state.messages, { type: 'broadcast', payload, timestamp: payload.timestamp }]
      }))
    })

    client.on('connected', (payload: { timestamp: number }) => {
      set((state) => ({
        messages: [...state.messages, { type: 'connected', payload, timestamp: payload.timestamp }]
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

  echo: async (params) => {
    if (!wsClient || get().status !== 'open') return
    set((state) => ({
      messages: [...state.messages, { type: 'echo_request', payload: params, timestamp: Date.now() }]
    }))
    try {
      const result = await wsClient.call('echo', params)
      set((state) => ({
        messages: [...state.messages, { type: 'echo_response', payload: result, timestamp: result.timestamp }]
      }))
    } catch (error) {
      console.error('Echo failed:', error)
    }
  },

  ping: async () => {
    if (!wsClient || get().status !== 'open') return
    try {
      const result = await wsClient.call('ping', {})
      set((state) => ({
        messages: [...state.messages, { type: 'pong', payload: result, timestamp: result.timestamp }]
      }))
    } catch (error) {
      console.error('Ping failed:', error)
    }
  },

  broadcast: (params) => {
    if (!wsClient || get().status !== 'open') return
    wsClient.emit('broadcast', params)
  },

  notification: (params) => {
    if (!wsClient || get().status !== 'open') return
    wsClient.emit('notification', params)
  },

  clearMessages: () => {
    set({ messages: [] })
  },
}))
