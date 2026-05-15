import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient } from '@client/services/apiClient'
import type { DeveloperProfile } from '@shared/schemas'

type UserProfile = Pick<DeveloperProfile, 'id' | 'username' | 'role'>

interface AuthState {
  token: string | null
  isAuthenticated: boolean
  user: UserProfile | null
  loading: boolean
  error: string | null

  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  setAuth: (token: string, user: UserProfile) => void
  setToken: (token: string) => void
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
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
            json: { account: username, password },
          })
          const result = await response.json()
          if (result.success) {
            const { token, profile } = result.data
            set({
              token,
              isAuthenticated: true,
              user: {
                id: profile.id,
                username: profile.username,
                role: profile.role as 'user' | 'admin',
              },
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
      name: 'auth-token',
    }
  )
)
