import { create } from 'zustand'
import { apiClient } from '@client/services/apiClient'
import type { Merchant, MerchantStats } from '@shared/schemas'

interface MerchantState {
  merchant: Merchant | null
  token: string | null
  isAuthenticated: boolean
  stats: MerchantStats | null
  loading: boolean
  error: string | null
  startLoading: (message?: string) => void
  stopLoading: () => void
  checkAuth: () => Promise<void>
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  fetchStats: () => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useMerchantStore = create<MerchantState>(set => ({
  merchant: null,
  token: null,
  isAuthenticated: false,
  stats: null,
  loading: false,
  error: null,

  startLoading: (_message?: string) => set({ loading: true }),
  stopLoading: () => set({ loading: false }),

  checkAuth: async () => {
    set({ loading: true, error: null })
    try {
       
      // @ts-expect-error - Hono type inference depth limit in full template; resolves correctly in generated project
      const response = await apiClient.api.merchant.me.$get()
      const result = await response.json()
      if (result.success === true && result.data) {
        set({ merchant: result.data, isAuthenticated: true })
      } else {
        set({ merchant: null, isAuthenticated: false })
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      set({ merchant: null, isAuthenticated: false, error: 'Authentication failed' })
    } finally {
      set({ loading: false })
    }
  },

  login: async (username: string, password: string) => {
    set({ loading: true, error: null })
    try {
       
      // @ts-expect-error - Hono type inference depth limit in full template; resolves correctly in generated project
      const response = await apiClient.api.merchant.login.$post({
        json: { username, password },
      })
      const result = await response.json()
      if (result.success === true && result.data) {
        set({
          merchant: result.data.merchant,
          token: result.data.token,
          isAuthenticated: true,
        })
      } else if (result.success === false) {
        set({ error: result.error })
      }
    } catch (error) {
      console.error('Login failed:', error)
      set({ error: 'Network error' })
    } finally {
      set({ loading: false })
    }
  },

  logout: () => {
    set({ merchant: null, token: null, isAuthenticated: false, stats: null })
  },

  fetchStats: async () => {
    set({ loading: true, error: null })
    try {
       
      // @ts-expect-error - Hono type inference depth limit in full template; resolves correctly in generated project
      const response = await apiClient.api.merchant.stats.$get()
      const result = await response.json()
      if (result.success === true && result.data) {
        set({ stats: result.data })
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      set({ error: 'Failed to fetch statistics' })
    } finally {
      set({ loading: false })
    }
  },

  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
}))
