/**
 * Vitest setup file for client tests
 * Configures jsdom environment and global mocks
 */

import { afterEach, vi } from 'vitest'
import '@testing-library/jest-dom'
import { EventSource } from 'eventsource'
import zhCN from './src/admin/i18n/locales/zh-CN.json'

function resolveTranslation(obj: Record<string, unknown>, key: string): string {
  const keys = key.split('.')
  let current: unknown = obj
  for (const k of keys) {
    if (current && typeof current === 'object' && k in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[k]
    } else {
      return key
    }
  }
  return typeof current === 'string' ? current : key
}

const stableT = (key: string, params?: Record<string, unknown>) => {
  let val = resolveTranslation(zhCN, key)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      val = val.replace(`{{${k}}}`, String(v))
    }
  }
  return val
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: stableT,
    i18n: {
      language: 'zh-CN',
      changeLanguage: () => {},
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}))

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

// Polyfill window.getComputedStyle for jsdom environments that don't implement it
if (typeof window !== 'undefined' && !window.getComputedStyle) {
  Object.defineProperty(window, 'getComputedStyle', {
    value: () => ({
      getPropertyValue: () => '',
      length: 0,
    }),
    writable: true,
  })
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
