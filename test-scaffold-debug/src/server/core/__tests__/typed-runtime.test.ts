/**
 * @framework-modify
 * @reason Added error scenario tests to satisfy 2-assertion test quality rule
 * @impact Added test cases only, no production code changes
 * @framework-baseline 991b28d7df0b36dc
 */

/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { TypedRuntime } from '../typed-runtime'

interface TestProtocol {
  rpc: {
    echo: { in: { message: string }; out: { message: string; timestamp: number } }
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    ping: { in: {}; out: { pong: boolean } }
  }
  events: {
    notification: { text: string }
    broadcast: { msg: string }
  }
}

type MockWSListener = (data: unknown) => void

function createTriggerableWS() {
  const listeners: Record<string, MockWSListener[]> = {}
  return {
    readyState: 1 as number,
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn((event: string, handler: MockWSListener) => {
      if (!listeners[event]) listeners[event] = []
      listeners[event].push(handler)
    }),
    _trigger: (event: string, data: unknown) => {
      ;(listeners[event] || []).forEach(h => h(data))
    },
  }
}

describe('createTypedRuntime', () => {
  let typed: TypedRuntime<TestProtocol>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let getAdapter: () => any

  beforeEach(async () => {
    vi.resetModules()
    globalThis.__runtimeAdapter = undefined

    const { setRuntimeAdapter } = await import('../runtime')
    const { NodeRuntimeAdapter } = await import('../runtime-node')
    const adapter = new NodeRuntimeAdapter()
    setRuntimeAdapter(adapter)

    const { createTypedRuntime } = await import('../typed-runtime')
    typed = createTypedRuntime<TestProtocol>('/api/test')
    getAdapter = () => adapter
  })

  afterEach(() => {
    globalThis.__runtimeAdapter = undefined
  })

  it('should expose path', () => {
    expect(typed.path).toBe('/api/test')
  })

  it('should expose adapter', () => {
    expect(typed.adapter).toBeDefined()
    expect(typed.adapter.platform.name).toBe('node')
  })

  it('should register and invoke RPC handler', async () => {
    const handler = vi.fn().mockReturnValue({ message: 'echo', timestamp: 123 })
    typed.registerRPC('echo', handler)

    const ws = createTriggerableWS()
    getAdapter().handleConnection(ws)

    ws._trigger(
      'message',
      Buffer.from(
        JSON.stringify({
          method: 'echo',
          id: '1',
          params: { message: 'hello' },
        })
      )
    )

    expect(handler).toHaveBeenCalledWith({ message: 'hello' }, expect.any(String))

    const calls = ws.send.mock.calls
    const rpcResponse = calls.find((call: unknown[]) => {
      try {
        return JSON.parse(call[0] as string).id === '1'
      } catch {
        return false
      }
    })
    expect(rpcResponse).toBeDefined()
    expect(JSON.parse((rpcResponse as unknown[])[0] as string).result).toEqual({
      message: 'echo',
      timestamp: 123,
    })
  })

  it('should register and invoke event handler', async () => {
    const handler = vi.fn()
    typed.registerEvent('notification', handler)

    const ws = createTriggerableWS()
    getAdapter().handleConnection(ws)

    ws._trigger(
      'message',
      Buffer.from(
        JSON.stringify({
          type: 'notification',
          payload: { text: 'hello' },
        })
      )
    )

    expect(handler).toHaveBeenCalledWith({ text: 'hello' }, expect.any(String))
  })

  it('should broadcast via runtime adapter', () => {
    const spy = vi.spyOn(getAdapter(), 'broadcast')
    typed.broadcast('notification', { text: 'test' })
    expect(spy).toHaveBeenCalledWith('notification', { text: 'test' }, [])
  })

  it('should broadcast with exclusion list', () => {
    const spy = vi.spyOn(getAdapter(), 'broadcast')
    typed.broadcast('broadcast', { msg: 'hi' }, ['client1'])
    expect(spy).toHaveBeenCalledWith('broadcast', { msg: 'hi' }, ['client1'])
  })

  it('should handle missing RPC handler gracefully', async () => {
    const ws = createTriggerableWS()
    getAdapter().handleConnection(ws)

    ws._trigger(
      'message',
      Buffer.from(
        JSON.stringify({
          method: 'nonexistent',
          id: '99',
          params: {},
        })
      )
    )

    const calls = ws.send.mock.calls
    const rpcResponse = calls.find((call: unknown[]) => {
      try {
        return JSON.parse(call[0] as string).id === '99'
      } catch {
        return false
      }
    })
    expect(rpcResponse).toBeDefined()
    const parsed = JSON.parse((rpcResponse as unknown[])[0] as string)
    expect(parsed.error).toBeDefined()
  })

  it('should return undefined for unregistered event', async () => {
    const result = typed.broadcast(
      'nonexistent' as keyof TestProtocol['events'],
      { text: 'test' } as TestProtocol['events']['notification']
    )
    expect(result).toBeUndefined()
  })
})
