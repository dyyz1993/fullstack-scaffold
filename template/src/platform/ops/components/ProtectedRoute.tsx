import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useOpsStore } from '@ops/stores/opsStore'
import { usePermissionStore } from '../hooks/usePermissions'
import { Role } from '@platform/shared/permission'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: Role
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const location = useLocation()
  const { isAuthenticated, user } = useOpsStore()
  const { initialized, initPermissions, fetchStaticData } = usePermissionStore()

  useEffect(() => {
    if (isAuthenticated && !initialized) {
      initPermissions()
      fetchStaticData()
    }
  }, [isAuthenticated, initialized, initPermissions, fetchStaticData])

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole && user?.role !== requiredRole && user?.role !== Role.SUPER_ADMIN) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
