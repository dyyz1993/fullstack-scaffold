/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('autoRegisterRealtime', () => {
  let mockHandleWS: ReturnType<typeof vi.fn>
  let mockHandleSSE: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    mockHandleWS = vi.fn()
    mockHandleSSE = vi.fn()

    vi.doMock('../runtime', () => ({
      getRuntimeAdapter: () => ({
        handleWS: mockHandleWS,
        handleSSE: mockHandleSSE,
      }),
    }))
  })

  function makeApp(paths: Record<string, unknown>) {
    return {
      getOpenAPIDocument: vi.fn().mockReturnValue({
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        paths,
      }),
    }
  }

  it('should register WebSocket routes', async () => {
    const { autoRegisterRealtime: scanner } = await import('../realtime-scanner')
    const app = makeApp({
      '/api/chat/ws': {
        get: {
          responses: {
            '200': { content: { websocket: { schema: {} } } },
          },
        },
      },
    })
    scanner(app)
    expect(mockHandleWS).toHaveBeenCalledWith('/api/chat/ws')
  })

  it('should register SSE routes', async () => {
    const { autoRegisterRealtime: scanner } = await import('../realtime-scanner')
    const app = makeApp({
      '/api/notifications/stream': {
        get: {
          responses: {
            '200': { content: { 'text/event-stream': { schema: {} } } },
          },
        },
      },
    })
    scanner(app)
    expect(mockHandleSSE).toHaveBeenCalledWith('/api/notifications/stream')
  })

  it('should register both WS and SSE routes', async () => {
    const { autoRegisterRealtime: scanner } = await import('../realtime-scanner')
    const app = makeApp({
      '/api/chat/ws': {
        get: {
          responses: { '200': { content: { websocket: { schema: {} } } } },
        },
      },
      '/api/notifications/stream': {
        get: {
          responses: { '200': { content: { 'text/event-stream': { schema: {} } } } },
        },
      },
    })
    scanner(app)
    expect(mockHandleWS).toHaveBeenCalledWith('/api/chat/ws')
    expect(mockHandleSSE).toHaveBeenCalledWith('/api/notifications/stream')
  })

  it('should ignore non-realtime routes', async () => {
    const { autoRegisterRealtime: scanner } = await import('../realtime-scanner')
    const app = makeApp({
      '/api/todos': {
        get: {
          responses: { '200': { content: { 'application/json': { schema: {} } } } },
        },
      },
    })
    scanner(app)
    expect(mockHandleWS).not.toHaveBeenCalled()
    expect(mockHandleSSE).not.toHaveBeenCalled()
  })

  it('should ignore routes without content', async () => {
    const { autoRegisterRealtime: scanner } = await import('../realtime-scanner')
    const app = makeApp({
      '/api/empty': { get: { responses: { '200': { description: 'OK' } } } },
    })
    scanner(app)
    expect(mockHandleWS).not.toHaveBeenCalled()
    expect(mockHandleSSE).not.toHaveBeenCalled()
  })

  it('should ignore routes without responses', async () => {
    const { autoRegisterRealtime: scanner } = await import('../realtime-scanner')
    const app = makeApp({ '/api/no-responses': { get: {} } })
    scanner(app)
    expect(mockHandleWS).not.toHaveBeenCalled()
  })

  it('should handle getRuntimeAdapter throwing', async () => {
    vi.doMock('../runtime', () => ({
      getRuntimeAdapter: () => { throw new Error('Not initialized') },
    }))
    const { autoRegisterRealtime: scanner } = await import('../realtime-scanner')
    const app = makeApp({
      '/api/chat/ws': {
        get: { responses: { '200': { content: { websocket: { schema: {} } } } } },
      },
    })
    expect(() => scanner(app)).not.toThrow()
  })

  it('should handle getOpenAPIDocument throwing', async () => {
    const { autoRegisterRealtime: scanner } = await import('../realtime-scanner')
    const app = {
      getOpenAPIDocument: vi.fn().mockImplementation(() => {
        throw new Error('OpenAPI error')
      }),
    }
    expect(() => scanner(app)).not.toThrow()
  })

  it('should handle empty paths', async () => {
    const { autoRegisterRealtime: scanner } = await import('../realtime-scanner')
    scanner(makeApp({}))
    expect(mockHandleWS).not.toHaveBeenCalled()
  })

  it('should handle null/missing paths', async () => {
    const { autoRegisterRealtime: scanner } = await import('../realtime-scanner')
    const app = {
      getOpenAPIDocument: vi.fn().mockReturnValue({
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
      }),
    }
    scanner(app as any)
    expect(mockHandleWS).not.toHaveBeenCalled()
  })

  it('should prefix path with / if missing', async () => {
    const { autoRegisterRealtime: scanner } = await import('../realtime-scanner')
    const app = makeApp({
      'api/chat/ws': {
        get: { responses: { '200': { content: { websocket: { schema: {} } } } } },
      },
    })
    scanner(app)
    expect(mockHandleWS).toHaveBeenCalledWith('/api/chat/ws')
  })

  it('should skip null method entries', async () => {
    const { autoRegisterRealtime: scanner } = await import('../realtime-scanner')
    scanner(makeApp({ '/api/chat/ws': null, '/api/todos': undefined }) as any)
    expect(mockHandleWS).not.toHaveBeenCalled()
  })

  it('should only scan GET methods', async () => {
    const { autoRegisterRealtime: scanner } = await import('../realtime-scanner')
    const app = makeApp({
      '/api/chat/ws': {
        post: { responses: { '200': { content: { websocket: { schema: {} } } } } },
      },
    })
    scanner(app as any)
    expect(mockHandleWS).not.toHaveBeenCalled()
  })

  it('should register WS before SSE for same path', async () => {
    const { autoRegisterRealtime: scanner } = await import('../realtime-scanner')
    const app = makeApp({
      '/api/dual': {
        get: {
          responses: {
            '200': {
              content: {
                websocket: { schema: {} },
                'text/event-stream': { schema: {} },
              },
            },
          },
        },
      },
    })
    scanner(app)
    expect(mockHandleWS).toHaveBeenCalledWith('/api/dual')
  })
})
