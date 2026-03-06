/**
 * Notification store using Zustand
 * Demonstrates SSE consumption via Hono RPC with type inference
 */

import { create } from 'zustand'
import { apiClient } from '@client/services/apiClient'
import { SSEConnection } from '@client/services/sseConnection'
import type { AppNotification, CreateNotificationInput } from '@shared/schemas'

interface NotificationState {
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  error: string | null
  sseConnected: boolean

  fetchNotifications: (unreadOnly?: boolean) => Promise<void>
  createNotification: (input: CreateNotificationInput) => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  fetchUnreadCount: () => Promise<void>
  connectSSE: () => void
  disconnectSSE: () => void
}

let sseConnection: SSEConnection<AppNotification> | null = null

export const useNotificationStore = create<NotificationState>(set => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  sseConnected: false,

  fetchNotifications: async (unreadOnly = false) => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.api.notifications.$get({
        query: { unreadOnly: String(unreadOnly) },
      })
      const result = await response.json()
      if (result.success && 'data' in result) {
        set({ notifications: result.data, loading: false })
      } else {
        set({ error: 'Failed to fetch', loading: false })
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      })
    }
  },

  createNotification: async input => {
    set({ loading: true, error: null })
    try {
      const response = await apiClient.api.notifications.$post({
        json: input,
      })
      const result = await response.json()
      if (result.success && 'data' in result) {
        set(state => ({
          notifications: [result.data, ...state.notifications],
          loading: false,
        }))
      } else {
        set({ error: 'Failed to create', loading: false })
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      })
    }
  },

  markAsRead: async (id: string) => {
    try {
      const response = await apiClient.api.notifications[':id'].read.$patch({
        param: { id },
      })
      const result = await response.json()
      if (result.success && 'data' in result) {
        set(state => ({
          notifications: state.notifications.map(n => (n.id === id ? { ...n, read: true } : n)),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }))
      }
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  },

  markAllAsRead: async () => {
    try {
      const response = await apiClient.api.notifications['read-all'].$patch()
      const result = await response.json()
      if (result.success) {
        set(state => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0,
        }))
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  },

  deleteNotification: async (id: string) => {
    try {
      const response = await apiClient.api.notifications[':id'].$delete({
        param: { id },
      })
      const result = await response.json()
      if (result.success) {
        set(state => {
          const notification = state.notifications.find(n => n.id === id)
          return {
            notifications: state.notifications.filter(n => n.id !== id),
            unreadCount:
              notification && !notification.read ? state.unreadCount - 1 : state.unreadCount,
          }
        })
      }
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await apiClient.api.notifications['unread-count'].$get()
      const result = await response.json()
      if (result.success && 'data' in result) {
        set({ unreadCount: result.data.count })
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
    }
  },

  connectSSE: () => {
    if (sseConnection?.connected) return

    sseConnection = new SSEConnection<AppNotification>(
      signal => apiClient.api.notifications.stream.$get({ signal }),
      {
        onConnect: () => set({ sseConnected: true }),
        onDisconnect: () => set({ sseConnected: false }),
        onMessage: notification => {
          if (
            !notification ||
            typeof notification !== 'object' ||
            !('type' in notification) ||
            !('id' in notification)
          ) {
            return
          }
          set(state => {
            if (state.notifications.some(n => n.id === notification.id)) {
              return state
            }
            return {
              notifications: [notification, ...state.notifications],
              unreadCount: notification.read ? state.unreadCount : state.unreadCount + 1,
            }
          })
        },
        onError: error => {
          console.error('SSE error:', error)
        },
      }
    )

    sseConnection.connect()
  },

  disconnectSSE: () => {
    if (sseConnection) {
      sseConnection.disconnect()
      sseConnection = null
    }
  },
}))
