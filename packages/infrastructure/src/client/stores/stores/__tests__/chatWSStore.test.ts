import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChatWsStore } from '../chatWSStore'

type StatusHandler = (status: string) => void
type EventHandler = (payload: Record<string, unknown>) => void

const createMockWSClient = () => {
  const statusHandlers: StatusHandler[] = []
  const eventHandlers: Record<string, EventHandler[]> = {}

  return {
    onStatusChange: vi.fn((handler: StatusHandler) => {
      statusHandlers.push(handler)
    }),
    on: vi.fn((event: string, handler: EventHandler) => {
      if (!eventHandlers[event]) eventHandlers[event] = []
      eventHandlers[event].push(handler)
    }),
    call: vi.fn(),
    emit: vi.fn(),
    close: vi.fn(),
    _fireStatus: (status: string) => statusHandlers.forEach(h => h(status)),
    _fireEvent: (event: string, payload: Record<string, unknown>) => {
      ;(eventHandlers[event] || []).forEach(h => h(payload))
    },
  }
}

const mockWSClient = createMockWSClient()

vi.mock('@client/services/apiClient', () => ({
  apiClient: {
    api: {
      chat: {
        ws: {
          $ws: () => mockWSClient,
        },
      },
    },
  },
}))

describe('chatWSStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWSClient.onStatusChange.mockClear()
    mockWSClient.on.mockClear()
    mockWSClient.call.mockReset()
    mockWSClient.emit.mockReset()
    mockWSClient.close.mockReset()
    useChatWsStore.setState({ status: 'closed', messages: [] })
  })

  describe('Initial State', () => {
    it('should have closed status and empty messages initially', () => {
      const { result } = renderHook(() => useChatWsStore())
      expect(result.current.status).toBe('closed')
      expect(result.current.messages).toEqual([])
    })
  })

  describe('connect', () => {
    it('should create WS client and register handlers', () => {
      const { result } = renderHook(() => useChatWsStore())
      act(() => {
        result.current.connect()
      })

      expect(mockWSClient.onStatusChange).toHaveBeenCalled()
      expect(mockWSClient.on).toHaveBeenCalledWith('notification', expect.any(Function))
      expect(mockWSClient.on).toHaveBeenCalledWith('broadcast', expect.any(Function))
      expect(mockWSClient.on).toHaveBeenCalledWith('connected', expect.any(Function))
    })

    it('should update status when status changes', () => {
      const { result } = renderHook(() => useChatWsStore())
      act(() => {
        result.current.connect()
      })

      act(() => {
        mockWSClient._fireStatus('open')
      })
      expect(result.current.status).toBe('open')

      act(() => {
        mockWSClient._fireStatus('closed')
      })
      expect(result.current.status).toBe('closed')
    })

    it('should add notification message when event fires', () => {
      const { result } = renderHook(() => useChatWsStore())
      act(() => {
        result.current.connect()
      })

      act(() => {
        mockWSClient._fireEvent('notification', { title: 'test', timestamp: 1000 })
      })

      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0].type).toBe('notification')
      expect(result.current.messages[0].payload).toEqual({ title: 'test', timestamp: 1000 })
    })

    it('should add broadcast message when event fires', () => {
      const { result } = renderHook(() => useChatWsStore())
      act(() => {
        result.current.connect()
      })

      act(() => {
        mockWSClient._fireEvent('broadcast', { message: 'hello', timestamp: 2000 })
      })

      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0].type).toBe('broadcast')
    })

    it('should add connected message when event fires', () => {
      const { result } = renderHook(() => useChatWsStore())
      act(() => {
        result.current.connect()
      })

      act(() => {
        mockWSClient._fireEvent('connected', { timestamp: 3000 })
      })

      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0].type).toBe('connected')
    })

    it('should not create duplicate client on multiple connects', () => {
      const { result } = renderHook(() => useChatWsStore())
      act(() => {
        result.current.connect()
      })
      const callCount = mockWSClient.onStatusChange.mock.calls.length
      act(() => {
        result.current.connect()
      })
      expect(mockWSClient.onStatusChange.mock.calls.length).toBe(callCount)
    })
  })

  describe('disconnect', () => {
    it('should close the WS client', () => {
      const { result } = renderHook(() => useChatWsStore())
      act(() => {
        result.current.connect()
      })
      act(() => {
        result.current.disconnect()
      })

      expect(mockWSClient.close).toHaveBeenCalled()
      expect(result.current.status).toBe('closed')
    })

    it('should allow reconnect after disconnect', () => {
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

      expect(mockWSClient.onStatusChange).toHaveBeenCalled()
    })
  })

  describe('echo', () => {
    it('should not echo when disconnected', async () => {
      const { result } = renderHook(() => useChatWsStore())
      await act(async () => {
        await result.current.echo({ message: 'hello' })
      })

      expect(mockWSClient.call).not.toHaveBeenCalled()
    })

    it('should add echo request and response messages', async () => {
      mockWSClient.call.mockResolvedValue({ message: 'hello', timestamp: 5000 })

      const { result } = renderHook(() => useChatWsStore())
      act(() => {
        result.current.connect()
      })
      act(() => {
        mockWSClient._fireStatus('open')
      })

      await act(async () => {
        await result.current.echo({ message: 'hello' })
      })

      expect(mockWSClient.call).toHaveBeenCalledWith('echo', { message: 'hello' })
      expect(result.current.messages).toHaveLength(2)
      expect(result.current.messages[0].type).toBe('echo_request')
      expect(result.current.messages[1].type).toBe('echo_response')
    })

    it('should handle echo error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockWSClient.call.mockRejectedValue(new Error('Echo failed'))

      const { result } = renderHook(() => useChatWsStore())
      act(() => {
        result.current.connect()
      })
      act(() => {
        mockWSClient._fireStatus('open')
      })

      await act(async () => {
        await result.current.echo({ message: 'test' })
      })

      expect(consoleSpy).toHaveBeenCalledWith('Echo failed:', expect.any(Error))
      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0].type).toBe('echo_request')
      consoleSpy.mockRestore()
    })
  })

  describe('ping', () => {
    it('should not ping when disconnected', async () => {
      const { result } = renderHook(() => useChatWsStore())
      await act(async () => {
        await result.current.ping()
      })
      expect(mockWSClient.call).not.toHaveBeenCalled()
    })

    it('should add pong message on successful ping', async () => {
      mockWSClient.call.mockResolvedValue({ pong: true, timestamp: 6000 })

      const { result } = renderHook(() => useChatWsStore())
      act(() => {
        result.current.connect()
      })
      act(() => {
        mockWSClient._fireStatus('open')
      })

      await act(async () => {
        await result.current.ping()
      })

      expect(mockWSClient.call).toHaveBeenCalledWith('ping', {})
      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0].type).toBe('pong')
    })

    it('should handle ping error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockWSClient.call.mockRejectedValue(new Error('Ping failed'))

      const { result } = renderHook(() => useChatWsStore())
      act(() => {
        result.current.connect()
      })
      act(() => {
        mockWSClient._fireStatus('open')
      })

      await act(async () => {
        await result.current.ping()
      })

      expect(consoleSpy).toHaveBeenCalledWith('Ping failed:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('broadcast', () => {
    it('should not broadcast when disconnected', () => {
      const { result } = renderHook(() => useChatWsStore())
      act(() => {
        result.current.broadcast({ message: 'test', timestamp: 100 })
      })
      expect(mockWSClient.emit).not.toHaveBeenCalled()
    })

    it('should emit broadcast event when connected', () => {
      const { result } = renderHook(() => useChatWsStore())
      act(() => {
        result.current.connect()
      })
      act(() => {
        mockWSClient._fireStatus('open')
      })

      act(() => {
        result.current.broadcast({ message: 'hello', timestamp: 1000 })
      })

      expect(mockWSClient.emit).toHaveBeenCalledWith('broadcast', {
        message: 'hello',
        timestamp: 1000,
      })
    })
  })

  describe('notification', () => {
    it('should not send notification when disconnected', () => {
      const { result } = renderHook(() => useChatWsStore())
      act(() => {
        result.current.notification({ title: 't', body: 'b', timestamp: 1 })
      })
      expect(mockWSClient.emit).not.toHaveBeenCalled()
    })

    it('should emit notification event when connected', () => {
      const { result } = renderHook(() => useChatWsStore())
      act(() => {
        result.current.connect()
      })
      act(() => {
        mockWSClient._fireStatus('open')
      })

      act(() => {
        result.current.notification({ title: 'Test', body: 'Body', timestamp: 1234 })
      })

      expect(mockWSClient.emit).toHaveBeenCalledWith('notification', {
        title: 'Test',
        body: 'Body',
        timestamp: 1234,
      })
    })
  })

  describe('clearMessages', () => {
    it('should clear all messages', () => {
      const { result } = renderHook(() => useChatWsStore())
      act(() => {
        result.current.connect()
      })
      act(() => {
        mockWSClient._fireEvent('notification', { title: 'test', timestamp: 1 })
      })
      expect(result.current.messages.length).toBeGreaterThan(0)

      act(() => {
        result.current.clearMessages()
      })
      expect(result.current.messages).toEqual([])
    })
  })

  describe('Error Scenarios', () => {
    it('should handle failed echo gracefully without crashing', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockWSClient.call.mockRejectedValue(new Error('RPC failed'))

      const { result } = renderHook(() => useChatWsStore())
      act(() => {
        result.current.connect()
      })
      act(() => {
        mockWSClient._fireStatus('open')
      })

      await act(async () => {
        await result.current.echo({ message: 'test' })
      })

      expect(consoleSpy).toHaveBeenCalledWith('Echo failed:', expect.any(Error))
      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0].type).toBe('echo_request')
      consoleSpy.mockRestore()
    })

    it('should handle failed ping gracefully without crashing', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockWSClient.call.mockRejectedValue(new Error('Ping timeout'))

      const { result } = renderHook(() => useChatWsStore())
      act(() => {
        result.current.connect()
      })
      act(() => {
        mockWSClient._fireStatus('open')
      })

      await act(async () => {
        await result.current.ping()
      })

      expect(consoleSpy).toHaveBeenCalledWith('Ping failed:', expect.any(Error))
      expect(result.current.messages).toHaveLength(0)
      consoleSpy.mockRestore()
    })

    it('should have closed status before connect', () => {
      const { result } = renderHook(() => useChatWsStore())
      expect(result.current.status).toBe('closed')
      expect(mockWSClient.call).not.toHaveBeenCalled()
    })

    it('should not throw when disconnecting without connection', () => {
      const { result } = renderHook(() => useChatWsStore())
      expect(() => result.current.disconnect()).not.toThrow()
      expect(result.current.status).toBe('closed')
    })
  })
})
