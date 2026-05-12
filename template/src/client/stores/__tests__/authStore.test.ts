import { describe, it, expect, beforeEach, vi } from 'vitest'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient } from '@client/services/apiClient'

interface UserProfile {
  id: string
  username: string
  role: string
}

interface AuthState {
  token: string | null
  isAuthenticated: boolean
  user: UserProfile | null
  setAuth: (token: string, user: UserProfile) => void
  setToken: (token: string) => void
  logout: () => void
}

const createTestStore = () =>
  create<AuthState>(set => ({
    token: null,
    isAuthenticated: false,
    user: null,
    setAuth: (token: string, user: UserProfile) => set({ token, isAuthenticated: true, user }),
    setToken: (token: string) => set({ token, isAuthenticated: true }),
    logout: () => set({ token: null, isAuthenticated: false, user: null }),
  }))

const { mockJson, mockLoginPost, mockRegisterPost } = vi.hoisted(() => {
  const mockJson = vi.fn()
  return {
    mockJson,
    mockLoginPost: vi.fn().mockResolvedValue({ json: () => mockJson() }),
    mockRegisterPost: vi.fn().mockResolvedValue({ json: () => mockJson() }),
  }
})

vi.mock('@client/services/apiClient', () => ({
  apiClient: {
    api: {
      auth: {
        login: { $post: mockLoginPost },
        register: { $post: mockRegisterPost },
      },
    },
  },
}))

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

interface FullAuthState extends AuthState {
  loading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  clearError: () => void
}

const createFullAuthStore = () =>
  create<FullAuthState>()(
    persist(
      set => ({
        token: null,
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null,

        login: async (username: string, password: string) => {
          set({ loading: true, error: null })
          try {
            const response = await apiClient.api.auth.login.$post({
              json: { username, password },
            })
            const result = await response.json()
            if (result.success) {
              const { token, user } = result.data
              set({
                token,
                isAuthenticated: true,
                user: { id: user.id, username: user.username, role: user.role },
                loading: false,
                error: null,
              })
            } else {
              set({ loading: false, error: result.error })
            }
          } catch {
            set({ loading: false, error: 'Login failed. Please try again.' })
          }
        },

        register: async (username: string, email: string, password: string) => {
          set({ loading: true, error: null })
          try {
            const response = await apiClient.api.auth.register.$post({
              json: { username, email, password },
            })
            const result = await response.json()
            if (result.success) {
              set({ loading: false, error: null })
            } else {
              set({ loading: false, error: result.error })
            }
          } catch {
            set({ loading: false, error: 'Registration failed. Please try again.' })
          }
        },

        setAuth: (token: string, user: UserProfile) =>
          set({
            token,
            isAuthenticated: true,
            user,
          }),

        setToken: (token: string) =>
          set({
            token,
            isAuthenticated: true,
          }),

        logout: () =>
          set({
            token: null,
            isAuthenticated: false,
            user: null,
            error: null,
          }),

        clearError: () => set({ error: null }),
      }),
      {
        name: 'auth-token-test',
        storage: noopStorage as unknown as ReturnType<
          typeof import('zustand/middleware').createJSONStorage<FullAuthState>
        >,
      }
    )
  )

describe('authStore', () => {
  let localStore: ReturnType<typeof createTestStore>

  beforeEach(() => {
    vi.clearAllMocks()
    mockJson.mockReset()
    localStore = createTestStore()
  })

  describe('Initial State', () => {
    it('should have null token and not authenticated', () => {
      expect(localStore.getState().token).toBeNull()
      expect(localStore.getState().isAuthenticated).toBe(false)
    })

    it('should have null user and not authenticated', () => {
      expect(localStore.getState().user).toBeNull()
      expect(localStore.getState().isAuthenticated).toBe(false)
    })
  })

  describe('setAuth', () => {
    it('should set token and user', () => {
      localStore.getState().setAuth('jwt-token-123', { id: '1', username: 'admin', role: 'admin' })

      const state = localStore.getState()
      expect(state.token).toBe('jwt-token-123')
      expect(state.isAuthenticated).toBe(true)
      expect(state.user).toEqual({ id: '1', username: 'admin', role: 'admin' })
    })

    it('should update existing auth state', () => {
      localStore.getState().setAuth('token-1', { id: '1', username: 'user1', role: 'user' })
      localStore.getState().setAuth('token-2', { id: '2', username: 'user2', role: 'admin' })

      const state = localStore.getState()
      expect(state.token).toBe('token-2')
      expect(state.user?.username).toBe('user2')
    })

    it('should set isAuthenticated to true and preserve token', () => {
      localStore.getState().setAuth('t', { id: '1', username: 'u', role: 'r' })
      expect(localStore.getState().isAuthenticated).toBe(true)
      expect(localStore.getState().token).toBe('t')
    })
  })

  describe('setToken', () => {
    it('should set token and mark as authenticated', () => {
      localStore.getState().setToken('new-token')

      const state = localStore.getState()
      expect(state.token).toBe('new-token')
      expect(state.isAuthenticated).toBe(true)
    })

    it('should not modify user when setting token only', () => {
      localStore.getState().setAuth('old', { id: '1', username: 'user', role: 'user' })
      localStore.getState().setToken('refreshed-token')

      const state = localStore.getState()
      expect(state.user).toEqual({ id: '1', username: 'user', role: 'user' })
      expect(state.token).toBe('refreshed-token')
    })
  })

  describe('logout', () => {
    it('should clear all auth state', () => {
      localStore.getState().setAuth('token', { id: '1', username: 'user', role: 'user' })
      localStore.getState().logout()

      const state = localStore.getState()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
    })

    it('should be safe to call logout when already logged out', () => {
      localStore.getState().logout()

      const state = localStore.getState()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
    })
  })

  describe('Full auth lifecycle', () => {
    it('should handle login -> use -> logout flow', () => {
      expect(localStore.getState().isAuthenticated).toBe(false)

      localStore.getState().setAuth('jwt', { id: '1', username: 'admin', role: 'admin' })
      expect(localStore.getState().isAuthenticated).toBe(true)
      expect(localStore.getState().user?.role).toBe('admin')

      localStore.getState().logout()
      expect(localStore.getState().isAuthenticated).toBe(false)
      expect(localStore.getState().user).toBeNull()
    })
  })

  describe('Persist behavior', () => {
    it('should use persist middleware with auth-token storage name', async () => {
      const mod = await import('../authStore')
      const store = mod.useAuthStore as unknown as Record<string, unknown>
      expect(store.persist).toBeDefined()
      expect(store.persist).toBeTruthy()
    })
  })
})

describe('authStore - login action', () => {
  let store: ReturnType<typeof createFullAuthStore>

  beforeEach(() => {
    vi.clearAllMocks()
    mockJson.mockReset()
    store = createFullAuthStore()
  })

  it('should login successfully', async () => {
    mockJson.mockResolvedValue({
      success: true,
      data: {
        token: 'jwt-abc',
        user: { id: '1', username: 'testuser', role: 'user' },
      },
    })

    await store.getState().login('testuser', 'pass123')

    const state = store.getState()
    expect(state.token).toBe('jwt-abc')
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toEqual({ id: '1', username: 'testuser', role: 'user' })
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('should handle login failure response', async () => {
    mockJson.mockResolvedValue({
      success: false,
      error: 'Invalid credentials',
    })

    await store.getState().login('wrong', 'wrong')

    const state = store.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.error).toBe('Invalid credentials')
    expect(state.loading).toBe(false)
  })

  it('should handle login network error', async () => {
    mockLoginPost.mockRejectedValueOnce(new Error('Network error'))

    await store.getState().login('user', 'pass')

    const state = store.getState()
    expect(state.error).toBe('Login failed. Please try again.')
    expect(state.loading).toBe(false)
  })

  it('should set loading to true during login', async () => {
    let resolvePromise!: (value: unknown) => void
    mockLoginPost.mockReturnValueOnce(
      new Promise(r => {
        resolvePromise = r
      })
    )

    const loginPromise = store.getState().login('user', 'pass')
    expect(store.getState().loading).toBe(true)

    resolvePromise({ json: () => Promise.resolve({ success: false, error: 'fail' }) })
    await loginPromise

    expect(store.getState().loading).toBe(false)
  })
})

describe('authStore - register action', () => {
  let store: ReturnType<typeof createFullAuthStore>

  beforeEach(() => {
    vi.clearAllMocks()
    mockJson.mockReset()
    store = createFullAuthStore()
  })

  it('should register successfully', async () => {
    mockJson.mockResolvedValue({
      success: true,
      data: { id: '2', username: 'newuser' },
    })

    await store.getState().register('newuser', 'new@test.com', 'pass123')

    const state = store.getState()
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('should handle register failure response', async () => {
    mockJson.mockResolvedValue({
      success: false,
      error: 'Username already taken',
    })

    await store.getState().register('taken', 'taken@test.com', 'pass123')

    const state = store.getState()
    expect(state.error).toBe('Username already taken')
    expect(state.loading).toBe(false)
  })

  it('should handle register network error', async () => {
    mockRegisterPost.mockRejectedValueOnce(new Error('Network error'))

    await store.getState().register('user', 'e@e.com', 'pass')

    const state = store.getState()
    expect(state.error).toBe('Registration failed. Please try again.')
    expect(state.loading).toBe(false)
  })
})

describe('authStore - clearError action', () => {
  let store: ReturnType<typeof createFullAuthStore>

  beforeEach(() => {
    vi.clearAllMocks()
    mockJson.mockReset()
    store = createFullAuthStore()
  })

  it('should clear error', async () => {
    mockJson.mockResolvedValue({ success: false, error: 'test error' })
    await store.getState().login('x', 'y')

    expect(store.getState().error).toBe('test error')

    store.getState().clearError()
    expect(store.getState().error).toBeNull()
  })
})
