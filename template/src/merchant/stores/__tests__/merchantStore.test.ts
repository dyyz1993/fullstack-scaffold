import { describe, it, expect, vi, beforeEach } from 'vitest'
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

const mockMerchant: Merchant = {
  id: 1,
  userId: 'user-1',
  tenantId: 100,
  businessName: 'Test Shop',
  businessType: 'retail',
  status: 'active',
  description: 'A test shop',
  phone: '1234567890',
  email: 'shop@test.com',
  address: '123 Test St',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const mockStats: MerchantStats = {
  totalOrders: 150,
  totalRevenue: 50000,
  totalProducts: 80,
  activeProducts: 65,
  pendingOrders: 12,
  thisMonthRevenue: 8500,
}

const mockCheckAuthResponse = {
  success: true,
  data: mockMerchant,
}

const mockLoginResponse = {
  success: true,
  data: {
    merchant: mockMerchant,
    token: 'merchant-token-123',
  },
}

const mockStatsResponse = {
  success: true,
  data: mockStats,
}

vi.mock('@client/services/apiClient', () => ({
  apiClient: {
    api: {
      merchant: {
        me: {
          $get: vi.fn(async () => ({
            json: async () => mockCheckAuthResponse,
          })),
        },
        login: {
          $post: vi.fn(async () => ({
            json: async () => mockLoginResponse,
          })),
        },
        stats: {
          $get: vi.fn(async () => ({
            json: async () => mockStatsResponse,
          })),
        },
      },
    },
  },
}))

describe('useMerchantStore', () => {
  let useMerchantStore: {
    getState: () => MerchantState
    setState: (s: Partial<MerchantState>) => void
  }

  beforeEach(async () => {
    const mod = await import('../merchantStore')
    useMerchantStore = mod.useMerchantStore
    useMerchantStore.setState({
      merchant: null,
      token: null,
      isAuthenticated: false,
      stats: null,
      loading: false,
      error: null,
    })
    vi.clearAllMocks()
  })

  it('should have correct initial state', () => {
    const state = useMerchantStore.getState()
    expect(state.merchant).toBeNull()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.stats).toBeNull()
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
  })

  describe('checkAuth', () => {
    it('should set merchant and isAuthenticated on successful check', async () => {
      await useMerchantStore.getState().checkAuth()

      const state = useMerchantStore.getState()
      expect(state.merchant).toEqual(mockMerchant)
      expect(state.isAuthenticated).toBe(true)
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should clear merchant on failed check (success: false)', async () => {
      const { apiClient } = await import('@client/services/apiClient')
      vi.mocked(apiClient.api.merchant.me.$get).mockImplementationOnce(
        async () =>
          ({
            json: async () => ({
              success: false,
              error: 'Not authenticated',
            }),
          } as never)
      )

      await useMerchantStore.getState().checkAuth()

      const state = useMerchantStore.getState()
      expect(state.merchant).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.loading).toBe(false)
    })

    it('should handle network error gracefully', async () => {
      const { apiClient } = await import('@client/services/apiClient')
      vi.mocked(apiClient.api.merchant.me.$get).mockImplementationOnce(async () => {
        throw new Error('Network error')
      })

      await useMerchantStore.getState().checkAuth()

      const state = useMerchantStore.getState()
      expect(state.merchant).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.error).toBe('Authentication failed')
      expect(state.loading).toBe(false)
    })
  })

  describe('login', () => {
    it('should set merchant, token, isAuthenticated on successful login', async () => {
      await useMerchantStore.getState().login('testmerchant', 'password123')

      const state = useMerchantStore.getState()
      expect(state.merchant).toEqual(mockMerchant)
      expect(state.token).toBe('merchant-token-123')
      expect(state.isAuthenticated).toBe(true)
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should set error on failed login (success: false)', async () => {
      const { apiClient } = await import('@client/services/apiClient')
      vi.mocked(apiClient.api.merchant.login.$post).mockImplementationOnce(
        async () =>
          ({
            json: async () => ({
              success: false,
              error: 'Invalid username or password',
            }),
          } as never)
      )

      await useMerchantStore.getState().login('wrong', 'creds')

      const state = useMerchantStore.getState()
      expect(state.merchant).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.error).toBe('Invalid username or password')
      expect(state.loading).toBe(false)
    })

    it('should handle network error', async () => {
      const { apiClient } = await import('@client/services/apiClient')
      vi.mocked(apiClient.api.merchant.login.$post).mockImplementationOnce(async () => {
        throw new Error('Network error')
      })

      await useMerchantStore.getState().login('testmerchant', 'password123')

      const state = useMerchantStore.getState()
      expect(state.merchant).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.error).toBe('Network error')
      expect(state.loading).toBe(false)
    })

    it('should set loading state during login', async () => {
      let resolveResponse!: () => void
      const responsePromise = new Promise<void>(resolve => {
        resolveResponse = resolve
      })

      const { apiClient } = await import('@client/services/apiClient')
      vi.mocked(apiClient.api.merchant.login.$post).mockImplementationOnce(async () => {
        await responsePromise
        return {
          json: async () => mockLoginResponse,
        }
      })

      const loginPromise = useMerchantStore.getState().login('testmerchant', 'password123')

      expect(useMerchantStore.getState().loading).toBe(true)

      resolveResponse()
      await loginPromise

      expect(useMerchantStore.getState().loading).toBe(false)
    })
  })

  describe('logout', () => {
    it('should clear all auth state on logout', async () => {
      await useMerchantStore.getState().login('testmerchant', 'password123')
      expect(useMerchantStore.getState().isAuthenticated).toBe(true)

      await useMerchantStore.getState().fetchStats()
      expect(useMerchantStore.getState().stats).toEqual(mockStats)

      useMerchantStore.getState().logout()

      const state = useMerchantStore.getState()
      expect(state.merchant).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.stats).toBeNull()
    })
  })

  describe('fetchStats', () => {
    it('should populate stats on successful fetch', async () => {
      await useMerchantStore.getState().fetchStats()

      const state = useMerchantStore.getState()
      expect(state.stats).toEqual(mockStats)
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should handle failed response', async () => {
      const { apiClient } = await import('@client/services/apiClient')
      vi.mocked(apiClient.api.merchant.stats.$get).mockImplementationOnce(
        async () =>
          ({
            json: async () => ({
              success: false,
              error: 'Unauthorized',
            }),
          } as never)
      )

      await useMerchantStore.getState().fetchStats()

      const state = useMerchantStore.getState()
      expect(state.stats).toBeNull()
      expect(state.loading).toBe(false)
    })

    it('should handle network error', async () => {
      const { apiClient } = await import('@client/services/apiClient')
      vi.mocked(apiClient.api.merchant.stats.$get).mockImplementationOnce(async () => {
        throw new Error('Network error')
      })

      await useMerchantStore.getState().fetchStats()

      const state = useMerchantStore.getState()
      expect(state.stats).toBeNull()
      expect(state.error).toBe('Failed to fetch statistics')
      expect(state.loading).toBe(false)
    })
  })

  describe('setLoading / setError', () => {
    it('should update loading state', () => {
      useMerchantStore.getState().setLoading(true)
      expect(useMerchantStore.getState().loading).toBe(true)

      useMerchantStore.getState().setLoading(false)
      expect(useMerchantStore.getState().loading).toBe(false)
    })

    it('should update error state', () => {
      useMerchantStore.getState().setError('Something went wrong')
      expect(useMerchantStore.getState().error).toBe('Something went wrong')

      useMerchantStore.getState().setError(null)
      expect(useMerchantStore.getState().error).toBeNull()
    })

    it('should update loading state via startLoading/stopLoading', () => {
      useMerchantStore.getState().startLoading()
      expect(useMerchantStore.getState().loading).toBe(true)

      useMerchantStore.getState().stopLoading()
      expect(useMerchantStore.getState().loading).toBe(false)
    })
  })
})
