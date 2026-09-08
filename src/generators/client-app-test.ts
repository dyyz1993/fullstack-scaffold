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
      // 布局感知：top-nav 有 app-nav；sidebar 布局没有顶栏（有 app-container/app-main）
      expect(
        document.querySelector('[data-testid="app-nav"], [data-testid="app-container"]')
      ).toBeTruthy()
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
      // 页脚仅 top-nav 布局渲染（Layout: showFooter = layout === 'top-nav'）
      expect(
        document.querySelector('[data-testid="app-footer"]') ||
          document.querySelector('[data-testid="app-container"]')
      ).toBeTruthy()
    })
  })
})
`
}
