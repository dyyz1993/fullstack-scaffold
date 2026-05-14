import type { ResolvedPreset } from './template-generator'
import { getClientPages } from './template-generator'

export function generateClientAppTest(resolved: ResolvedPreset): string {
  const pages = getClientPages(resolved)

  const mocks = pages
    .map(
      p =>
        `vi.mock('@client/pages/${p.name}', () => ({
  ${p.name}: () => <div data-testid="${p.name.toLowerCase()}-page">${p.name}</div>,
}))`
    )
    .join('\n\n  ')

  return `import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'
import { App } from '@client/App'

  ${mocks}

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('Initial Render', () => {
    it('should render navigation', () => {
      render(<App />)
      expect(screen.getByTestId('app-nav')).toBeInTheDocument()
    })

    it('should render main content area', () => {
      render(<App />)
      expect(screen.getByTestId('app-main')).toBeInTheDocument()
    })

    it('should render container', () => {
      render(<App />)
      expect(screen.getByTestId('app-container')).toBeInTheDocument()
    })
  })

  describe('Navigation Links', () => {
    it('should render footer', () => {
      render(<App />)
      expect(screen.getByTestId('app-footer')).toBeInTheDocument()
    })
  })
})
`
}
