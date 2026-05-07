import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Role, Permission } from '@shared/modules/permission'
import type { AuthUserResponse, SystemStats, LoginResponse } from '@shared/modules/admin'

interface AdminState {
  user: AuthUserResponse | null
  token: string | null
  isAuthenticated: boolean
  stats: SystemStats | null
  loading: boolean
  login: (username: string, password: string) => Promise<LoginResponse>
  logout: () => void
  fetchStats: () => Promise<void>
  setUser: (user: AuthUserResponse) => void
  setToken: (token: string) => void
}

const localStorageStore: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => {
    localStorageStore[key] = String(value)
  },
  removeItem: (key: string) => {
    delete localStorageStore[key]
  },
  clear: () => {
    Object.keys(localStorageStore).forEach(k => delete localStorageStore[k])
  },
  get length() {
    return Object.keys(localStorageStore).length
  },
  key: (_i: number) => null,
}

vi.stubGlobal('localStorage', localStorageMock)

vi.mock('@admin/services/apiClient', () => ({
  apiClient: {
    api: {
      admin: {
        login: {
          $post: vi.fn(async () => ({
            json: async () => ({
              success: true,
              data: {
                user: { id: '1', username: 'admin', email: 'a@t.com', role: Role.SUPER_ADMIN, avatar: null, permissions: [] },
                token: 'token',
              },
            }),
          })),
        },
        stats: {
          $get: vi.fn(async () => ({
            json: async () => ({
              success: true,
              data: { totalTodos: 1, pendingTodos: 0, completedTodos: 1, lastUpdated: '2024-01-01' },
            }),
          })),
        },
      },
    },
  },
}))

vi.mock('@admin/hooks/usePermissions', () => ({
  usePermissionStore: {
    getState: () => ({
      initPermissions: vi.fn(),
      reset: vi.fn(),
    }),
  },
}))

describe('useAdminStore - branch coverage', () => {
  let useAdminStore: { getState: () => AdminState; setState: (s: Partial<AdminState>) => void }

  beforeEach(async () => {
    const mod = await import('../adminStore')
    useAdminStore = mod.useAdminStore
    localStorageMock.clear()
    useAdminStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      stats: null,
      loading: false,
    })
    vi.clearAllMocks()
  })

  it('should handle login error with default message', async () => {
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.admin.login.$post).mockImplementationOnce(
      async () =>
        ({
          json: async () => ({ success: false, error: '' }),
        }) as never
    )

    await expect(useAdminStore.getState().login('a', 'b')).rejects.toThrow('Login failed')
    expect(useAdminStore.getState().loading).toBe(false)
  })

  it('should handle fetchStats error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.admin.stats.$get).mockRejectedValueOnce(new Error('Network error'))

    await useAdminStore.getState().fetchStats()

    expect(consoleSpy).toHaveBeenCalled()
    expect(useAdminStore.getState().stats).toBeNull()
    consoleSpy.mockRestore()
  })

  it('should handle fetchStats with unsuccessful response', async () => {
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.admin.stats.$get).mockResolvedValueOnce({
      json: async () => ({ success: false }),
    })

    await useAdminStore.getState().fetchStats()

    expect(useAdminStore.getState().stats).toBeNull()
  })

  it('should throw on login network error', async () => {
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.admin.login.$post).mockRejectedValueOnce(new Error('Network'))

    await expect(useAdminStore.getState().login('a', 'b')).rejects.toThrow('Network')
    expect(useAdminStore.getState().loading).toBe(false)
  })
})
