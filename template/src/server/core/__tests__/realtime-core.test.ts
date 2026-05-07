/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRealtimeCore, createWSMessageHandler } from '../realtime-core'
import type { RealtimeCore, RPCHandler } from '../realtime-core'
import type { WSConnection, SSEConnection } from '../runtime'

function createMockWS(id: string): WSConnection {
  return {
    id,
    send: vi.fn(),
    close: vi.fn(),
  }
}

function createMockSSE(id: string): SSEConnection {
  return {
    id,
    send: vi.fn(),
  }
}

describe('createRealtimeCore', () => {
  let core: RealtimeCore

  beforeEach(() => {
    core = createRealtimeCore()
  })

  describe('broadcast', () => {
    it('should broadcast to all WS clients', () => {
      const ws1 = createMockWS('ws1')
      const ws2 = createMockWS('ws2')
      core.wsClients.set('ws1', ws1)
      core.wsClients.set('ws2', ws2)

      core.broadcast({ message: 'hello' }, [], 'notification')

      expect(ws1.send).toHaveBeenCalledWith({
        type: 'notification',
        payload: { message: 'hello' },
      })
      expect(ws2.send).toHaveBeenCalledWith({
        type: 'notification',
        payload: { message: 'hello' },
      })
    })

    it('should broadcast to all SSE clients', () => {
      const sse1 = createMockSSE('sse1')
      const sse2 = createMockSSE('sse2')
      core.sseClients.set('sse1', sse1)
      core.sseClients.set('sse2', sse2)

      core.broadcast({ message: 'hello' }, [], 'notification')

      expect(sse1.send).toHaveBeenCalledWith(
        'event: notification\ndata: {"message":"hello"}\n\n'
      )
      expect(sse2.send).toHaveBeenCalledWith(
        'event: notification\ndata: {"message":"hello"}\n\n'
      )
    })

    it('should exclude specified client IDs', () => {
      const ws1 = createMockWS('ws1')
      const ws2 = createMockWS('ws2')
      core.wsClients.set('ws1', ws1)
      core.wsClients.set('ws2', ws2)

      core.broadcast({ message: 'hello' }, ['ws1'], 'notification')

      expect(ws1.send).not.toHaveBeenCalled()
      expect(ws2.send).toHaveBeenCalled()
    })

    it('should exclude SSE clients by ID', () => {
      const sse1 = createMockSSE('sse1')
      const sse2 = createMockSSE('sse2')
      core.sseClients.set('sse1', sse1)
      core.sseClients.set('sse2', sse2)

      core.broadcast({ msg: 'test' }, ['sse1'])

      expect(sse1.send).not.toHaveBeenCalled()
      expect(sse2.send).toHaveBeenCalled()
    })

    it('should use default event name "notification"', () => {
      const sse = createMockSSE('sse1')
      core.sseClients.set('sse1', sse)

      core.broadcast({ msg: 'test' })

      expect(sse.send).toHaveBeenCalledWith(
        'event: notification\ndata: {"msg":"test"}\n\n'
      )
    })

    it('should remove WS clients that throw on send', () => {
      const ws = createMockWS('ws1')
      ws.send = vi.fn().mockImplementation(() => {
        throw new Error('Connection closed')
      })
      core.wsClients.set('ws1', ws)

      core.broadcast({ msg: 'test' })

      expect(core.wsClients.has('ws1')).toBe(false)
    })

    it('should remove SSE clients that throw on send', () => {
      const sse = createMockSSE('sse1')
      sse.send = vi.fn().mockImplementation(() => {
        throw new Error('Stream closed')
      })
      core.sseClients.set('sse1', sse)

      core.broadcast({ msg: 'test' })

      expect(core.sseClients.has('sse1')).toBe(false)
    })

    it('should broadcast to both WS and SSE clients simultaneously', () => {
      const ws = createMockWS('ws1')
      const sse = createMockSSE('sse1')
      core.wsClients.set('ws1', ws)
      core.sseClients.set('sse1', sse)

      core.broadcast({ msg: 'both' }, [], 'test-event')

      expect(ws.send).toHaveBeenCalledWith({ type: 'test-event', payload: { msg: 'both' } })
      expect(sse.send).toHaveBeenCalledWith('event: test-event\ndata: {"msg":"both"}\n\n')
    })
  })

  describe('handleWSMessage', () => {
    it('should handle RPC messages with registered handler', () => {
      const ws = createMockWS('ws1')
      core.wsClients.set('ws1', ws)

      const handler = vi.fn().mockReturnValue({ result: 'ok' })
      core.registerRPCHandler('echo', handler)

      core.handleWSMessage('ws1', { method: 'echo', id: '1', params: { message: 'hi' } })

      expect(handler).toHaveBeenCalledWith({ message: 'hi' }, 'ws1')
      expect(ws.send).toHaveBeenCalledWith({ id: '1', result: { result: 'ok' } })
    })

    it('should handle RPC with unknown method', () => {
      const ws = createMockWS('ws1')
      core.wsClients.set('ws1', ws)

      core.handleWSMessage('ws1', { method: 'unknown', id: '2', params: {} })

      expect(ws.send).toHaveBeenCalledWith({ id: '2', error: 'Unknown method: unknown' })
    })

    it('should handle RPC handler throwing', () => {
      const ws = createMockWS('ws1')
      core.wsClients.set('ws1', ws)

      core.registerRPCHandler('fail', () => {
        throw new Error('handler failed')
      })

      core.handleWSMessage('ws1', { method: 'fail', id: '3', params: {} })

      expect(ws.send).toHaveBeenCalledWith({ id: '3', error: 'handler failed' })
    })

    it('should handle RPC handler throwing non-Error', () => {
      const ws = createMockWS('ws1')
      core.wsClients.set('ws1', ws)

      core.registerRPCHandler('fail', () => {
        throw 'string error'
      })

      core.handleWSMessage('ws1', { method: 'fail', id: '4', params: {} })

      expect(ws.send).toHaveBeenCalledWith({ id: '4', error: 'Unknown error' })
    })

    it('should ignore messages for unknown clients', () => {
      const handler = vi.fn()
      core.registerRPCHandler('echo', handler)

      core.handleWSMessage('unknown', { method: 'echo', id: '1', params: {} })

      expect(handler).not.toHaveBeenCalled()
    })

    it('should handle event messages', () => {
      const ws = createMockWS('ws1')
      core.wsClients.set('ws1', ws)

      const handler = vi.fn()
      core.registerEventHandler('broadcast', handler)

      core.handleWSMessage('ws1', { type: 'broadcast', payload: { msg: 'hello' } })

      expect(handler).toHaveBeenCalledWith(
        { msg: 'hello' },
        'ws1',
        expect.any(Function)
      )
    })

    it('should ignore event messages without registered handler', () => {
      const ws = createMockWS('ws1')
      core.wsClients.set('ws1', ws)

      expect(() =>
        core.handleWSMessage('ws1', { type: 'unknown-event', payload: {} })
      ).not.toThrow()
    })

    it('should ignore non-object messages', () => {
      expect(() => core.handleWSMessage('ws1', 'string')).not.toThrow()
      expect(() => core.handleWSMessage('ws1', null)).not.toThrow()
      expect(() => core.handleWSMessage('ws1', 42)).not.toThrow()
    })

    it('should ignore objects without method/id or type', () => {
      const ws = createMockWS('ws1')
      core.wsClients.set('ws1', ws)

      core.handleWSMessage('ws1', { foo: 'bar' })

      expect(ws.send).not.toHaveBeenCalled()
    })
  })

  describe('registerRPCHandler', () => {
    it('should register and invoke RPC handler', () => {
      const ws = createMockWS('ws1')
      core.wsClients.set('ws1', ws)

      core.registerRPCHandler('ping', () => ({ pong: true }))

      core.handleWSMessage('ws1', { method: 'ping', id: '1', params: {} })

      expect(ws.send).toHaveBeenCalledWith({ id: '1', result: { pong: true } })
    })

    it('should overwrite existing handler', () => {
      const ws = createMockWS('ws1')
      core.wsClients.set('ws1', ws)

      core.registerRPCHandler('echo', () => 'first')
      core.registerRPCHandler('echo', () => 'second')

      core.handleWSMessage('ws1', { method: 'echo', id: '1', params: {} })

      expect(ws.send).toHaveBeenCalledWith({ id: '1', result: 'second' })
    })
  })

  describe('registerEventHandler', () => {
    it('should register and invoke event handler', () => {
      const ws = createMockWS('ws1')
      core.wsClients.set('ws1', ws)

      const handler = vi.fn()
      core.registerEventHandler('chat', handler)

      core.handleWSMessage('ws1', { type: 'chat', payload: { text: 'hi' } })

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should pass broadcast function to event handler', () => {
      const ws = createMockWS('ws1')
      core.wsClients.set('ws1', ws)

      const handler = vi.fn()
      core.registerEventHandler('chat', handler)

      core.handleWSMessage('ws1', { type: 'chat', payload: {} })

      expect(handler).toHaveBeenCalledWith(
        {},
        'ws1',
        expect.any(Function)
      )

      const broadcastFn = handler.mock.calls[0][2]
      expect(typeof broadcastFn).toBe('function')
    })
  })
})

describe('createWSMessageHandler', () => {
  const broadcastFn = vi.fn()
  const handler = createWSMessageHandler(broadcastFn)

  beforeEach(() => {
    broadcastFn.mockClear()
  })

  it('should handle RPC messages with default handleRpc', () => {
    const send = vi.fn()
    handler.handleMessage('client1', { method: 'test', id: '1', params: {} }, send)

    expect(send).toHaveBeenCalledWith({
      id: '1',
      error: 'Unknown method: test',
    })
  })

  it('should handle broadcast event messages', () => {
    handler.handleMessage('client1', { type: 'broadcast', payload: { msg: 'hi' } }, vi.fn())

    expect(broadcastFn).toHaveBeenCalledWith({ msg: 'hi' }, ['client1'], 'broadcast')
  })

  it('should ignore unknown event types', () => {
    handler.handleMessage('client1', { type: 'unknown' }, vi.fn())
    expect(broadcastFn).not.toHaveBeenCalled()
  })

  it('should ignore non-object messages', () => {
    const send = vi.fn()
    handler.handleMessage('client1', 'string', send)
    handler.handleMessage('client1', null, send)
    handler.handleMessage('client1', 42, send)

    expect(send).not.toHaveBeenCalled()
    expect(broadcastFn).not.toHaveBeenCalled()
  })

  it('should return error for unknown RPC method via handleRpc', () => {
    const result = handler.handleRpc({ id: '1', method: 'nonexistent', params: {} })
    expect(result).toEqual({ id: '1', error: 'Unknown method: nonexistent' })
  })
})
