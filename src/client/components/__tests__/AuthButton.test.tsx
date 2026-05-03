import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AuthButton } from '../AuthButton'
import type { AuthUserResponse } from '@shared/modules/ops/schemas'
import { Role } from '@platform/shared/permission/permissions'

const mockSetToken = vi.fn()
const mockLogout = vi.fn()
const mockSetUser = vi.fn()
const mockLogin = vi.fn()

const mockUser: AuthUserResponse = {
  id: 'user-1',
  username: 'Test User',
  email: 'test@example.com',
  role: Role.USER,
  permissions: [],
  avatar: null,
}

// Mock zustand
vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(selector => {
    const state = {
      isAuthenticated: false,
      token: null,
      user: null,
      logout: mockLogout,
      setToken: mockSetToken,
      setUser: mockSetUser,
      login: mockLogin,
    }
    if (selector) {
      return selector(state)
    }
    return state
  }),
}))

import { useAuthStore } from '../../stores/authStore'

describe('AuthButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { reload: vi.fn() },
    })
  })

  it('should show login button when not authenticated', () => {
    vi.mocked(useAuthStore).mockImplementation(selector => {
      const state = {
        isAuthenticated: false,
        token: null,
        user: null,
        logout: mockLogout,
        setToken: mockSetToken,
        setUser: mockSetUser,
        login: mockLogin,
      }
      return selector ? selector(state) : state
    })

    render(<AuthButton />)

    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.queryByText('Logout')).not.toBeInTheDocument()
  })

  it('should show logout button when authenticated', () => {
    vi.mocked(useAuthStore).mockImplementation(selector => {
      const state = {
        isAuthenticated: true,
        token: 'user-token',
        user: mockUser,
        logout: mockLogout,
        setToken: mockSetToken,
        setUser: mockSetUser,
        login: mockLogin,
      }
      return selector ? selector(state) : state
    })

    render(<AuthButton />)

    expect(screen.getByText('Logged in')).toBeInTheDocument()
    expect(screen.getByText('Logout')).toBeInTheDocument()
    expect(screen.queryByText('Login')).not.toBeInTheDocument()
  })

  it('should call setToken and reload on login', () => {
    vi.mocked(useAuthStore).mockImplementation(selector => {
      const state = {
        isAuthenticated: false,
        token: null,
        user: null,
        logout: mockLogout,
        setToken: mockSetToken,
        setUser: mockSetUser,
        login: mockLogin,
      }
      return selector ? selector(state) : state
    })

    render(<AuthButton />)

    fireEvent.click(screen.getByText('Login'))

    expect(mockSetToken).toHaveBeenCalledWith('user-token')
    expect(window.location.reload).toHaveBeenCalled()
  })

  it('should call logout and reload on logout', () => {
    vi.mocked(useAuthStore).mockImplementation(selector => {
      const state = {
        isAuthenticated: true,
        token: 'user-token',
        user: mockUser,
        logout: mockLogout,
        setToken: mockSetToken,
        setUser: mockSetUser,
        login: mockLogin,
      }
      return selector ? selector(state) : state
    })

    render(<AuthButton />)

    fireEvent.click(screen.getByText('Logout'))

    expect(mockLogout).toHaveBeenCalled()
    expect(window.location.reload).toHaveBeenCalled()
  })
})
