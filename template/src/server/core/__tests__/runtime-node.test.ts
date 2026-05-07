/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NodeRuntimeAdapter } from '../runtime-node'
import type { WebSocket } from 'ws'

function createMockWebSocket(): WebSocket {
  const listeners: Record<string, Function[]> = {}
  return {
    readyState: 1,
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn((event: string, handler: Function) => {
      if (!listeners[event]) listeners[event] = []
      listeners[event].push(handler)
    }),
    _listeners: listeners,
    _trigger: (event: string, data: unknown) => {
      const handlers = listeners[event] || []
      handlers.forEach(h => h(data))
    },
  } as unknown as WebSocket & { _listeners: Record<string, Function[]>; _trigger: (event: string, data: unknown) => void }
}

describe('NodeRuntimeAdapter', () => {
  let adapter: NodeRuntimeAdapter

  beforeEach(() => {
    adapter = new NodeRuntimeAdapter()
  })

  describe('platform', () => {
    it('should report node platform', () => {
      expect(adapter.platform.name).toBe('node')
      expect(adapter.platform.isNode).toBe(true)
      expect(adapter.platform.isCloudflare).toBe(false)
    })
  })

  describe('handleWS / hasWSPath', () => {
    it('should register and check WS paths', () => {
      adapter.handleWS('/api/chat/ws')
      expect(adapter.hasWSPath('/api/chat/ws')).toBe(true)
      expect(adapter.hasWSPath('/api/other')).toBe(false)
    })
  })

  describe('handleSSE / hasSSEPath', () => {
    it('should register and check SSE paths', () => {
      adapter.handleSSE('/api/notifications/stream')
      expect(adapter.hasSSEPath('/api/notifications/stream')).toBe(true)
      expect(adapter.hasSSEPath('/api/other')).toBe(false)
    })
  })

  describe('broadcast', () => {
    it('should broadcast via core to WS and SSE clients', () => {
      const ws = createMockWebSocket()
      adapter.handleConnection(ws)

      adapter.handleSSERequest()

      adapter.broadcast('notification', { msg: 'hello' })

      expect(ws.send).toHaveBeenCalled()
    })

    it('should broadcast with exclusion', () => {
      const ws = createMockWebSocket()
      const _conn = adapter.handleConnection(ws)

      adapter.broadcast('notification', { msg: 'hello' }, [_conn.id])

      const wsSendCalls = (ws.send as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call: unknown[]) => {
          try {
            const data = JSON.parse(call[0] as string)
            return data.type === 'notification'
          } catch {
            return false
          }
        }
      )
      expect(wsSendCalls.length).toBe(0)
    })
  })

  describe('registerRPC', () => {
    it('should register RPC handler and process messages', () => {
      const ws = createMockWebSocket()
      adapter.handleConnection(ws)

      adapter.registerRPC('echo', (params) => ({ echo: params }))

      ;(ws as any)._trigger('message', Buffer.from(JSON.stringify({
        method: 'echo',
        id: '1',
        params: { text: 'hi' },
      })))

      const calls = (ws.send as ReturnType<typeof vi.fn>).mock.calls
      const rpcResponse = calls.find((call: unknown[]) => {
        try {
          const data = JSON.parse(call[0] as string)
          return data.id === '1' && data.result
        } catch {
          return false
        }
      })
      expect(rpcResponse).toBeDefined()
      const parsed = JSON.parse((rpcResponse as unknown[])[0] as string)
      expect(parsed.result).toEqual({ echo: { text: 'hi' } })
    })
  })

  describe('registerEvent', () => {
    it('should register event handler', () => {
      const handler = vi.fn()
      adapter.registerEvent('chat', handler)

      const ws = createMockWebSocket()
      adapter.handleConnection(ws)

      ;(ws as any)._trigger('message', Buffer.from(JSON.stringify({
        type: 'chat',
        payload: { text: 'hello' },
      })))

      expect(handler).toHaveBeenCalled()
    })
  })

  describe('handleConnection', () => {
    it('should create a connection and send connected event', () => {
      const ws = createMockWebSocket()
      const conn = adapter.handleConnection(ws)

      expect(conn.id).toBeDefined()
      expect(typeof conn.id).toBe('string')
      expect(adapter.connections.has(conn.id)).toBe(true)
      expect(adapter.size).toBe(1)

      expect(ws.send).toHaveBeenCalledWith(
        expect.stringContaining('connected')
      )
    })

    it('should parse incoming messages and dispatch to core', () => {
      const ws = createMockWebSocket()
      adapter.handleConnection(ws)

      adapter.registerRPC('ping', () => ({ pong: true }))

      ;(ws as any)._trigger('message', Buffer.from(JSON.stringify({
        method: 'ping',
        id: '10',
        params: {},
      })))

      const calls = (ws.send as ReturnType<typeof vi.fn>).mock.calls
      const rpcResponse = calls.find((call: unknown[]) => {
        try {
          const data = JSON.parse(call[0] as string)
          return data.id === '10'
        } catch {
          return false
        }
      })
      expect(rpcResponse).toBeDefined()
    })

    it('should ignore invalid JSON messages', () => {
      const ws = createMockWebSocket()
      adapter.handleConnection(ws)

      const sendCallsBefore = (ws.send as ReturnType<typeof vi.fn>).mock.calls.length

      ;(ws as any)._trigger('message', Buffer.from('not json'))

      const sendCallsAfter = (ws.send as ReturnType<typeof vi.fn>).mock.calls.length
      expect(sendCallsAfter).toBe(sendCallsBefore)
    })

    it('should remove connection on close', () => {
      const ws = createMockWebSocket()
      const conn = adapter.handleConnection(ws)

      expect(adapter.connections.has(conn.id)).toBe(true)

      ;(ws as any)._trigger('close', null)

      expect(adapter.connections.has(conn.id)).toBe(false)
      expect(adapter.size).toBe(0)
    })
  })

  describe('getWSConnections', () => {
    it('should return all WS connections', () => {
      const ws1 = createMockWebSocket()
      const ws2 = createMockWebSocket()
      const conn1 = adapter.handleConnection(ws1)
      const conn2 = adapter.handleConnection(ws2)

      const connections = adapter.getWSConnections()
      expect(connections.has(conn1.id)).toBe(true)
      expect(connections.has(conn2.id)).toBe(true)
    })
  })

  describe('getSSEConnections', () => {
    it('should return SSE connections from core', () => {
      const connections = adapter.getSSEConnections()
      expect(connections).toBeInstanceOf(Map)
    })
  })

  describe('handleSSERequest', () => {
    it('should return a Response with SSE headers', () => {
      const response = adapter.handleSSERequest()

      expect(response).toBeInstanceOf(Response)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('Connection')).toBe('keep-alive')
    })

    it('should register an SSE client', () => {
      adapter.handleSSERequest()

      expect(adapter.getSSEConnections().size).toBe(1)
    })

    it('should send connected event via stream', async () => {
      const response = adapter.handleSSERequest()
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()

      const { value } = await reader.read()
      const text = decoder.decode(value)

      expect(text).toContain('event: connected')
      expect(text).toContain('"timestamp"')

      reader.releaseLock()
    })

    it('should remove SSE client when stream is cancelled', async () => {
      const response = adapter.handleSSERequest()

      expect(adapter.getSSEConnections().size).toBe(1)

      await response.body!.cancel()

      expect(adapter.getSSEConnections().size).toBe(0)
    })

    it('should handle multiple SSE connections', () => {
      adapter.handleSSERequest()
      adapter.handleSSERequest()
      adapter.handleSSERequest()

      expect(adapter.getSSEConnections().size).toBe(3)
    })
  })

  describe('NodeWSConnection', () => {
    it('should not send when readyState is not OPEN', () => {
      const ws = createMockWebSocket()
      ;(ws as any).readyState = 0

      const conn = adapter.handleConnection(ws)

      const sendCallsBefore = (ws.send as ReturnType<typeof vi.fn>).mock.calls.length
      conn.send({ type: 'test' })

      expect(ws.send).toHaveBeenCalledTimes(sendCallsBefore)
    })

    it('should close the underlying WebSocket', () => {
      const ws = createMockWebSocket()
      const conn = adapter.handleConnection(ws)

      conn.close()

      expect(ws.close).toHaveBeenCalled()
    })
  })
})

describe('getNodeRuntimeAdapter', () => {
  afterEach(() => {
    vi.resetModules()
  })

  it('should return the same instance on multiple calls', async () => {
    const mod = await import('../runtime-node')
    const a = mod.getNodeRuntimeAdapter()
    const b = mod.getNodeRuntimeAdapter()
    expect(a).toBe(b)
  })
})
