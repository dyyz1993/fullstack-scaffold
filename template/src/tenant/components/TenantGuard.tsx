import { Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Spin } from 'antd'
import { useTenantStore } from '../stores/tenantStore'

interface TenantGuardProps {
  children: React.ReactNode
}

export const TenantGuard: React.FC<TenantGuardProps> = ({ children }) => {
  const location = useLocation()
  const { isAuthenticated, currentTenant, loading, fetchCurrentTenant } = useTenantStore()

  useEffect(() => {
    const tenantSlug = extractTenantSlug()
    if (tenantSlug) {
      fetchCurrentTenant(tenantSlug)
    }
  }, [fetchCurrentTenant])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!currentTenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" tip="Loading tenant..." />
      </div>
    )
  }

  return <>{children}</>
}

function extractTenantSlug(): string | null {
  const hostname = window.location.hostname

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const parts = hostname.split('.')
    if (parts.length >= 2 && parts[0] !== 'localhost') {
      return parts[0]
    }
    return localStorage.getItem('current-tenant-slug')
  }

  const parts = hostname.split('.')
  if (parts.length >= 3) {
    return parts[0]
  }

  return null
}
