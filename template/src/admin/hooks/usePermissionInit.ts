import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../services/apiClient'
import { useAdminStore } from '../stores/adminStore'
import type { PermissionInit } from '@shared/modules/permission'

interface PermissionInitState {
  data: PermissionInit | null
  loading: boolean
  error: Error | null
}

export function usePermissionInit() {
  const { user, isAuthenticated } = useAdminStore()
  const [state, setState] = useState<PermissionInitState>({
    data: null,
    loading: false,
    error: null,
  })

  const init = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setState({ data: null, loading: false, error: null })
      return
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      const response = await apiClient.api.permissions.init.$get()
      const result = await response.json()

      if (result.success) {
        setState({ data: result.data, loading: false, error: null })
      } else {
        setState({ data: null, loading: false, error: new Error('Failed to init permissions') })
      }
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error })
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    init()
  }, [init])

  return {
    ...state,
    refresh: init,
    permissions: state.data?.permissions ?? [],
    menuConfig: state.data?.menuConfig ?? [],
    pagePermissions: state.data?.pagePermissions ?? [],
    role: state.data?.role ?? null,
  }
}
