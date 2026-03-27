import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChatWsStore } from '../chatWSStore'
import type { WSStatus } from '@shared/schemas'

interface MockWSClient {
  status: WSStatus
  close: ReturnType<typeof vi.fn>
  call: ReturnType<typeof vi.fn>
  emit: ReturnType<typeof vi.fn>
  on: ReturnType<typeof vi.fn>
  onStatusChange: ReturnType<typeof vi.fn>
}

const createMockWsClient = (): MockWSClient => ({
  status: 'closed',
  close: vi.fn(),
  call: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(() => () => {}),
  onStatusChange: vi.fn(() => () => {}),
})

let mockWsClient: MockWSClient

vi.mock('@client/services/apiClient', () => ({
  apiClient: {
    api: {
      chat: {
        ws: {
          $ws: () => mockWsClient,
        },
      },
    },
  },
}))

describe('Chat WS Store', () => {
  beforeEach(() => {
    mockWsClient = createMockWsClient()
    useChatWsStore.setState({
      status: 'closed',
      messages: [],
    })
  })

  afterEach(() => {
    useChatWsStore.getState().disconnect()
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useChatWsStore())

      expect(result.current.status).toBe('closed')
      expect(result.current.messages).toEqual([])
    })

    it('should handle null or invalid inputs gracefully', () => {
      const { result } = renderHook(() => useChatWsStore())

      expect(result.current.messages).not.toBeNull()
      expect(result.current.status).not.toBeNull()
    })
  })

  describe('connect', () => {
    it('should create websocket client when connecting', () => {
      const { result } = renderHook(() => useChatWsStore())

      act(() => {
        result.current.connect()
      })

      expect(mockWsClient.onStatusChange).toHaveBeenCalled()
    })

    it('should not create new client if already connected', () => {
      const { result } = renderHook(() => useChatWsStore())

      act(() => {
        result.current.connect()
      })

      act(() => {
        result.current.connect()
      })

      expect(mockWsClient.onStatusChange).toHaveBeenCalledTimes(1)
    })

    it('should set up status change handler', () => {
      const { result } = renderHook(() => useChatWsStore())

      act(() => {
        result.current.connect()
      })

      expect(mockWsClient.onStatusChange).toHaveBeenCalled()
    })

    it('should set up event handlers', () => {
      const { result } = renderHook(() => useChatWsStore())

      act(() => {
        result.current.connect()
      })

      expect(mockWsClient.on).toHaveBeenCalledWith('notification', expect.any(Function))
      expect(mockWsClient.on).toHaveBeenCalledWith('broadcast', expect.any(Function))
      expect(mockWsClient.on).toHaveBeenCalledWith('connected', expect.any(Function))
    })
  })

  describe('disconnect', () => {
    it('should close websocket and reset status', () => {
      const { result } = renderHook(() => useChatWsStore())

      act(() => {
        result.current.connect()
      })

      act(() => {
        result.current.disconnect()
      })

      expect(mockWsClient.close).toHaveBeenCalled()
      expect(result.current.status).toBe('closed')
    })

    it('should handle disconnect when not connected', () => {
      const { result } = renderHook(() => useChatWsStore())

      act(() => {
        result.current.disconnect()
      })

      expect(mockWsClient.close).not.toHaveBeenCalled()
    })

    it('should allow reconnecting after disconnect', () => {
      const { result } = renderHook(() => useChatWsStore())

      act(() => {
        result.current.connect()
      })

      act(() => {
        result.current.disconnect()
      })

      act(() => {
        result.current.connect()
      })

      expect(mockWsClient.onStatusChange).toHaveBeenCalledTimes(2)
    })
  })

  describe('echo', () => {
    it('should not call echo when status is not open', async () => {
      const { result } = renderHook(() => useChatWsStore())

      await act(async () => {
        await result.current.echo({ message: 'test' })
      })

      expect(mockWsClient.call).not.toHaveBeenCalled()
    })

    it('should not call echo when wsClient is null', async () => {
      const { result } = renderHook(() => useChatWsStore())

      await act(async () => {
        await result.current.echo({ message: 'test' })
      })

      expect(mockWsClient.call).not.toHaveBeenCalled()
    })
  })

  describe('ping', () => {
    it('should not call ping when status is not open', async () => {
      const { result } = renderHook(() => useChatWsStore())

      await act(async () => {
        await result.current.ping()
      })

      expect(mockWsClient.call).not.toHaveBeenCalled()
    })

    it('should not call ping when wsClient is null', async () => {
      const { result } = renderHook(() => useChatWsStore())

      await act(async () => {
        await result.current.ping()
      })

      expect(mockWsClient.call).not.toHaveBeenCalled()
    })
  })

  describe('broadcast', () => {
    it('should not broadcast when status is not open', () => {
      const { result } = renderHook(() => useChatWsStore())

      act(() => {
        result.current.broadcast({ message: 'test', timestamp: 1234567890 })
      })

      expect(mockWsClient.emit).not.toHaveBeenCalled()
    })

    it('should not broadcast when wsClient is null', () => {
      const { result } = renderHook(() => useChatWsStore())

      act(() => {
        result.current.broadcast({ message: 'test', timestamp: 1234567890 })
      })

      expect(mockWsClient.emit).not.toHaveBeenCalled()
    })
  })

  describe('notification', () => {
    it('should not emit notification when status is not open', () => {
      const { result } = renderHook(() => useChatWsStore())

      act(() => {
        result.current.notification({ title: 'Test', body: 'Body', timestamp: 1234567890 })
      })

      expect(mockWsClient.emit).not.toHaveBeenCalled()
    })

    it('should not emit notification when wsClient is null', () => {
      const { result } = renderHook(() => useChatWsStore())

      act(() => {
        result.current.notification({ title: 'Test', body: 'Body', timestamp: 1234567890 })
      })

      expect(mockWsClient.emit).not.toHaveBeenCalled()
    })
  })

  describe('clearMessages', () => {
    it('should clear all messages', () => {
      const { result } = renderHook(() => useChatWsStore())

      useChatWsStore.setState({
        messages: [
          { type: 'notification', payload: { title: 'Test' }, timestamp: 1234567890 },
          { type: 'broadcast', payload: { message: 'Hello' }, timestamp: 1234567891 },
        ],
      })

      act(() => {
        result.current.clearMessages()
      })

      expect(result.current.messages).toEqual([])
    })

    it('should handle clearing when messages is already empty', () => {
      const { result } = renderHook(() => useChatWsStore())

      act(() => {
        result.current.clearMessages()
      })

      expect(result.current.messages).toEqual([])
    })
  })

  describe('status changes', () => {
    it('should update status when onStatusChange is called', () => {
      const { result } = renderHook(() => useChatWsStore())

      let statusHandler: ((status: WSStatus) => void) | undefined

      mockWsClient.onStatusChange.mockImplementation((handler: (status: WSStatus) => void) => {
        statusHandler = handler
        return () => {}
      })

      act(() => {
        result.current.connect()
      })

      act(() => {
        if (statusHandler) {
          statusHandler('open')
        }
      })

      expect(result.current.status).toBe('open')
    })

    it('should handle multiple status changes', () => {
      const { result } = renderHook(() => useChatWsStore())

      let statusHandler: ((status: WSStatus) => void) | undefined

      mockWsClient.onStatusChange.mockImplementation((handler: (status: WSStatus) => void) => {
        statusHandler = handler
        return () => {}
      })

      act(() => {
        result.current.connect()
      })

      act(() => {
        if (statusHandler) {
          statusHandler('connecting')
        }
      })
      expect(result.current.status).toBe('connecting')

      act(() => {
        if (statusHandler) {
          statusHandler('open')
        }
      })
      expect(result.current.status).toBe('open')

      act(() => {
        if (statusHandler) {
          statusHandler('closed')
        }
      })
      expect(result.current.status).toBe('closed')
    })
  })

  describe('event handlers', () => {
    it('should add notification message when notification event is received', () => {
      const { result } = renderHook(() => useChatWsStore())

      let notificationHandler: ((payload: unknown) => void) | undefined

      mockWsClient.on.mockImplementation((event: string, handler: (payload: unknown) => void) => {
        if (event === 'notification') {
          notificationHandler = handler
        }
        return () => {}
      })

      act(() => {
        result.current.connect()
      })

      act(() => {
        if (notificationHandler) {
          notificationHandler({ title: 'Test Title', body: 'Test Body', timestamp: 1234567890 })
        }
      })

      const messages = useChatWsStore.getState().messages
      expect(messages.some(m => m.type === 'notification')).toBe(true)
    })

    it('should add broadcast message when broadcast event is received', () => {
      const { result } = renderHook(() => useChatWsStore())

      let broadcastHandler: ((payload: unknown) => void) | undefined

      mockWsClient.on.mockImplementation((event: string, handler: (payload: unknown) => void) => {
        if (event === 'broadcast') {
          broadcastHandler = handler
        }
        return () => {}
      })

      act(() => {
        result.current.connect()
      })

      act(() => {
        if (broadcastHandler) {
          broadcastHandler({ message: 'Broadcast message', timestamp: 1234567890 })
        }
      })

      const messages = useChatWsStore.getState().messages
      expect(messages.some(m => m.type === 'broadcast')).toBe(true)
    })

    it('should add connected message when connected event is received', () => {
      const { result } = renderHook(() => useChatWsStore())

      let connectedHandler: ((payload: unknown) => void) | undefined

      mockWsClient.on.mockImplementation((event: string, handler: (payload: unknown) => void) => {
        if (event === 'connected') {
          connectedHandler = handler
        }
        return () => {}
      })

      act(() => {
        result.current.connect()
      })

      act(() => {
        if (connectedHandler) {
          connectedHandler({ timestamp: 1234567890 })
        }
      })

      const messages = useChatWsStore.getState().messages
      expect(messages.some(m => m.type === 'connected')).toBe(true)
    })
  })
})
