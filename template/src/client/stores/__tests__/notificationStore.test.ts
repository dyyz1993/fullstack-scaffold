import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockJson = vi.fn()
const mockResponse = { json: () => mockJson() }

const mockNotificationsGet = vi.fn().mockResolvedValue(mockResponse)
const mockNotificationsPost = vi.fn().mockResolvedValue(mockResponse)
const mockNotificationIdRead = vi.fn().mockResolvedValue(mockResponse)
const mockNotificationReadAll = vi.fn().mockResolvedValue(mockResponse)
const mockNotificationIdDelete = vi.fn().mockResolvedValue(mockResponse)
const mockNotificationUnreadCount = vi.fn().mockResolvedValue(mockResponse)
const mockSSEConnect = vi.fn()

vi.mock('@client/services/apiClient', () => ({
  apiClient: {
    api: {
      notifications: new Proxy({} as Record<string, unknown>, {
        get(_, prop) {
          if (prop === '$get') return mockNotificationsGet
          if (prop === '$post') return mockNotificationsPost
          if (prop === 'stream') return { $sse: mockSSEConnect }
          if (prop === 'read-all') return { $patch: mockNotificationReadAll }
          if (prop === 'unread-count') return { $get: mockNotificationUnreadCount }
          return new Proxy({} as Record<string, unknown>, {
            get(_, idProp) {
              if (idProp === 'read') return { $patch: mockNotificationIdRead }
              if (idProp === '$delete') return mockNotificationIdDelete
              return undefined
            },
          })
        },
      }),
    },
  },
}))

const createMockNotification = (overrides = {}) => ({
  id: 'notif-1',
  type: 'info' as const,
  title: 'Test Notification',
  message: 'Test message',
  read: false,
  createdAt: new Date().toISOString(),
  ...overrides,
})

async function getStore() {
  const { useNotificationStore } = await import('../notificationStore')
  return useNotificationStore
}

describe('notificationStore', () => {
  let useNotificationStore: Awaited<ReturnType<typeof getStore>>

  beforeEach(async () => {
    vi.clearAllMocks()
    mockJson.mockReset()
    useNotificationStore = await getStore()
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
      sseConnected: false,
    })
    useNotificationStore.getState().disconnectSSE()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useNotificationStore.getState()
      expect(state.notifications).toEqual([])
      expect(state.unreadCount).toBe(0)
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()
      expect(state.sseConnected).toBe(false)
    })
  })

  describe('fetchNotifications', () => {
    it('should fetch notifications with unreadOnly=false by default', async () => {
      const notifs = [createMockNotification()]
      mockJson.mockResolvedValue({ success: true, data: { items: notifs } })

      await useNotificationStore.getState().fetchNotifications()

      expect(mockNotificationsGet).toHaveBeenCalledWith({ query: { unreadOnly: 'false' } })
      const state = useNotificationStore.getState()
      expect(state.notifications).toEqual(notifs)
      expect(state.loading).toBe(false)
    })

    it('should fetch with unreadOnly=true', async () => {
      mockJson.mockResolvedValue({ success: true, data: { items: [] } })

      await useNotificationStore.getState().fetchNotifications(true)

      expect(mockNotificationsGet).toHaveBeenCalledWith({ query: { unreadOnly: 'true' } })
    })

    it('should handle failed response', async () => {
      mockJson.mockResolvedValue({ success: false, error: 'Unauthorized' })

      await useNotificationStore.getState().fetchNotifications()

      expect(useNotificationStore.getState().error).toBe('Unauthorized')
      expect(useNotificationStore.getState().loading).toBe(false)
    })

    it('should handle network error', async () => {
      mockNotificationsGet.mockRejectedValueOnce(new Error('Network error'))
      mockJson.mockResolvedValue({})

      await useNotificationStore.getState().fetchNotifications()

      expect(useNotificationStore.getState().error).toBe('Network error')
    })

    it('should handle non-Error thrown value', async () => {
      mockNotificationsGet.mockRejectedValueOnce('unknown')
      mockJson.mockResolvedValue({})

      await useNotificationStore.getState().fetchNotifications()

      expect(useNotificationStore.getState().error).toBe('Unknown error')
    })

    it('should set loading state during fetch', async () => {
      let resolvePromise!: (value: unknown) => void
      mockNotificationsGet.mockReturnValueOnce(new Promise(r => { resolvePromise = r }))

      const promise = useNotificationStore.getState().fetchNotifications()
      expect(useNotificationStore.getState().loading).toBe(true)

      resolvePromise({ json: () => Promise.resolve({ success: true, data: { items: [] } }) })
      await promise

      expect(useNotificationStore.getState().loading).toBe(false)
    })
  })

  describe('createNotification', () => {
    it('should create notification and increment unread count', async () => {
      const newNotif = createMockNotification({ id: 'notif-2', title: 'New' })
      mockJson.mockResolvedValue({ success: true, data: newNotif })

      await useNotificationStore.getState().createNotification({ type: 'info', title: 'New', message: 'Msg' })

      const state = useNotificationStore.getState()
      expect(state.notifications).toHaveLength(1)
      expect(state.notifications[0].id).toBe('notif-2')
      expect(state.unreadCount).toBe(1)
    })

    it('should prepend to existing notifications', async () => {
      useNotificationStore.setState({
        notifications: [createMockNotification({ id: 'old' })],
        unreadCount: 1,
      })
      const newNotif = createMockNotification({ id: 'new' })
      mockJson.mockResolvedValue({ success: true, data: newNotif })

      await useNotificationStore.getState().createNotification({ type: 'info', title: 'N', message: 'M' })

      expect(useNotificationStore.getState().notifications[0].id).toBe('new')
      expect(useNotificationStore.getState().unreadCount).toBe(2)
    })

    it('should handle failed creation', async () => {
      mockJson.mockResolvedValue({ success: false, error: 'Invalid input' })

      await useNotificationStore.getState().createNotification({ type: 'info', title: '', message: '' })

      expect(useNotificationStore.getState().error).toBe('Invalid input')
      expect(useNotificationStore.getState().notifications).toHaveLength(0)
    })

    it('should handle creation network error', async () => {
      mockNotificationsPost.mockRejectedValueOnce(new Error('Server down'))
      mockJson.mockResolvedValue({})

      await useNotificationStore.getState().createNotification({ type: 'info', title: 'T', message: 'M' })

      expect(useNotificationStore.getState().error).toBe('Server down')
    })
  })

  describe('markAsRead', () => {
    it('should mark notification as read and decrement unread count', async () => {
      useNotificationStore.setState({ notifications: [createMockNotification({ id: 'n1', read: false })], unreadCount: 1 })
      mockJson.mockResolvedValue({ success: true })

      await useNotificationStore.getState().markAsRead('n1')

      const state = useNotificationStore.getState()
      expect(state.notifications[0].read).toBe(true)
      expect(state.unreadCount).toBe(0)
    })

    it('should not go below 0 unread count', async () => {
      useNotificationStore.setState({ unreadCount: 0, notifications: [createMockNotification({ id: 'n1' })] })
      mockJson.mockResolvedValue({ success: true })

      await useNotificationStore.getState().markAsRead('n1')

      expect(useNotificationStore.getState().unreadCount).toBe(0)
    })

    it('should handle mark as read error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockNotificationIdRead.mockRejectedValueOnce(new Error('Failed'))
      mockJson.mockResolvedValue({})

      await useNotificationStore.getState().markAsRead('n1')

      expect(consoleSpy).toHaveBeenCalledWith('Failed to mark as read:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all notifications as read and reset count', async () => {
      useNotificationStore.setState({
        notifications: [
          createMockNotification({ id: '1', read: false }),
          createMockNotification({ id: '2', read: false }),
        ],
        unreadCount: 2,
      })
      mockJson.mockResolvedValue({ success: true })

      await useNotificationStore.getState().markAllAsRead()

      const state = useNotificationStore.getState()
      expect(state.notifications.every(n => n.read)).toBe(true)
      expect(state.unreadCount).toBe(0)
    })

    it('should handle error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockNotificationReadAll.mockRejectedValueOnce(new Error('Failed'))
      mockJson.mockResolvedValue({})

      await useNotificationStore.getState().markAllAsRead()

      expect(consoleSpy).toHaveBeenCalledWith('Failed to mark all as read:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('deleteNotification', () => {
    it('should delete unread notification and decrement count', async () => {
      useNotificationStore.setState({
        notifications: [createMockNotification({ id: 'n1', read: false }), createMockNotification({ id: 'n2' })],
        unreadCount: 2,
      })
      mockJson.mockResolvedValue({ success: true })

      await useNotificationStore.getState().deleteNotification('n1')

      const state = useNotificationStore.getState()
      expect(state.notifications).toHaveLength(1)
      expect(state.unreadCount).toBe(1)
    })

    it('should delete read notification without changing count', async () => {
      useNotificationStore.setState({
        notifications: [createMockNotification({ id: 'n1', read: true })],
        unreadCount: 0,
      })
      mockJson.mockResolvedValue({ success: true })

      await useNotificationStore.getState().deleteNotification('n1')

      expect(useNotificationStore.getState().notifications).toHaveLength(0)
      expect(useNotificationStore.getState().unreadCount).toBe(0)
    })

    it('should handle delete error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockNotificationIdDelete.mockRejectedValueOnce(new Error('Delete failed'))
      mockJson.mockResolvedValue({})

      await useNotificationStore.getState().deleteNotification('n1')

      expect(consoleSpy).toHaveBeenCalledWith('Failed to delete:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('fetchUnreadCount', () => {
    it('should fetch and set unread count', async () => {
      mockJson.mockResolvedValue({ success: true, data: { count: 5 } })

      await useNotificationStore.getState().fetchUnreadCount()

      expect(useNotificationStore.getState().unreadCount).toBe(5)
    })

    it('should handle fetch error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockNotificationUnreadCount.mockRejectedValueOnce(new Error('Failed'))
      mockJson.mockResolvedValue({})

      await useNotificationStore.getState().fetchUnreadCount()

      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch unread count:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('SSE Integration', () => {
    let statusHandlers: Array<(s: string) => void>
    let eventHandlers: Record<string, Array<(p: unknown) => void>>
    let mockSSEClient: { onStatusChange: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn>; onError: ReturnType<typeof vi.fn>; abort: ReturnType<typeof vi.fn> }

    beforeEach(() => {
      statusHandlers = []
      eventHandlers = {}
      mockSSEClient = {
        onStatusChange: vi.fn((h: (s: string) => void) => { statusHandlers.push(h) }),
        on: vi.fn((event: string, h: (p: unknown) => void) => {
          if (!eventHandlers[event]) eventHandlers[event] = []
          eventHandlers[event].push(h)
        }),
        onError: vi.fn(),
        abort: vi.fn(),
      }
      mockSSEConnect.mockReturnValue(mockSSEClient)
    })

    it('should connect SSE and handle status events', async () => {
      await useNotificationStore.getState().connectSSE()

      expect(mockSSEClient.onStatusChange).toHaveBeenCalled()
      expect(mockSSEClient.on).toHaveBeenCalledWith('connected', expect.any(Function))
      expect(mockSSEClient.on).toHaveBeenCalledWith('notification', expect.any(Function))

      statusHandlers[0]('open')
      expect(useNotificationStore.getState().sseConnected).toBe(true)

      statusHandlers[0]('closed')
      expect(useNotificationStore.getState().sseConnected).toBe(false)
    })

    it('should add new notification from SSE event', async () => {
      await useNotificationStore.getState().connectSSE()

      eventHandlers['notification'][0](createMockNotification({ id: 'sse-1', read: false }))

      const state = useNotificationStore.getState()
      expect(state.notifications).toHaveLength(1)
      expect(state.notifications[0].id).toBe('sse-1')
      expect(state.unreadCount).toBe(1)
    })

    it('should not add duplicate notification from SSE', async () => {
      useNotificationStore.setState({
        notifications: [createMockNotification({ id: 'dup-1' })],
        unreadCount: 1,
      })

      await useNotificationStore.getState().connectSSE()

      eventHandlers['notification'][0](createMockNotification({ id: 'dup-1' }))

      expect(useNotificationStore.getState().notifications).toHaveLength(1)
      expect(useNotificationStore.getState().unreadCount).toBe(1)
    })

    it('should not increment count for read SSE notification', async () => {
      await useNotificationStore.getState().connectSSE()

      eventHandlers['notification'][0](createMockNotification({ id: 'r1', read: true }))

      expect(useNotificationStore.getState().unreadCount).toBe(0)
    })

    it('should not create duplicate SSE connections', async () => {
      await useNotificationStore.getState().connectSSE()
      await useNotificationStore.getState().connectSSE()

      expect(mockSSEConnect).toHaveBeenCalledTimes(1)
    })

    it('should handle SSE connection error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockSSEConnect.mockImplementation(() => { throw new Error('SSE failed') })

      await useNotificationStore.getState().connectSSE()

      expect(consoleSpy).toHaveBeenCalledWith('[SSE] Failed to connect:', expect.any(Error))
      consoleSpy.mockRestore()
    })

    it('should abort SSE client and reset state on disconnect', async () => {
      await useNotificationStore.getState().connectSSE()
      useNotificationStore.getState().disconnectSSE()

      expect(mockSSEClient.abort).toHaveBeenCalled()
      expect(useNotificationStore.getState().sseConnected).toBe(false)
    })

    it('should allow reconnect after disconnect', async () => {
      await useNotificationStore.getState().connectSSE()
      useNotificationStore.getState().disconnectSSE()

      const callCount = mockSSEConnect.mock.calls.length
      await useNotificationStore.getState().connectSSE()
      expect(mockSSEConnect).toHaveBeenCalledTimes(callCount + 1)
    })

    it('should handle disconnect when no client', () => {
      useNotificationStore.getState().disconnectSSE()
      expect(useNotificationStore.getState().sseConnected).toBe(false)
    })
  })
})
