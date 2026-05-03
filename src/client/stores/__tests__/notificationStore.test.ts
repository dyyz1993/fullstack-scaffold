import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'
import { useNotificationStore } from '../notificationStore'

vi.mock('@client/services/apiClient', () => ({
  apiClient: {
    api: {
      notifications: {
        $get: vi.fn(),
        $post: vi.fn(),
        ':id': {
          read: {
            $patch: vi.fn(),
          },
          $delete: vi.fn(),
        },
        'read-all': {
          $patch: vi.fn(),
        },
        'unread-count': {
          $get: vi.fn(),
        },
        stream: {
          $sse: vi.fn(),
        },
      },
    },
  },
}))

vi.mock('@shared/core', () => ({
  connectSSEClient: vi.fn(),
}))

import { apiClient } from '@client/services/apiClient'

function mockReject(fn: unknown): void {
  ;(fn as { mockRejectedValueOnce: (v: unknown) => unknown }).mockRejectedValueOnce(
    new Error('API Failure')
  )
}

describe('Notification Store', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
      sseConnected: false,
    })
    vi.restoreAllMocks()
  })

  describe('fetchNotifications error', () => {
    it('should set error state when fetchNotifications fails', async () => {
      mockReject(apiClient.api.notifications.$get)

      await act(async () => {
        await useNotificationStore.getState().fetchNotifications()
      })

      const state = useNotificationStore.getState()
      expect(state.error).toBeTruthy()
      expect(state.loading).toBe(false)
    })
  })

  describe('markAsRead error', () => {
    it('should set error state when markAsRead fails', async () => {
      mockReject(apiClient.api.notifications[':id'].read.$patch)

      await act(async () => {
        await useNotificationStore.getState().markAsRead('id-1')
      })

      const state = useNotificationStore.getState()
      expect(state.error).toBeTruthy()
    })
  })

  describe('markAllAsRead error', () => {
    it('should set error state when markAllAsRead fails', async () => {
      mockReject(apiClient.api.notifications['read-all'].$patch)

      await act(async () => {
        await useNotificationStore.getState().markAllAsRead()
      })

      const state = useNotificationStore.getState()
      expect(state.error).toBeTruthy()
    })
  })

  describe('deleteNotification error', () => {
    it('should set error state when deleteNotification fails', async () => {
      mockReject(apiClient.api.notifications[':id'].$delete)

      await act(async () => {
        await useNotificationStore.getState().deleteNotification('id-1')
      })

      const state = useNotificationStore.getState()
      expect(state.error).toBeTruthy()
    })
  })

  describe('fetchUnreadCount error', () => {
    it('should set error state when fetchUnreadCount fails', async () => {
      mockReject(apiClient.api.notifications['unread-count'].$get)

      await act(async () => {
        await useNotificationStore.getState().fetchUnreadCount()
      })

      const state = useNotificationStore.getState()
      expect(state.error).toBeTruthy()
    })
  })
})
