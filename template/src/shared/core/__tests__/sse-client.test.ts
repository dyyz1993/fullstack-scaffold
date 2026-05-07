import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type TestSSEProtocol = {
  events: {
    notification: { title: string; body: string }
    ping: { timestamp: number }
  }
}

let originalFetch: typeof globalThis.fetch

beforeEach(() => {
  originalFetch = globalThis.fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

function mockFetchResponse(body: ReadableStream | null, ok = true, status = 200, statusText = 'OK') {
  return vi.fn(async () => ({
    ok,
    status,
    statusText,
    body,
    headers: new Headers({ 'Content-Type': 'text/event-stream' }),
  }))
}

function createStreamFromChunks(chunks: string[]) {
  return new ReadableStream({
    start(controller) {
      chunks.forEach(c => controller.enqueue(new TextEncoder().encode(c)))
      controller.close()
    },
  })
}

describe('SSEClientImpl', () => {
  describe('connection lifecycle', () => {
    it('should start in connecting state', async () => {
      vi.useFakeTimers()
      const { SSEClientImpl } = await import('../sse-client')
      const stream = createStreamFromChunks([])
      globalThis.fetch = mockFetchResponse(stream) as any
      const client = new SSEClientImpl<TestSSEProtocol>('http://localhost/sse')
      expect(client.status).toBe('connecting')
      vi.useRealTimers()
    })

    it('should transition through open to closed on successful stream end', async () => {
      vi.useFakeTimers()
      const { SSEClientImpl } = await import('../sse-client')
      const stream = createStreamFromChunks([])
      globalThis.fetch = mockFetchResponse(stream) as any
      const client = new SSEClientImpl<TestSSEProtocol>('http://localhost/sse')

      const statusHandler = vi.fn()
      client.onStatusChange(statusHandler)

      await vi.runAllTimersAsync()
      expect(client.status).toBe('closed')
      expect(statusHandler).toHaveBeenCalledWith('open')
      expect(statusHandler).toHaveBeenCalledWith('closed')
      vi.useRealTimers()
    })

    it('should call error handlers on HTTP error', async () => {
      vi.useFakeTimers()
      const { SSEClientImpl } = await import('../sse-client')
      let callCount = 0
      globalThis.fetch = vi.fn(async () => {
        callCount++
        return { ok: false, status: 500, statusText: 'Internal Server Error' }
      }) as any
      const client = new SSEClientImpl<TestSSEProtocol>('http://localhost/sse')

      const errorHandler = vi.fn()
      client.onError(errorHandler)

      for (let i = 0; i < 6; i++) {
        await vi.advanceTimersByTimeAsync(10000)
      }

      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error))
      expect(errorHandler.mock.calls[0][0].message).toContain('HTTP 500')
      expect(client.status).toBe('closed')
      vi.useRealTimers()
    })

    it('should call error handlers when no response body', async () => {
      vi.useFakeTimers()
      const { SSEClientImpl } = await import('../sse-client')
      let callCount = 0
      globalThis.fetch = vi.fn(async () => {
        callCount++
        if (callCount <= 1) {
          return { ok: true, status: 200, statusText: 'OK', body: null, headers: new Headers() }
        }
        return { ok: false, status: 500, statusText: 'Error' }
      }) as any
      const client = new SSEClientImpl<TestSSEProtocol>('http://localhost/sse')

      const errorHandler = vi.fn()
      client.onError(errorHandler)

      for (let i = 0; i < 6; i++) {
        await vi.advanceTimersByTimeAsync(10000)
      }

      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error))
      expect(errorHandler.mock.calls[0][0].message).toContain('No response body')
      expect(client.status).toBe('closed')
      vi.useRealTimers()
    })

    it('should send correct headers including custom ones', async () => {
      vi.useFakeTimers()
      const { SSEClientImpl } = await import('../sse-client')
      const stream = createStreamFromChunks([])
      const mockFetch = mockFetchResponse(stream)
      globalThis.fetch = mockFetch as any

      new SSEClientImpl<TestSSEProtocol>('http://localhost/sse', {
        Authorization: 'Bearer token123',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost/sse',
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'text/event-stream',
            Authorization: 'Bearer token123',
          }),
        })
      )
      vi.useRealTimers()
    })
  })

  describe('on() event handling', () => {
    it('should call handler for matching events', async () => {
      vi.useFakeTimers()
      const { SSEClientImpl } = await import('../sse-client')
      const stream = createStreamFromChunks([
        'event: notification\ndata: {"title":"hello","body":"world"}\n\n',
      ])
      globalThis.fetch = mockFetchResponse(stream) as any

      const client = new SSEClientImpl<TestSSEProtocol>('http://localhost/sse')
      const handler = vi.fn()
      client.on('notification', handler)

      await vi.runAllTimersAsync()
      expect(handler).toHaveBeenCalledWith({ title: 'hello', body: 'world' })
      vi.useRealTimers()
    })

    it('should call handler with plain data if JSON parse fails', async () => {
      vi.useFakeTimers()
      const { SSEClientImpl } = await import('../sse-client')
      const stream = createStreamFromChunks([
        'event: ping\ndata: not-json\n\n',
      ])
      globalThis.fetch = mockFetchResponse(stream) as any

      const client = new SSEClientImpl<TestSSEProtocol>('http://localhost/sse')
      const handler = vi.fn()
      client.on('ping', handler)

      await vi.runAllTimersAsync()
      expect(handler).toHaveBeenCalledWith('not-json')
      vi.useRealTimers()
    })

    it('should handle multiple events in one chunk', async () => {
      vi.useFakeTimers()
      const { SSEClientImpl } = await import('../sse-client')
      const stream = createStreamFromChunks([
        'event: notification\ndata: {"title":"first"}\n\nevent: notification\ndata: {"title":"second"}\n\n',
      ])
      globalThis.fetch = mockFetchResponse(stream) as any

      const client = new SSEClientImpl<TestSSEProtocol>('http://localhost/sse')
      const handler = vi.fn()
      client.on('notification', handler)

      await vi.runAllTimersAsync()
      expect(handler).toHaveBeenCalledTimes(2)
      expect(handler).toHaveBeenCalledWith({ title: 'first' })
      expect(handler).toHaveBeenCalledWith({ title: 'second' })
      vi.useRealTimers()
    })

    it('should handle split across chunks (incomplete message buffering)', async () => {
      vi.useFakeTimers()
      const { SSEClientImpl } = await import('../sse-client')
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('event: ping\ndata: '))
          controller.enqueue(new TextEncoder().encode('{"timestamp":123}\n\n'))
          controller.close()
        },
      })
      globalThis.fetch = mockFetchResponse(stream) as any

      const client = new SSEClientImpl<TestSSEProtocol>('http://localhost/sse')
      const handler = vi.fn()
      client.on('ping', handler)

      await vi.runAllTimersAsync()
      expect(handler).toHaveBeenCalledWith({ timestamp: 123 })
      vi.useRealTimers()
    })

    it('should return unsubscribe function', async () => {
      vi.useFakeTimers()
      const { SSEClientImpl } = await import('../sse-client')
      const stream = createStreamFromChunks([
        'event: notification\ndata: {"title":"hello","body":"world"}\n\n',
      ])
      globalThis.fetch = mockFetchResponse(stream) as any

      const client = new SSEClientImpl<TestSSEProtocol>('http://localhost/sse')
      const handler = vi.fn()
      const unsub = client.on('notification', handler)
      unsub()

      await vi.runAllTimersAsync()
      expect(handler).not.toHaveBeenCalled()
      vi.useRealTimers()
    })

    it('should use "message" as default event type if not specified', async () => {
      vi.useFakeTimers()
      const { SSEClientImpl } = await import('../sse-client')
      const stream = createStreamFromChunks(['data: {"title":"default"}\n\n'])
      globalThis.fetch = mockFetchResponse(stream) as any

      const client = new SSEClientImpl<TestSSEProtocol>('http://localhost/sse')
      const handler = vi.fn()
      client.on('message' as 'notification', handler)

      await vi.runAllTimersAsync()
      expect(handler).toHaveBeenCalledWith({ title: 'default' })
      vi.useRealTimers()
    })
  })

  describe('onStatusChange()', () => {
    it('should call handler immediately with current status', async () => {
      vi.useFakeTimers()
      const { SSEClientImpl } = await import('../sse-client')
      const stream = createStreamFromChunks([])
      globalThis.fetch = mockFetchResponse(stream) as any

      const client = new SSEClientImpl<TestSSEProtocol>('http://localhost/sse')
      const handler = vi.fn()
      client.onStatusChange(handler)
      expect(handler).toHaveBeenCalledWith('connecting')
      vi.useRealTimers()
    })

    it('should return unsubscribe function', async () => {
      vi.useFakeTimers()
      const { SSEClientImpl } = await import('../sse-client')
      const stream = createStreamFromChunks([])
      globalThis.fetch = mockFetchResponse(stream) as any

      const client = new SSEClientImpl<TestSSEProtocol>('http://localhost/sse')
      const handler = vi.fn()
      const unsub = client.onStatusChange(handler)
      handler.mockClear()
      unsub()

      await vi.runAllTimersAsync()
      expect(handler).not.toHaveBeenCalled()
      vi.useRealTimers()
    })
  })

  describe('onError()', () => {
    it('should return unsubscribe function', async () => {
      vi.useFakeTimers()
      const { SSEClientImpl } = await import('../sse-client')
      let callCount = 0
      globalThis.fetch = vi.fn(async () => {
        callCount++
        return { ok: false, status: 500, statusText: 'Error' }
      }) as any
      const client = new SSEClientImpl<TestSSEProtocol>('http://localhost/sse')
      const handler = vi.fn()
      const unsub = client.onError(handler)
      unsub()

      for (let i = 0; i < 6; i++) {
        await vi.advanceTimersByTimeAsync(10000)
      }

      expect(handler).not.toHaveBeenCalled()
      vi.useRealTimers()
    })
  })

  describe('abort()', () => {
    it('should set status to closed and notify handlers', async () => {
      vi.useFakeTimers()
      const { SSEClientImpl } = await import('../sse-client')
      const stream = createStreamFromChunks([])
      globalThis.fetch = mockFetchResponse(stream) as any

      const client = new SSEClientImpl<TestSSEProtocol>('http://localhost/sse')
      const statusHandler = vi.fn()
      client.onStatusChange(statusHandler)
      statusHandler.mockClear()

      client.abort()
      expect(client.status).toBe('closed')
      expect(statusHandler).toHaveBeenCalledWith('closed')
      vi.useRealTimers()
    })

    it('should handle abort when already closed', async () => {
      vi.useFakeTimers()
      const { SSEClientImpl } = await import('../sse-client')
      const stream = createStreamFromChunks([])
      globalThis.fetch = mockFetchResponse(stream) as any

      const client = new SSEClientImpl<TestSSEProtocol>('http://localhost/sse')
      client.abort()
      expect(client.status).toBe('closed')
      client.abort()
      expect(client.status).toBe('closed')
      vi.useRealTimers()
    })
  })

  describe('reconnection', () => {
    it('should attempt reconnect on error up to max attempts', async () => {
      vi.useFakeTimers()
      const { SSEClientImpl } = await import('../sse-client')
      let fetchCallCount = 0
      globalThis.fetch = vi.fn(async () => {
        fetchCallCount++
        return { ok: false, status: 500, statusText: 'Error' }
      }) as any

      const client = new SSEClientImpl<TestSSEProtocol>('http://localhost/sse')
      const errorHandler = vi.fn()
      client.onError(errorHandler)

      for (let i = 0; i < 6; i++) {
        await vi.advanceTimersByTimeAsync(10000)
      }

      expect(errorHandler.mock.calls.length).toBeGreaterThanOrEqual(5)
      expect(client.status).toBe('closed')
      vi.useRealTimers()
    })
  })
})

describe('createSSEClient', () => {
  it('should create an SSEClient instance', async () => {
    vi.useFakeTimers()
    const { createSSEClient } = await import('../sse-client')
    const stream = createStreamFromChunks([])
    globalThis.fetch = mockFetchResponse(stream) as any
    const client = createSSEClient<TestSSEProtocol>('http://localhost/sse')
    expect(client).toBeDefined()
    expect(client.status).toBe('connecting')
    vi.useRealTimers()
  })
})
