import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useRoleStore } from '../useRoles'

vi.mock('@admin/services/apiClient', () => ({
  apiClient: {
    api: {
      roles: {
        $get: vi.fn(),
        $post: vi.fn(),
        ':id': {
          $put: vi.fn(),
          $delete: vi.fn(),
          permissions: {
            $put: vi.fn(),
          },
        },
      },
    },
  },
}))

describe('useRoleStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useRoleStore.setState({
      roles: [],
      loading: false,
      error: null,
    })
  })

  it('should have correct initial state', () => {
    const state = useRoleStore.getState()
    expect(state.roles).toEqual([])
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('should fetch roles successfully', async () => {
    const mockRoles = [
      { id: '1', name: 'admin', permissions: [], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    ]
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.roles.$get).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockRoles }),
    })

    await useRoleStore.getState().fetchRoles()

    expect(useRoleStore.getState().roles).toEqual(mockRoles)
    expect(useRoleStore.getState().loading).toBe(false)
  })

  it('should handle fetch roles failure', async () => {
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.roles.$get).mockResolvedValueOnce({
      json: async () => ({ success: false }),
    })

    await useRoleStore.getState().fetchRoles()

    expect(useRoleStore.getState().error).toBe('Failed to fetch roles')
    expect(useRoleStore.getState().loading).toBe(false)
  })

  it('should handle fetch roles network error', async () => {
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.roles.$get).mockRejectedValueOnce(new Error('Network error'))

    await useRoleStore.getState().fetchRoles()

    expect(useRoleStore.getState().error).toBe('Network error')
  })

  it('should create role successfully', async () => {
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.roles.$post).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { id: '2' } }),
    })
    vi.mocked(apiClient.api.roles.$get).mockResolvedValueOnce({
      json: async () => ({ success: true, data: [] }),
    })

    const result = await useRoleStore.getState().createRole({ name: 'editor', permissions: [] })

    expect(result).toBe(true)
  })

  it('should handle create role failure', async () => {
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.roles.$post).mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'Name exists' }),
    })

    const result = await useRoleStore.getState().createRole({ name: 'dup', permissions: [] })

    expect(result).toBe(false)
    expect(useRoleStore.getState().error).toBe('Name exists')
  })

  it('should handle create role error without message', async () => {
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.roles.$post).mockResolvedValueOnce({
      json: async () => ({ success: false }),
    })

    const result = await useRoleStore.getState().createRole({ name: 'dup', permissions: [] })

    expect(result).toBe(false)
    expect(useRoleStore.getState().error).toBe('Failed to create role')
  })

  it('should handle create role network error', async () => {
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.roles.$post).mockRejectedValueOnce(new Error('Network error'))

    const result = await useRoleStore.getState().createRole({ name: 'x', permissions: [] })

    expect(result).toBe(false)
    expect(useRoleStore.getState().error).toBe('Network error')
  })

  it('should update role successfully', async () => {
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.roles[':id'].$put).mockResolvedValueOnce({
      json: async () => ({ success: true }),
    })
    vi.mocked(apiClient.api.roles.$get).mockResolvedValueOnce({
      json: async () => ({ success: true, data: [] }),
    })

    const result = await useRoleStore.getState().updateRole('1', { name: 'updated' })

    expect(result).toBe(true)
  })

  it('should handle update role failure', async () => {
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.roles[':id'].$put).mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'Not found' }),
    })

    const result = await useRoleStore.getState().updateRole('999', { name: 'x' })

    expect(result).toBe(false)
    expect(useRoleStore.getState().error).toBe('Not found')
  })

  it('should handle update role error without message', async () => {
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.roles[':id'].$put).mockResolvedValueOnce({
      json: async () => ({ success: false }),
    })

    const result = await useRoleStore.getState().updateRole('1', { name: 'x' })

    expect(result).toBe(false)
    expect(useRoleStore.getState().error).toBe('Failed to update role')
  })

  it('should handle update role network error', async () => {
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.roles[':id'].$put).mockRejectedValueOnce(new Error('Network error'))

    const result = await useRoleStore.getState().updateRole('1', { name: 'x' })

    expect(result).toBe(false)
    expect(useRoleStore.getState().error).toBe('Network error')
  })

  it('should delete role successfully', async () => {
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.roles[':id'].$delete).mockResolvedValueOnce({
      json: async () => ({ success: true }),
    })
    vi.mocked(apiClient.api.roles.$get).mockResolvedValueOnce({
      json: async () => ({ success: true, data: [] }),
    })

    const result = await useRoleStore.getState().deleteRole('1')

    expect(result).toBe(true)
  })

  it('should handle delete role failure', async () => {
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.roles[':id'].$delete).mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'Cannot delete' }),
    })

    const result = await useRoleStore.getState().deleteRole('1')

    expect(result).toBe(false)
    expect(useRoleStore.getState().error).toBe('Cannot delete')
  })

  it('should handle delete role error without message', async () => {
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.roles[':id'].$delete).mockResolvedValueOnce({
      json: async () => ({ success: false }),
    })

    const result = await useRoleStore.getState().deleteRole('1')

    expect(result).toBe(false)
    expect(useRoleStore.getState().error).toBe('Failed to delete role')
  })

  it('should update role permissions successfully', async () => {
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.roles[':id'].permissions.$put).mockResolvedValueOnce({
      json: async () => ({ success: true }),
    })

    const result = await useRoleStore.getState().updateRolePermissions('1', ['user:view'])

    expect(result).toBe(true)
    expect(useRoleStore.getState().loading).toBe(false)
  })

  it('should handle update role permissions failure', async () => {
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.roles[':id'].permissions.$put).mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'Invalid permissions' }),
    })

    const result = await useRoleStore.getState().updateRolePermissions('1', ['invalid'])

    expect(result).toBe(false)
    expect(useRoleStore.getState().error).toBe('Invalid permissions')
  })

  it('should handle update role permissions error without message', async () => {
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.roles[':id'].permissions.$put).mockResolvedValueOnce({
      json: async () => ({ success: false }),
    })

    const result = await useRoleStore.getState().updateRolePermissions('1', [])

    expect(result).toBe(false)
    expect(useRoleStore.getState().error).toBe('Failed to update role permissions')
  })

  it('should handle update role permissions network error', async () => {
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api.roles[':id'].permissions.$put).mockRejectedValueOnce(new Error('Timeout'))

    const result = await useRoleStore.getState().updateRolePermissions('1', ['user:view'])

    expect(result).toBe(false)
    expect(useRoleStore.getState().error).toBe('Timeout')
  })
})
