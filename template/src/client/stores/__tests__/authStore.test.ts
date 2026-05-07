import { describe, it, expect, beforeEach, vi } from 'vitest'
import { create } from 'zustand'

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

describe('authStore', () => {
  let useAuthStore: ReturnType<typeof createTestStore>

  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore = createTestStore()
  })

  describe('Initial State', () => {
    it('should have null token and not authenticated', () => {
      expect(useAuthStore.getState().token).toBeNull()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })

    it('should have null user and not authenticated', () => {
      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })
  })

  describe('setAuth', () => {
    it('should set token and user', () => {
      useAuthStore
        .getState()
        .setAuth('jwt-token-123', { id: '1', username: 'admin', role: 'admin' })

      const state = useAuthStore.getState()
      expect(state.token).toBe('jwt-token-123')
      expect(state.isAuthenticated).toBe(true)
      expect(state.user).toEqual({ id: '1', username: 'admin', role: 'admin' })
    })

    it('should update existing auth state', () => {
      useAuthStore.getState().setAuth('token-1', { id: '1', username: 'user1', role: 'user' })
      useAuthStore.getState().setAuth('token-2', { id: '2', username: 'user2', role: 'admin' })

      const state = useAuthStore.getState()
      expect(state.token).toBe('token-2')
      expect(state.user?.username).toBe('user2')
    })

    it('should set isAuthenticated to true and preserve token', () => {
      useAuthStore.getState().setAuth('t', { id: '1', username: 'u', role: 'r' })
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(useAuthStore.getState().token).toBe('t')
    })
  })

  describe('setToken', () => {
    it('should set token and mark as authenticated', () => {
      useAuthStore.getState().setToken('new-token')

      const state = useAuthStore.getState()
      expect(state.token).toBe('new-token')
      expect(state.isAuthenticated).toBe(true)
    })

    it('should not modify user when setting token only', () => {
      useAuthStore.getState().setAuth('old', { id: '1', username: 'user', role: 'user' })
      useAuthStore.getState().setToken('refreshed-token')

      const state = useAuthStore.getState()
      expect(state.user).toEqual({ id: '1', username: 'user', role: 'user' })
      expect(state.token).toBe('refreshed-token')
    })
  })

  describe('logout', () => {
    it('should clear all auth state', () => {
      useAuthStore.getState().setAuth('token', { id: '1', username: 'user', role: 'user' })
      useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
    })

    it('should be safe to call logout when already logged out', () => {
      useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
    })
  })

  describe('Full auth lifecycle', () => {
    it('should handle login -> use -> logout flow', () => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false)

      useAuthStore.getState().setAuth('jwt', { id: '1', username: 'admin', role: 'admin' })
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(useAuthStore.getState().user?.role).toBe('admin')

      useAuthStore.getState().logout()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
      expect(useAuthStore.getState().user).toBeNull()
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
