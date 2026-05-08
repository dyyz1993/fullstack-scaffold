/**
 * Vitest setup file for client tests
 * Configures jsdom environment and global mocks
 */

import { afterEach, vi } from 'vitest'
import '@testing-library/jest-dom'
import { EventSource } from 'eventsource'

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => children,
  HelmetProvider: ({ children }: { children: React.ReactNode }) => children,
}))

afterEach(() => {})

// Only define window properties if window exists (jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  })

  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
    unobserve() {}
    root = null
    rootMargin = ''
    thresholds = []
  } as unknown as typeof IntersectionObserver
}

// Suppress JSDOM getComputedStyle warnings during tests
const originalWarn = console.warn
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('getComputedStyle')) return
  originalWarn.apply(console, args)
}

// EventSource can be used in both environments
global.EventSource = EventSource as unknown as typeof globalThis.EventSource

if (typeof globalThis.WebSocket === 'undefined') {
  class MockWebSocket {
    static CONNECTING = 0
    static OPEN = 1
    static CLOSING = 2
    static CLOSED = 3
    readyState = MockWebSocket.CONNECTING
    send() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return true
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.WebSocket = MockWebSocket as any
}
