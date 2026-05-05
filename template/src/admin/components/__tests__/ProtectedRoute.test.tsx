import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../ProtectedRoute'
import { Role } from '@shared/modules/permission'

let mockIsAuthenticated = false
let mockUser: { id: string; role: string } | null = null
const mockInitPermissions = vi.fn()
const mockFetchStaticData = vi.fn()
let mockInitialized = false

vi.mock('../../stores/adminStore', () => ({
  useAdminStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      isAuthenticated: mockIsAuthenticated,
      user: mockUser,
    }),
}))

vi.mock('../../hooks/usePermissions', () => ({
  usePermissionStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      initialized: mockInitialized,
      initPermissions: mockInitPermissions,
      fetchStaticData: mockFetchStaticData,
    }),
}))

function renderWithRouter(ui: React.ReactElement, initialPath = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard</div>} />
        <Route path="/protected" element={ui} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockIsAuthenticated = false
    mockUser = null
    mockInitialized = false
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('should redirect to /login when not authenticated', () => {
    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('should render children when authenticated', () => {
    mockIsAuthenticated = true
    mockUser = { id: '1', role: Role.SUPER_ADMIN }

    renderWithRouter(
      <ProtectedRoute>
        <div data-testid="protected">Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByTestId('protected')).toBeInTheDocument()
  })

  it('should redirect to /dashboard when user lacks required role', () => {
    mockIsAuthenticated = true
    mockUser = { id: '1', role: Role.USER }

    renderWithRouter(
      <ProtectedRoute requiredRole={Role.SUPER_ADMIN}>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByTestId('dashboard')).toBeInTheDocument()
  })

  it('should allow access for super admin regardless of required role', () => {
    mockIsAuthenticated = true
    mockUser = { id: '1', role: Role.SUPER_ADMIN }

    renderWithRouter(
      <ProtectedRoute requiredRole={Role.CUSTOMER_SERVICE}>
        <div data-testid="protected">Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByTestId('protected')).toBeInTheDocument()
  })

  it('should init permissions when authenticated and not initialized', () => {
    mockIsAuthenticated = true
    mockUser = { id: '1', role: Role.SUPER_ADMIN }

    renderWithRouter(
      <ProtectedRoute>
        <div data-testid="protected">Protected Content</div>
      </ProtectedRoute>
    )

    expect(mockInitPermissions).toHaveBeenCalled()
    expect(mockFetchStaticData).toHaveBeenCalled()
  })

  it('should not init permissions when already initialized', () => {
    mockIsAuthenticated = true
    mockUser = { id: '1', role: Role.SUPER_ADMIN }
    mockInitialized = true

    renderWithRouter(
      <ProtectedRoute>
        <div data-testid="protected">Protected Content</div>
      </ProtectedRoute>
    )

    expect(mockInitPermissions).not.toHaveBeenCalled()
  })
})
