/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuditLogStore } from '../useAuditLogs'

vi.mock('@admin/services/apiClient', () => ({
  apiClient: {
    api: {
      'audit-logs': {
        $get: vi.fn(),
      },
    },
  },
}))

describe('useAuditLogStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuditLogStore.setState({
      logs: [],
      loading: false,
      error: null,
    })
  })

  it('should have correct initial state', () => {
    const state = useAuditLogStore.getState()
    expect(state.logs).toEqual([])
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('should fetch logs successfully', async () => {
    const mockLogs = [
      {
        id: '1',
        action: 'create',
        resourceType: 'user',
        userId: 'u1',
        timestamp: '2024-01-01',
        details: {},
      },
    ]
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api['audit-logs'].$get).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockLogs, timestamp: new Date().toISOString() }),
    } as any)

    await useAuditLogStore.getState().fetchLogs()

    const state = useAuditLogStore.getState()
    expect(state.logs).toEqual(mockLogs)
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('should handle fetch with params', async () => {
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api['audit-logs'].$get).mockResolvedValueOnce({
      json: async () => ({ success: true, data: [], timestamp: new Date().toISOString() }),
    } as any)

    await useAuditLogStore.getState().fetchLogs({
      userId: 'user1',
      action: 'create',
      resourceType: 'user',
    })

    expect(apiClient.api['audit-logs'].$get).toHaveBeenCalledWith({
      query: { userId: 'user1', action: 'create', resourceType: 'user' },
    })
  })

  it('should handle failed response', async () => {
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api['audit-logs'].$get).mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'Failed' }),
    } as any)

    await useAuditLogStore.getState().fetchLogs()

    const state = useAuditLogStore.getState()
    expect(state.error).toBe('Failed to fetch audit logs')
    expect(state.loading).toBe(false)
  })

  it('should handle network error', async () => {
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api['audit-logs'].$get).mockRejectedValueOnce(new Error('Network error'))

    await useAuditLogStore.getState().fetchLogs()

    const state = useAuditLogStore.getState()
    expect(state.error).toBe('Network error')
    expect(state.loading).toBe(false)
  })

  it('should handle fetch with partial params', async () => {
    const { apiClient } = await import('@admin/services/apiClient')
    vi.mocked(apiClient.api['audit-logs'].$get).mockResolvedValueOnce({
      json: async () => ({ success: true, data: [], timestamp: new Date().toISOString() }),
    } as any)

    await useAuditLogStore.getState().fetchLogs({ userId: 'user1' })

    expect(apiClient.api['audit-logs'].$get).toHaveBeenCalledWith({
      query: { userId: 'user1' },
    })
  })
})
