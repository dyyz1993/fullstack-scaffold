import { Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Spin } from 'antd'
import { useTenantStore } from '../stores/tenantStore'

interface TenantGuardProps {
  children: React.ReactNode
}

export const TenantGuard: React.FC<TenantGuardProps> = ({ children }) => {
  const location = useLocation()
  const { isAuthenticated, currentTenant, loading, fetchCurrentTenant, restoreFromToken } =
    useTenantStore()

  useEffect(() => {
    // 已有租户上下文即短路——fetch 会 set 新对象，若把它放进依赖/重复
    // 触发会形成无限请求循环（250ms 内百次请求打满限流被弹回登录）
    if (currentTenant) return
    if (!isAuthenticated) return

    const tenantSlug = extractTenantSlug()
    if (tenantSlug) {
      fetchCurrentTenant(tenantSlug)
      return
    }
    // 无 slug（如邀请接受后直跳）：token 在则从 mine 恢复租户上下文
    restoreFromToken()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentTenant])

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
