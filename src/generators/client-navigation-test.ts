import type { ResolvedPreset } from './template-generator'
import { getClientPages } from './template-generator'

const LABEL_MAP: Record<string, string> = {
  TodoPage: 'Todos',
  NotificationPage: 'Notifications',
  WebSocketPage: 'WebSocket',
  PluginsPage: 'Plugins',
  CategoriesPage: 'Categories',
  SearchPage: 'Search',
  PublishPage: 'Publish',
  DeveloperDashboardPage: 'Developer',
  TopicsPage: 'Topics',
  ProfilePage: 'Profile',
  DashboardPage: 'Dashboard',
  SettingsPage: 'Settings',
  CartPage: 'Cart',
  OrdersPage: 'Orders',
}

export function generateClientNavigationTest(resolved: ResolvedPreset): string {
  const pages = getClientPages(resolved).filter(p => !p.route.includes(':'))
  const firstPage = pages[0]

  if (!firstPage) {
    return `import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Navigation } from '../Navigation'

const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('Navigation', () => {
  it('should render navigation', () => {
    renderWithRouter(<Navigation />)
    expect(screen.getByTestId('app-nav')).toBeInTheDocument()
  })
})
`
  }

  const firstLabel = LABEL_MAP[firstPage.name] || firstPage.name.replace('Page', '')

  return `import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Navigation } from '../Navigation'

const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('Navigation', () => {
  it('should render navigation', () => {
    renderWithRouter(<Navigation />)
    expect(screen.getByTestId('app-nav')).toBeInTheDocument()
  })

  it('should render nav items', () => {
    renderWithRouter(<Navigation />)
    expect(screen.getByText('${firstLabel}')).toBeInTheDocument()
  })
})
`
}
