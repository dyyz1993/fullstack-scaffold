import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { AuthUserResponse } from '@shared/modules/ops/schemas'
import { Role } from '@platform/shared/permission'

vi.mock('@client/services/apiClient', () => ({
  apiClient: {
    api: {
      auth: {
        $post: vi.fn(),
      },
    },
  },
}))

const mockUser: AuthUserResponse = {
  id: 'user-1',
  username: 'Test User',
  email: 'test@example.com',
  role: Role.USER,
  permissions: [],
  avatar: null,
}

const createLocalStorageMock = () => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string): string | null => store[key] || null,
    setItem: (key: string, value: string): void => {
      store[key] = value
    },
    removeItem: (key: string): void => {
      delete store[key]
    },
    clear: (): void => {
      store = {}
    },
  }
}

let localStorageMock: ReturnType<typeof createLocalStorageMock>

vi.stubGlobal(
  'localStorage',
  new Proxy({} as Storage, {
    get(_target, prop) {
      if (prop === 'getItem') return localStorageMock.getItem.bind(localStorageMock)
      if (prop === 'setItem') return localStorageMock.setItem.bind(localStorageMock)
      if (prop === 'removeItem') return localStorageMock.removeItem.bind(localStorageMock)
      if (prop === 'clear') return localStorageMock.clear.bind(localStorageMock)
      return undefined
    },
  })
)

describe('Auth Store', () => {
  beforeEach(() => {
    localStorageMock = createLocalStorageMock()
    localStorageMock.clear()
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  describe('Initial State', () => {
    it('should have empty initial state', async () => {
      const { useAuthStore } = await import('../authStore')
      useAuthStore.setState({
        token: null,
        user: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useAuthStore())

      expect(result.current.token).toBeNull()
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('setToken', () => {
    it('should set token and set isAuthenticated to true', async () => {
      const { useAuthStore } = await import('../authStore')
      useAuthStore.setState({
        token: null,
        user: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setToken('test-token-123')
      })

      expect(result.current.token).toBe('test-token-123')
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should update existing token', async () => {
      const { useAuthStore } = await import('../authStore')
      useAuthStore.setState({
        token: null,
        user: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setToken('first-token')
      })
      expect(result.current.token).toBe('first-token')

      act(() => {
        result.current.setToken('second-token')
      })
      expect(result.current.token).toBe('second-token')
    })
  })

  describe('setUser', () => {
    it('should set user', async () => {
      const { useAuthStore } = await import('../authStore')
      useAuthStore.setState({
        token: null,
        user: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setUser(mockUser)
      })

      expect(result.current.user).toEqual(mockUser)
    })

    it('should update existing user', async () => {
      const { useAuthStore } = await import('../authStore')
      useAuthStore.setState({
        token: null,
        user: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setUser(mockUser)
      })

      const updatedUser: AuthUserResponse = {
        ...mockUser,
        username: 'Updated User',
      }

      act(() => {
        result.current.setUser(updatedUser)
      })

      expect(result.current.user?.username).toBe('Updated User')
    })
  })

  describe('login', () => {
    it('should set token, user and isAuthenticated to true', async () => {
      const { useAuthStore } = await import('../authStore')
      useAuthStore.setState({
        token: null,
        user: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.login('login-token-456', mockUser)
      })

      expect(result.current.token).toBe('login-token-456')
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should handle login with different user roles', async () => {
      const { useAuthStore } = await import('../authStore')
      useAuthStore.setState({
        token: null,
        user: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useAuthStore())

      const adminUser: AuthUserResponse = {
        ...mockUser,
        id: 'admin-1',
        username: 'Admin User',
        role: Role.SUPER_ADMIN,
      }

      act(() => {
        result.current.login('admin-token', adminUser)
      })

      expect(result.current.user?.role).toBe(Role.SUPER_ADMIN)
      expect(result.current.isAuthenticated).toBe(true)
    })
  })

  describe('logout', () => {
    it('should clear token, user and set isAuthenticated to false', async () => {
      const { useAuthStore } = await import('../authStore')
      useAuthStore.setState({
        token: null,
        user: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.login('test-token', mockUser)
      })
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.token).toBe('test-token')

      act(() => {
        result.current.logout()
      })

      expect(result.current.token).toBeNull()
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('should handle logout when not authenticated', async () => {
      const { useAuthStore } = await import('../authStore')
      useAuthStore.setState({
        token: null,
        user: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.logout()
      })

      expect(result.current.token).toBeNull()
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('should reset to initial state after multiple logins and logout', async () => {
      const { useAuthStore } = await import('../authStore')
      useAuthStore.setState({
        token: null,
        user: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.login('token-1', mockUser)
      })
      act(() => {
        result.current.login('token-2', { ...mockUser, id: 'user-2' })
      })
      act(() => {
        result.current.logout()
      })

      expect(result.current.token).toBeNull()
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('state transitions', () => {
    it('should handle full auth flow: setToken -> setUser -> logout', async () => {
      const { useAuthStore } = await import('../authStore')
      useAuthStore.setState({
        token: null,
        user: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setToken('auth-token')
      })
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.token).toBe('auth-token')

      act(() => {
        result.current.setUser(mockUser)
      })
      expect(result.current.user).toEqual(mockUser)

      act(() => {
        result.current.logout()
      })
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.token).toBeNull()
      expect(result.current.user).toBeNull()
    })

    it('should handle full auth flow: login -> logout', async () => {
      const { useAuthStore } = await import('../authStore')
      useAuthStore.setState({
        token: null,
        user: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.login('session-token', mockUser)
      })
      expect(result.current.isAuthenticated).toBe(true)

      act(() => {
        result.current.logout()
      })
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('error scenarios', () => {
    it('should handle setting null user', async () => {
      const { useAuthStore } = await import('../authStore')
      useAuthStore.setState({
        token: null,
        user: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setUser(mockUser)
      })
      expect(result.current.user).toEqual(mockUser)

      act(() => {
        result.current.setUser(null)
      })
      expect(result.current.user).toBeNull()
    })

    it('should handle empty string token', async () => {
      const { useAuthStore } = await import('../authStore')
      useAuthStore.setState({
        token: null,
        user: null,
        isAuthenticated: false,
      })

      const { result } = renderHook(() => useAuthStore())

      act(() => {
        result.current.setToken('')
      })
      expect(result.current.token).toBe('')
      expect(result.current.isAuthenticated).toBe(true)
    })
  })
})
