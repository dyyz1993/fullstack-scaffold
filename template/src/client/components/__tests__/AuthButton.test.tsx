import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthButton } from '../AuthButton'

const mockLogout = vi.fn()

const unauthenticatedState = {
  isAuthenticated: false,
  token: null,
  user: null,
  loading: false,
  error: null,
  login: vi.fn(),
  register: vi.fn(),
  setToken: vi.fn(),
  setAuth: vi.fn(),
  logout: mockLogout,
  clearError: vi.fn(),
}

const authenticatedState = {
  isAuthenticated: true,
  token: 'user-token',
  user: { id: '1', username: 'testuser', role: 'user' },
  loading: false,
  error: null,
  login: vi.fn(),
  register: vi.fn(),
  setToken: vi.fn(),
  setAuth: vi.fn(),
  logout: mockLogout,
  clearError: vi.fn(),
}

vi.mock('@client/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

import { useAuthStore } from '@client/stores/authStore'

const mockedUseAuthStore = vi.mocked(useAuthStore)

describe('AuthButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show sign in and sign up links when not authenticated', () => {
    mockedUseAuthStore.mockImplementation(selector => {
      const state = {
        ...unauthenticatedState,
        login: vi.fn(),
        register: vi.fn(),
        setToken: vi.fn(),
        setAuth: vi.fn(),
        clearError: vi.fn(),
      }
      return selector ? selector(state) : state
    })

    render(
      <MemoryRouter>
        <AuthButton />
      </MemoryRouter>
    )

    expect(screen.getByTestId('auth-login')).toBeInTheDocument()
    expect(screen.getByTestId('auth-register')).toBeInTheDocument()
    expect(screen.queryByTestId('auth-logout')).not.toBeInTheDocument()
  })

  it('should show username and sign out button when authenticated', () => {
    mockedUseAuthStore.mockImplementation(selector => {
      const state = {
        ...authenticatedState,
        login: vi.fn(),
        register: vi.fn(),
        setToken: vi.fn(),
        setAuth: vi.fn(),
        clearError: vi.fn(),
      }
      return selector ? selector(state) : state
    })

    render(
      <MemoryRouter>
        <AuthButton />
      </MemoryRouter>
    )

    expect(screen.getByTestId('auth-username')).toHaveTextContent('testuser')
    expect(screen.getByTestId('auth-logout')).toBeInTheDocument()
    expect(screen.queryByTestId('auth-login')).not.toBeInTheDocument()
  })

  it('should call logout on sign out click', () => {
    mockedUseAuthStore.mockImplementation(selector => {
      const state = {
        ...authenticatedState,
        login: vi.fn(),
        register: vi.fn(),
        setToken: vi.fn(),
        setAuth: vi.fn(),
        clearError: vi.fn(),
      }
      return selector ? selector(state) : state
    })

    render(
      <MemoryRouter>
        <AuthButton />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByTestId('auth-logout'))

    expect(mockLogout).toHaveBeenCalled()
  })
})
