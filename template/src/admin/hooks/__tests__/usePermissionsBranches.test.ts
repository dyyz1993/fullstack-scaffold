import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  usePermissionStore,
} from '../usePermissions'
import { Permission, Role } from '@shared/modules/permission'

const mockAdminState: {
  user: { id: string; role: Role } | null
  isAuthenticated: boolean
} = {
  user: { id: 'test-user-1', role: Role.CUSTOMER_SERVICE },
  isAuthenticated: true,
}

vi.mock('@admin/stores/adminStore', () => ({
  useAdminStore: Object.assign(vi.fn(() => mockAdminState), {
    getState: () => mockAdminState,
  }),
}))

vi.mock('@admin/services/apiClient', () => ({
  apiClient: {
    api: {
      permissions: {
        init: {
          $get: vi.fn(async () => ({
            json: async () => ({
              success: true,
              data: {
                permissions: [Permission.USER_VIEW, Permission.CONTENT_VIEW],
                menuConfig: [],
                pagePermissions: [],
                role: Role.CUSTOMER_SERVICE,
              },
            }),
          })),
        },
        roles: {
          $get: vi.fn(async () => ({
            json: async () => ({
              success: true,
              data: [{ role: Role.SUPER_ADMIN, label: '超级管理员', permissions: [] }],
            }),
          })),
        },
        $get: vi.fn(async () => ({
          json: async () => ({
            success: true,
            data: [{ permission: Permission.USER_VIEW, label: '查看用户', category: 'user' }],
          }),
        })),
      },
    },
  },
}))

describe('usePermissionStore - branch coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePermissionStore.setState({
      permissions: [],
      role: null,
      roles: [],
      allPermissions: [],
      menuConfig: [],
      pagePermissions: [],
      loading: false,
      initialized: false,
    })
  })

  it('should not fetch when not authenticated', async () => {
    mockAdminState.isAuthenticated = false
    mockAdminState.user = null

    await usePermissionStore.getState().initPermissions()

    const state = usePermissionStore.getState()
    expect(state.permissions).toEqual([])
    expect(state.role).toBeNull()
    expect(state.initialized).toBe(true)

    mockAdminState.isAuthenticated = true
    mockAdminState.user = { id: 'test-user-1', role: Role.CUSTOMER_SERVICE }
  })

  it('should handle API error in initPermissions', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.permissions.init.$get).mockRejectedValueOnce(new Error('Network error'))

    await usePermissionStore.getState().initPermissions()

    const state = usePermissionStore.getState()
    expect(state.loading).toBe(false)
    expect(state.initialized).toBe(true)
    expect(state.role).toBe(Role.CUSTOMER_SERVICE)
    expect(state.permissions).toEqual([])

    consoleSpy.mockRestore()
  })

  it('should handle API error in initPermissions with no user', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockAdminState.user = null
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.permissions.init.$get).mockRejectedValueOnce(new Error('Network error'))

    await usePermissionStore.getState().initPermissions()

    const state = usePermissionStore.getState()
    expect(state.role).toBeNull()
    expect(state.loading).toBe(false)
    expect(state.initialized).toBe(true)

    mockAdminState.user = { id: 'test-user-1', role: Role.CUSTOMER_SERVICE }
    consoleSpy.mockRestore()
  })

  it('should handle roles fetch failure in fetchStaticData', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.permissions.roles.$get).mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'Failed' }),
    } as any)
    vi.mocked(apiClient.api.permissions.$get).mockResolvedValueOnce({
      json: async () => ({ success: true, data: [], timestamp: new Date().toISOString() }),
    } as any)

    await usePermissionStore.getState().fetchStaticData()

    expect(usePermissionStore.getState().roles).toEqual([])
    consoleSpy.mockRestore()
  })

  it('should handle permissions fetch failure in fetchStaticData', async () => {
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.permissions.roles.$get).mockResolvedValueOnce({
      json: async () => ({ success: true, data: [{ role: Role.USER, label: 'User', permissions: [] }], timestamp: new Date().toISOString() }),
    } as any)
    vi.mocked(apiClient.api.permissions.$get).mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'Failed' }),
    } as any)

    await usePermissionStore.getState().fetchStaticData()

    expect(usePermissionStore.getState().roles).toEqual([{ role: Role.USER, label: 'User', permissions: [] }])
    expect(usePermissionStore.getState().allPermissions).toEqual([])
  })

  it('should handle network error in fetchStaticData', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.permissions.roles.$get).mockRejectedValueOnce(new Error('Network error'))

    await usePermissionStore.getState().fetchStaticData()

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should successfully fetch static data', async () => {
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.permissions.roles.$get).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: [{ role: Role.SUPER_ADMIN, label: '超级管理员', permissions: [] }],
        timestamp: new Date().toISOString(),
      }),
    } as any)
    vi.mocked(apiClient.api.permissions.$get).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: [{ permission: Permission.USER_VIEW, label: '查看用户', category: 'user' }],
        timestamp: new Date().toISOString(),
      }),
    } as any)

    await usePermissionStore.getState().fetchStaticData()

    expect(usePermissionStore.getState().roles).toEqual([
      { role: Role.SUPER_ADMIN, label: '超级管理员', permissions: [] },
    ])
    expect(usePermissionStore.getState().allPermissions).toEqual([
      { permission: Permission.USER_VIEW, label: '查看用户', category: 'user' },
    ])
  })
})
