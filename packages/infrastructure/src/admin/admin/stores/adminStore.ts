import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient } from '../services/apiClient'
import type { SystemStats, AuthUserResponse, LoginResponse } from '@shared/modules/admin'
import { usePermissionStore } from '../hooks/usePermissions'

interface AdminState {
  user: AuthUserResponse | null
  token: string | null
  isAuthenticated: boolean
  stats: SystemStats | null
  loading: boolean
  error: string | null

  login: (username: string, password: string) => Promise<LoginResponse>
  logout: () => void
  fetchStats: () => Promise<void>
  setUser: (user: AuthUserResponse) => void
  setToken: (token: string) => void
  clearError: () => void
}

export const useAdminStore = create<AdminState>()(
  persist(
    set => ({
      user: null,
      token: null,
      isAuthenticated: false,
      stats: null,
      loading: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ loading: true })
        try {
          const response = await apiClient.api.admin.login.$post({
            json: { username, password },
          })
          const result = await response.json()
          if (result.success) {
            set({
              user: result.data.user,
              token: result.data.token,
              isAuthenticated: true,
              loading: false,
            })
            usePermissionStore.getState().initPermissions()
            return result.data
          }
          throw new Error(result.error || 'Login failed')
        } catch (error) {
          set({ loading: false })
          throw error
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          stats: null,
        })
        usePermissionStore.getState().reset()
      },

      fetchStats: async () => {
        try {
          const response = await apiClient.api.admin.stats.$get()
          const result = await response.json()
          if (result.success) {
            set({ stats: result.data })
          }
        } catch (error) {
          console.error('Failed to fetch stats:', error)
          set({ error: error instanceof Error ? error.message : 'Failed to fetch stats' })
        }
      },

      setUser: (user: AuthUserResponse) => set({ user }),
      setToken: (token: string) => set({ token }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'admin-storage',
      partialize: state => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
