import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'
import { App } from '@client/App'

vi.mock('@client/pages/TodoPage', () => ({
  TodoPage: () => <div data-testid="todo-page">Todo Page</div>,
}))

vi.mock('@client/pages/NotificationPage', () => ({
  NotificationPage: () => <div data-testid="notification-page">Notification Page</div>,
}))

vi.mock('@client/pages/WebSocketPage', () => ({
  WebSocketPage: () => <div data-testid="websocket-page">WebSocket Page</div>,
}))

vi.mock('@client/pages/LoginPage', () => ({
  LoginPage: () => <div data-testid="login-page">Login Page</div>,
}))

vi.mock('@client/pages/RegisterPage', () => ({
  RegisterPage: () => <div data-testid="register-page">Register Page</div>,
}))

vi.mock('@client/pages/DashboardPage', () => ({
  DashboardPage: () => <div data-testid="dashboard-page">Dashboard Page</div>,
}))

vi.mock('@client/pages/SettingsPage', () => ({
  SettingsPage: () => <div data-testid="settings-page">Settings Page</div>,
}))

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('Initial Render', () => {
    it('should render navigation', () => {
      render(<App presetId="saas" />)
      expect(screen.getByTestId('app-nav')).toBeInTheDocument()
    })

    it('should render main content area', () => {
      render(<App presetId="saas" />)
      expect(screen.getByTestId('app-main')).toBeInTheDocument()
    })

    it('should render container', () => {
      render(<App presetId="saas" />)
      expect(screen.getByTestId('app-container')).toBeInTheDocument()
    })
  })

  describe('Layout', () => {
    it('should render with todo preset', () => {
      render(<App presetId="todo" />)
      expect(screen.getByTestId('app-container')).toBeInTheDocument()
      expect(screen.getByTestId('app-nav')).toBeInTheDocument()
    })

    it('should render with plugin preset', () => {
      render(<App presetId="plugin" />)
      expect(screen.getByTestId('app-container')).toBeInTheDocument()
    })

    it('should render with ecommerce preset', () => {
      render(<App presetId="ecommerce" />)
      expect(screen.getByTestId('app-container')).toBeInTheDocument()
    })

    it('should render with community preset', () => {
      render(<App presetId="community" />)
      expect(screen.getByTestId('app-container')).toBeInTheDocument()
    })

    it('should render with saas preset', () => {
      render(<App presetId="saas" />)
      expect(screen.getByTestId('app-container')).toBeInTheDocument()
    })
  })

  describe('Navigation Links', () => {
    it('should render nav items for saas preset', () => {
      render(<App presetId="saas" />)
      expect(screen.getByTestId('app-nav')).toBeInTheDocument()
    })

    it('should render footer', () => {
      render(<App presetId="saas" />)
      expect(screen.getByTestId('app-footer')).toBeInTheDocument()
    })
  })
})
