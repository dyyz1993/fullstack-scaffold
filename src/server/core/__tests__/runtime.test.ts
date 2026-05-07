/**
 * @framework-baseline 6115ae817b702e1a
 */

/**
 * @vitest-environment node
 *
 * Tests for runtime.ts module state management.
 * Uses dynamic imports to get fresh module state per test.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { RuntimeAdapter } from '../runtime'

function createMockAdapter(): RuntimeAdapter {
  return {
    platform: { name: 'node', isNode: true, isCloudflare: false },
    handleWS: vi.fn(),
    hasWSPath: vi.fn(),
    getWSConnections: vi.fn().mockReturnValue(new Map()),
    handleSSE: vi.fn(),
    hasSSEPath: vi.fn(),
    getSSEConnections: vi.fn().mockReturnValue(new Map()),
    broadcast: vi.fn(),
    registerRPC: vi.fn(),
    registerEvent: vi.fn(),
  }
}

describe('runtime module', () => {
  beforeEach(() => {
    globalThis.__runtimeAdapter = undefined
  })

  afterEach(() => {
    globalThis.__runtimeAdapter = undefined
  })

  describe('getRuntimeAdapter', () => {
    it('should throw if adapter not set and no global', async () => {
      vi.resetModules()
      const { getRuntimeAdapter } = await import('../runtime')
      expect(() => getRuntimeAdapter()).toThrow('Runtime adapter not initialized')
    })

    it('should return adapter after setRuntimeAdapter', async () => {
      vi.resetModules()
      const { setRuntimeAdapter, getRuntimeAdapter } = await import('../runtime')
      const adapter = createMockAdapter()
      setRuntimeAdapter(adapter)
      expect(getRuntimeAdapter()).toBe(adapter)
    })

    it('should return globalThis adapter if set', async () => {
      vi.resetModules()
      const { getRuntimeAdapter } = await import('../runtime')
      const adapter = createMockAdapter()
      globalThis.__runtimeAdapter = adapter
      expect(getRuntimeAdapter()).toBe(adapter)
    })
  })

  describe('setRuntimeAdapter', () => {
    it('should set globalThis.__runtimeAdapter', async () => {
      vi.resetModules()
      const { setRuntimeAdapter } = await import('../runtime')
      const adapter = createMockAdapter()
      setRuntimeAdapter(adapter)
      expect(globalThis.__runtimeAdapter).toBe(adapter)
    })

    it('should not overwrite existing adapter', async () => {
      vi.resetModules()
      const { setRuntimeAdapter } = await import('../runtime')
      const adapter1 = createMockAdapter()
      setRuntimeAdapter(adapter1)
      const adapter2 = createMockAdapter()
      setRuntimeAdapter(adapter2)
      expect(globalThis.__runtimeAdapter).toBe(adapter1)
    })

    it('should not overwrite globalThis adapter', async () => {
      vi.resetModules()
      const adapter1 = createMockAdapter()
      globalThis.__runtimeAdapter = adapter1
      const { setRuntimeAdapter } = await import('../runtime')
      const adapter2 = createMockAdapter()
      setRuntimeAdapter(adapter2)
      expect(globalThis.__runtimeAdapter).toBe(adapter1)
    })
  })

  describe('pending registrations', () => {
    it('should flush pending RPC registrations on setRuntimeAdapter', async () => {
      vi.resetModules()
      const mod = await import('../runtime')
      const rpcHandler = vi.fn()
      mod.runtime.registerRPC('testMethod', rpcHandler)

      const adapter = createMockAdapter()
      mod.setRuntimeAdapter(adapter)

      expect(adapter.registerRPC).toHaveBeenCalledWith('testMethod', rpcHandler)
    })

    it('should flush pending event registrations on setRuntimeAdapter', async () => {
      vi.resetModules()
      const mod = await import('../runtime')
      const eventHandler = vi.fn()
      mod.runtime.registerEvent('testEvent', eventHandler)

      const adapter = createMockAdapter()
      mod.setRuntimeAdapter(adapter)

      expect(adapter.registerEvent).toHaveBeenCalledWith('testEvent', eventHandler)
    })

    it('should flush mixed pending registrations', async () => {
      vi.resetModules()
      const mod = await import('../runtime')
      const rpcHandler = vi.fn()
      const eventHandler = vi.fn()

      mod.runtime.registerRPC('method1', rpcHandler)
      mod.runtime.registerEvent('event1', eventHandler)

      const adapter = createMockAdapter()
      mod.setRuntimeAdapter(adapter)

      expect(adapter.registerRPC).toHaveBeenCalledWith('method1', rpcHandler)
      expect(adapter.registerEvent).toHaveBeenCalledWith('event1', eventHandler)
    })
  })

  describe('runtime object', () => {
    it('should proxy adapter property', async () => {
      vi.resetModules()
      const mod = await import('../runtime')
      const adapter = createMockAdapter()
      mod.setRuntimeAdapter(adapter)
      expect(mod.runtime.adapter).toBe(adapter)
    })

    it('should proxy handleWS', async () => {
      vi.resetModules()
      const mod = await import('../runtime')
      const adapter = createMockAdapter()
      mod.setRuntimeAdapter(adapter)
      mod.runtime.handleWS('/api/test')
      expect(adapter.handleWS).toHaveBeenCalledWith('/api/test')
    })

    it('should proxy handleSSE', async () => {
      vi.resetModules()
      const mod = await import('../runtime')
      const adapter = createMockAdapter()
      mod.setRuntimeAdapter(adapter)
      mod.runtime.handleSSE('/api/sse')
      expect(adapter.handleSSE).toHaveBeenCalledWith('/api/sse')
    })

    it('should proxy broadcast', async () => {
      vi.resetModules()
      const mod = await import('../runtime')
      const adapter = createMockAdapter()
      mod.setRuntimeAdapter(adapter)
      mod.runtime.broadcast('event', { data: 'test' })
      expect(adapter.broadcast).toHaveBeenCalledWith('event', { data: 'test' }, [])
    })

    it('should proxy broadcast with exclude', async () => {
      vi.resetModules()
      const mod = await import('../runtime')
      const adapter = createMockAdapter()
      mod.setRuntimeAdapter(adapter)
      mod.runtime.broadcast('event', { data: 'test' }, ['client1'])
      expect(adapter.broadcast).toHaveBeenCalledWith('event', { data: 'test' }, ['client1'])
    })

    it('should proxy registerRPC when adapter is set', async () => {
      vi.resetModules()
      const mod = await import('../runtime')
      const adapter = createMockAdapter()
      mod.setRuntimeAdapter(adapter)
      const handler = vi.fn()
      mod.runtime.registerRPC('method', handler)
      expect(adapter.registerRPC).toHaveBeenCalledWith('method', handler)
    })

    it('should proxy registerEvent when adapter is set', async () => {
      vi.resetModules()
      const mod = await import('../runtime')
      const adapter = createMockAdapter()
      mod.setRuntimeAdapter(adapter)
      const handler = vi.fn()
      mod.runtime.registerEvent('event-type', handler)
      expect(adapter.registerEvent).toHaveBeenCalledWith('event-type', handler)
    })

    it('should proxy platform', async () => {
      vi.resetModules()
      const mod = await import('../runtime')
      const adapter = createMockAdapter()
      mod.setRuntimeAdapter(adapter)
      expect(mod.runtime.platform).toBe(adapter.platform)
    })
  })

  describe('RuntimeAdapter with NodeRuntimeAdapter', () => {
    it('should work end-to-end', async () => {
      vi.resetModules()
      const { setRuntimeAdapter, getRuntimeAdapter } = await import('../runtime')
      const { NodeRuntimeAdapter } = await import('../runtime-node')
      const adapter = new NodeRuntimeAdapter()
      setRuntimeAdapter(adapter)
      expect(getRuntimeAdapter()).toBe(adapter)
      expect(getRuntimeAdapter().platform.name).toBe('node')
    })
  })
})
