import { create } from 'zustand'
import type { User } from '@shared/schemas'

interface MerchantStats {
  totalSales: number
  totalOrders: number
  pendingOrders: number
}

interface MerchantState {
  user: User | null
  isAuthenticated: boolean
  stats: MerchantStats | null
  loading: boolean
  error: string | null
  checkAuth: () => Promise<void>
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  fetchStats: () => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useMerchantStore = create<MerchantState>(set => ({
  user: null,
  isAuthenticated: false,
  stats: null,
  loading: false,
  error: null,

  checkAuth: async () => {
    set({ loading: true, error: null })
    try {
      const response = await fetch('/api/merchant/me')
      const result = await response.json()
      if (result.success) {
        set({ user: result.data, isAuthenticated: true })
      } else {
        set({ user: null, isAuthenticated: false })
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      set({ user: null, isAuthenticated: false, error: 'Authentication failed' })
    } finally {
      set({ loading: false })
    }
  },

  login: async (username: string, password: string) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch('/api/merchant/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })
      const result = await response.json()
      if (result.success) {
        set({ user: result.data, isAuthenticated: true })
      } else {
        set({ error: result.error || 'Login failed' })
      }
    } catch (error) {
      console.error('Login failed:', error)
      set({ error: 'Network error' })
    } finally {
      set({ loading: false })
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false, stats: null })
  },

  fetchStats: async () => {
    set({ loading: true, error: null })
    try {
      const response = await fetch('/api/merchant/stats')
      const result = await response.json()
      if (result.success) {
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
