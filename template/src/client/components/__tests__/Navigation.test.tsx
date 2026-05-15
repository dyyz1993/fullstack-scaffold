import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Navigation } from '../Navigation'
import type { PresetTheme } from '../../preset-ui-config'

const MOCK_THEME: PresetTheme = {
  primaryColor: '#6366f1',
  primaryHover: '#4f46e5',
  bgColor: '#ffffff',
  textColor: '#111827',
  secondaryBg: '#f9fafb',
  borderColor: '#e5e7eb',
  borderRadius: '12px',
  logoText: 'Biomimic',
  fontFamily: 'sans-serif',
}

const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('Navigation', () => {
  it('should render navigation with items', () => {
    renderWithRouter(
      <Navigation
        items={[
          { label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard' },
          { label: 'Settings', icon: 'Settings', path: '/settings' },
        ]}
        theme={MOCK_THEME}
      />
    )

    expect(screen.getByTestId('app-nav')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('should render with no items when nothing provided', () => {
    renderWithRouter(<Navigation />)

    expect(screen.getByTestId('app-nav')).toBeInTheDocument()
  })

  it('should display logo text from theme', () => {
    renderWithRouter(<Navigation theme={MOCK_THEME} />)

    expect(screen.getByText('Biomimic')).toBeInTheDocument()
  })
})
