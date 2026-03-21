/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAdminStore } from '../stores/adminStore'
import { apiClient } from '../services/apiClient'
import {
  Permission,
  Role,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from '@shared/modules/permission'
import type {
  RoleInfo,
  PermissionInfo,
  MenuItem,
  PagePermissionConfig,
} from '@shared/modules/permission'

interface PermissionContextValue {
  permissions: Permission[]
  role: Role | null
  roles: RoleInfo[]
  allPermissions: PermissionInfo[]
  menuConfig: MenuItem[]
  pagePermissions: PagePermissionConfig[]
  loading: boolean
  initialized: boolean
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
  hasAllPermissions: (permissions: Permission[]) => boolean
  refreshPermissions: () => Promise<void>
}

const PermissionContext = createContext<PermissionContextValue | null>(null)

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAdminStore()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [role, setRole] = useState<Role | null>(null)
  const [roles, setRoles] = useState<RoleInfo[]>([])
  const [allPermissions, setAllPermissions] = useState<PermissionInfo[]>([])
  const [menuConfig, setMenuConfig] = useState<MenuItem[]>([])
  const [pagePermissions, setPagePermissions] = useState<PagePermissionConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const fetchStaticData = useCallback(async () => {
    try {
      const [rolesRes, permissionsRes] = await Promise.all([
        apiClient.api.permissions.roles.$get(),
        apiClient.api.permissions.$get(),
      ])

      const rolesData = await rolesRes.json()
      const permissionsData = await permissionsRes.json()

      if (rolesData.success) {
        setRoles(rolesData.data)
      }

      if (permissionsData.success) {
        setAllPermissions(permissionsData.data)
      }
    } catch (error) {
      console.error('Failed to fetch static data:', error)
    }
  }, [])

  const refreshPermissions = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setPermissions([])
      setRole(null)
      setMenuConfig([])
      setPagePermissions([])
      setInitialized(true)
      return
    }

    try {
      setLoading(true)
      const response = await apiClient.api.permissions.init.$get()
      const data = await response.json()

      if (data.success) {
        setPermissions(data.data.permissions)
        setRole(data.data.role)
        setMenuConfig(data.data.menuConfig)
        setPagePermissions(data.data.pagePermissions)
      }
    } catch (error) {
      console.error('Failed to fetch user permissions:', error)
      if (user.role) {
        setRole(user.role)
        setPermissions([])
      }
    } finally {
      setLoading(false)
      setInitialized(true)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    fetchStaticData()
  }, [fetchStaticData])

  useEffect(() => {
    refreshPermissions()
  }, [refreshPermissions])

  const checkPermission = useCallback(
    (permission: Permission) => {
      return hasPermission(permissions, permission)
    },
    [permissions]
  )

  const checkAnyPermission = useCallback(
    (perms: Permission[]) => {
      return hasAnyPermission(permissions, perms)
    },
    [permissions]
  )

  const checkAllPermissions = useCallback(
    (perms: Permission[]) => {
      return hasAllPermissions(permissions, perms)
    },
    [permissions]
  )

  const value: PermissionContextValue = {
    permissions,
    role,
    roles,
    allPermissions,
    menuConfig,
    pagePermissions,
    loading,
    initialized,
    hasPermission: checkPermission,
    hasAnyPermission: checkAnyPermission,
    hasAllPermissions: checkAllPermissions,
    refreshPermissions,
  }

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>
}

export function usePermissions() {
  const context = useContext(PermissionContext)
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider')
  }
  return context
}

export function useHasPermission(permission: Permission): boolean {
  const { hasPermission } = usePermissions()
  return hasPermission(permission)
}

export function useHasAnyPermission(permissions: Permission[]): boolean {
  const { hasAnyPermission } = usePermissions()
  return hasAnyPermission(permissions)
}

export function useHasAllPermissions(permissions: Permission[]): boolean {
  const { hasAllPermissions } = usePermissions()
  return hasAllPermissions(permissions)
}

export function useMenuConfig() {
  const { menuConfig, loading, initialized } = usePermissions()
  return { menuConfig, loading, initialized }
}

export function usePagePermissions() {
  const { pagePermissions, loading, initialized } = usePermissions()
  return { pagePermissions, loading, initialized }
}
