/**
 * Vitest setup file for client tests
 * Configures jsdom environment and global mocks
 */

import { afterEach } from 'vitest'
import '@testing-library/jest-dom'

afterEach(() => {})

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
