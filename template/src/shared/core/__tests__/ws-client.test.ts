/**
 * @framework-baseline dac723f73f2c7757
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type TestProtocol = {
  rpc: {
    echo: { in: { message: string }; out: { message: string; timestamp: number } }
    ping: { in: Record<string, never>; out: { pong: boolean } }
  }
  events: {
    broadcast: { text: string }
    notification: { title: string }
  }
}

let savedWebSocket: typeof globalThis.WebSocket | undefined

beforeEach(() => {
  vi.useFakeTimers()
  savedWebSocket = globalThis.WebSocket
  delete (globalThis as Record<string, unknown>).WebSocket
})

afterEach(() => {
  vi.useRealTimers()
  if (savedWebSocket !== undefined) {
    globalThis.WebSocket = savedWebSocket
  } else {
    delete (globalThis as Record<string, unknown>).WebSocket
  }
})

async function getModule() {
  vi.resetModules()
  const mod = await import('../ws-client')
  return mod
}

describe('WSClientImpl', () => {
  describe('constructor and status', () => {
    it('should start in connecting state with StubWebSocket', async () => {
      const { WSClientImpl } = await getModule()
      const client = new WSClientImpl<TestProtocol>('ws://localhost')
      expect(client.status).toBe('connecting')
    })

    it('should transition to open on ws.onopen', async () => {
      const { WSClientImpl } = await getModule()
      const client = new WSClientImpl<TestProtocol>('ws://localhost')
      const ws = (
        client as unknown as { ws: { onopen: ((e: Event) => void) | null; readyState: number } }
      ).ws

      ws.readyState = 1
      ws.onopen?.(new Event('open'))
      expect(client.status).toBe('open')
    })

    it('should transition to closed on ws.onclose', async () => {
      const { WSClientImpl } = await getModule()
      const client = new WSClientImpl<TestProtocol>('ws://localhost')
      const ws = (
        client as unknown as {
          ws: {
            onopen: ((e: Event) => void) | null
            onclose: ((e: CloseEvent) => void) | null
            readyState: number
          }
        }
      ).ws

      ws.readyState = 1
      ws.onopen?.(new Event('open'))
      ws.readyState = 3
      ws.onclose?.(new Event('close') as CloseEvent)
      expect(client.status).toBe('closed')
    })

    it('should transition to closed on ws.onerror', async () => {
      const { WSClientImpl } = await getModule()
      const client = new WSClientImpl<TestProtocol>('ws://localhost')
      const ws = (client as unknown as { ws: { onerror: ((e: Event) => void) | null } }).ws

      ws.onerror?.(new Event('error'))
      expect(client.status).toBe('closed')
    })

    it('should not double-transition if already closed on onclose', async () => {
      const { WSClientImpl } = await getModule()
      const client = new WSClientImpl<TestProtocol>('ws://localhost')
      const ws = (
        client as unknown as {
          ws: { onclose: ((e: CloseEvent) => void) | null; readyState: number }
        }
      ).ws

      ws.readyState = 3
      ws.onclose?.(new Event('close') as CloseEvent)
      expect(client.status).toBe('closed')
    })

    it('should not double-transition if already open on onopen', async () => {
      const { WSClientImpl } = await getModule()
      const client = new WSClientImpl<TestProtocol>('ws://localhost')
      const ws = (
        client as unknown as { ws: { onopen: ((e: Event) => void) | null; readyState: number } }
      ).ws

      ws.readyState = 1
      ws.onopen?.(new Event('open'))
      const handler = vi.fn()
      client.onStatusChange(handler)
      handler.mockClear()
      ws.onopen?.(new Event('open'))
      expect(handler).not.toHaveBeenCalled()
    })

    it('should not transition on onerror if already closed', async () => {
      const { WSClientImpl } = await getModule()
      const client = new WSClientImpl<TestProtocol>('ws://localhost')
      const ws = (client as unknown as { ws: { onerror: ((e: Event) => void) | null } }).ws

      ws.onerror?.(new Event('error'))
      const handler = vi.fn()
      client.onStatusChange(handler)
      handler.mockClear()
      ws.onerror?.(new Event('error'))
      expect(handler).not.toHaveBeenCalled()
    })

    it('should return null for getSocket with StubWebSocket', async () => {
      const { WSClientImpl } = await getModule()
      const client = new WSClientImpl<TestProtocol>('ws://localhost')
      expect(client.getSocket()).toBeNull()
    })
  })

  describe('call()', () => {
    it('should send RPC request and resolve with result', async () => {
      const { WSClientImpl } = await getModule()
      const client = new WSClientImpl<TestProtocol>('ws://localhost')
      const ws = (
        client as unknown as {
          ws: {
            send: (d: string) => void
            onopen: ((e: Event) => void) | null
            onmessage: ((e: MessageEvent) => void) | null
            readyState: number
          }
        }
      ).ws
      const sendSpy = vi.spyOn(ws, 'send')

      ws.readyState = 1
      ws.onopen?.(new Event('open'))

      const callPromise = client.call('echo', { message: 'hello' })
      expect(sendSpy).toHaveBeenCalledTimes(1)
      const sent = JSON.parse(sendSpy.mock.calls[0][0] as string)
      expect(sent.method).toBe('echo')

      ws.onmessage?.({
        data: JSON.stringify({ id: sent.id, result: { message: 'hello', timestamp: 123 } }),
      } as MessageEvent)
      const result = await callPromise
      expect(result).toEqual({ message: 'hello', timestamp: 123 })
    })

    it('should reject on RPC error response', async () => {
      const { WSClientImpl } = await getModule()
      const client = new WSClientImpl<TestProtocol>('ws://localhost')
      const ws = (
        client as unknown as {
          ws: {
            send: (d: string) => void
            onopen: ((e: Event) => void) | null
            onmessage: ((e: MessageEvent) => void) | null
            readyState: number
          }
        }
      ).ws
      const sendSpy = vi.spyOn(ws, 'send')

      ws.readyState = 1
      ws.onopen?.(new Event('open'))

      const callPromise = client.call('echo', { message: 'fail' })
      const sent = JSON.parse(sendSpy.mock.calls[0][0] as string)
      ws.onmessage?.({
        data: JSON.stringify({ id: sent.id, error: 'Something went wrong' }),
      } as MessageEvent)
      await expect(callPromise).rejects.toThrow('Something went wrong')
    })

    it('should reject on timeout', async () => {
      const { WSClientImpl } = await getModule()
      const client = new WSClientImpl<TestProtocol>('ws://localhost')
      const ws = (
        client as unknown as {
          ws: { send: (d: string) => void; onopen: ((e: Event) => void) | null; readyState: number }
        }
      ).ws
      vi.spyOn(ws, 'send')

      ws.readyState = 1
      ws.onopen?.(new Event('open'))

      const callPromise = client.call('echo', { message: 'timeout' }, 1000)
      vi.advanceTimersByTime(1001)
      await expect(callPromise).rejects.toThrow('RPC Timeout: echo')
    })

    it('should clear timeout timer on resolve', async () => {
      const { WSClientImpl } = await getModule()
      const client = new WSClientImpl<TestProtocol>('ws://localhost')
      const ws = (
        client as unknown as {
          ws: {
            send: (d: string) => void
            onopen: ((e: Event) => void) | null
            onmessage: ((e: MessageEvent) => void) | null
            readyState: number
          }
        }
      ).ws
      const sendSpy = vi.spyOn(ws, 'send')

      ws.readyState = 1
      ws.onopen?.(new Event('open'))

      const callPromise = client.call('echo', { message: 'hello' }, 1000)
      const sent = JSON.parse(sendSpy.mock.calls[0][0] as string)
      ws.onmessage?.({
        data: JSON.stringify({ id: sent.id, result: { message: 'hello', timestamp: 1 } }),
      } as MessageEvent)
      await callPromise
      vi.advanceTimersByTime(2000)
    })

    it('should buffer messages when socket is not open', async () => {
      const { WSClientImpl } = await getModule()
      const client = new WSClientImpl<TestProtocol>('ws://localhost')
      const ws = (
        client as unknown as {
          ws: {
            send: (d: string) => void
            onopen: ((e: Event) => void) | null
            onmessage: ((e: MessageEvent) => void) | null
            readyState: number
          }
        }
      ).ws
      const sendSpy = vi.spyOn(ws, 'send')

      const callPromise = client.call('echo', { message: 'buffered' }, 5000)
      expect(sendSpy).not.toHaveBeenCalled()

      ws.readyState = 1
      ws.onopen?.(new Event('open'))
      expect(sendSpy).toHaveBeenCalledTimes(1)
      const sent = JSON.parse(sendSpy.mock.calls[0][0] as string)
      ws.onmessage?.({
        data: JSON.stringify({ id: sent.id, result: { message: 'buffered', timestamp: 1 } }),
      } as MessageEvent)
      await callPromise
    })
  })

  describe('on()', () => {
    it('should register event handler and receive events', async () => {
      const { WSClientImpl } = await getModule()
      const client = new WSClientImpl<TestProtocol>('ws://localhost')
      const ws = (client as unknown as { ws: { onmessage: ((e: MessageEvent) => void) | null } }).ws

      const handler = vi.fn()
      client.on('broadcast', handler)

      ws.onmessage?.({
        data: JSON.stringify({ type: 'broadcast', payload: { text: 'hello' } }),
      } as MessageEvent)
      expect(handler).toHaveBeenCalledWith({ text: 'hello' })
    })

    it('should support multiple handlers for same event', async () => {
      const { WSClientImpl } = await getModule()
      const client = new WSClientImpl<TestProtocol>('ws://localhost')
      const ws = (client as unknown as { ws: { onmessage: ((e: MessageEvent) => void) | null } }).ws

      const handler1 = vi.fn()
      const handler2 = vi.fn()
      client.on('broadcast', handler1)
      client.on('broadcast', handler2)

      ws.onmessage?.({
        data: JSON.stringify({ type: 'broadcast', payload: { text: 'hi' } }),
      } as MessageEvent)
      expect(handler1).toHaveBeenCalledWith({ text: 'hi' })
      expect(handler2).toHaveBeenCalledWith({ text: 'hi' })
    })

    it('should return unsubscribe function that removes handler', async () => {
      const { WSClientImpl } = await getModule()
      const client = new WSClientImpl<TestProtocol>('ws://localhost')
      const ws = (client as unknown as { ws: { onmessage: ((e: MessageEvent) => void) | null } }).ws

      const handler = vi.fn()
      const unsub = client.on('broadcast', handler)
      unsub()

      ws.onmessage?.({
        data: JSON.stringify({ type: 'broadcast', payload: { text: 'hello' } }),
      } as MessageEvent)
      expect(handler).not.toHaveBeenCalled()
    })

    it('should not call handlers for different event types', async () => {
      const { WSClientImpl } = await getModule()
      const client = new WSClientImpl<TestProtocol>('ws://localhost')
      const ws = (client as unknown as { ws: { onmessage: ((e: MessageEvent) => void) | null } }).ws

      const handler = vi.fn()
      client.on('broadcast', handler)

      ws.onmessage?.({
        data: JSON.stringify({ type: 'notification', payload: { title: 'test' } }),
      } as MessageEvent)
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('emit()', () => {
    it('should send typed event when socket is open', async () => {
      const { WSClientImpl } = await getModule()
      const client = new WSClientImpl<TestProtocol>('ws://localhost')
      const ws = (
        client as unknown as {
          ws: { send: (d: string) => void; onopen: ((e: Event) => void) | null; readyState: number }
        }
      ).ws
      const sendSpy = vi.spyOn(ws, 'send')

      ws.readyState = 1
      ws.onopen?.(new Event('open'))

      client.emit('broadcast', { text: 'hello world' })
      expect(sendSpy).toHaveBeenCalledTimes(1)
      const sent = JSON.parse(sendSpy.mock.calls[0][0] as string)
      expect(sent).toEqual({ type: 'broadcast', payload: { text: 'hello world' } })
    })

    it('should buffer event when socket is not open', async () => {
      const { WSClientImpl } = await getModule()
      const client = new WSClientImpl<TestProtocol>('ws://localhost')
      const ws = (
        client as unknown as {
          ws: { send: (d: string) => void; onopen: ((e: Event) => void) | null; readyState: number }
        }
      ).ws
      const sendSpy = vi.spyOn(ws, 'send')

      client.emit('broadcast', { text: 'buffered' })
      expect(sendSpy).not.toHaveBeenCalled()

      ws.readyState = 1
      ws.onopen?.(new Event('open'))
      expect(sendSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('onStatusChange()', () => {
    it('should call handler on status transitions', async () => {
      const { WSClientImpl } = await getModule()
      const client = new WSClientImpl<TestProtocol>('ws://localhost')
      const ws = (
        client as unknown as {
          ws: {
            onopen: ((e: Event) => void) | null
            onclose: ((e: CloseEvent) => void) | null
            readyState: number
          }
        }
      ).ws

      const handler = vi.fn()
      client.onStatusChange(handler)

      ws.readyState = 1
      ws.onopen?.(new Event('open'))
      expect(handler).toHaveBeenCalledWith('open')

      ws.readyState = 3
      ws.onclose?.(new Event('close') as CloseEvent)
      expect(handler).toHaveBeenCalledWith('closed')
    })

    it('should return unsubscribe function', async () => {
      const { WSClientImpl } = await getModule()
      const client = new WSClientImpl<TestProtocol>('ws://localhost')
      const ws = (
        client as unknown as { ws: { onopen: ((e: Event) => void) | null; readyState: number } }
      ).ws

      const handler = vi.fn()
      const unsub = client.onStatusChange(handler)
      unsub()

      ws.readyState = 1
      ws.onopen?.(new Event('open'))
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('close()', () => {
    it('should close the underlying socket', async () => {
      const { WSClientImpl } = await getModule()
      const client = new WSClientImpl<TestProtocol>('ws://localhost')
      const ws = (client as unknown as { ws: { close: () => void } }).ws
      const closeSpy = vi.spyOn(ws, 'close')

      client.close()
      expect(closeSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('handleMessage edge cases', () => {
    it('should ignore messages without id or type', async () => {
      const { WSClientImpl } = await getModule()
      const client = new WSClientImpl<TestProtocol>('ws://localhost')
      const ws = (client as unknown as { ws: { onmessage: ((e: MessageEvent) => void) | null } }).ws

      const handler = vi.fn()
      client.on('broadcast', handler)

      ws.onmessage?.({ data: JSON.stringify({ method: 'test', payload: 'data' }) } as MessageEvent)
      expect(handler).not.toHaveBeenCalled()
    })

    it('should ignore unknown RPC response ids', async () => {
      const { WSClientImpl } = await getModule()
      const client = new WSClientImpl<TestProtocol>('ws://localhost')
      const ws = (client as unknown as { ws: { onmessage: ((e: MessageEvent) => void) | null } }).ws

      ws.onmessage?.({ data: JSON.stringify({ id: 'unknown-id', result: 'data' }) } as MessageEvent)
    })

    it('should handle invalid JSON gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { WSClientImpl } = await getModule()
      const client = new WSClientImpl<TestProtocol>('ws://localhost')
      const ws = (client as unknown as { ws: { onmessage: ((e: MessageEvent) => void) | null } }).ws

      ws.onmessage?.({ data: 'not-json' } as MessageEvent)
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})

describe('createWSClient', () => {
  it('should create a WSClient instance', async () => {
    const { createWSClient } = await getModule()
    const client = createWSClient<TestProtocol>('ws://localhost')
    expect(client).toBeDefined()
    expect(client.status).toBe('connecting')
  })
})
