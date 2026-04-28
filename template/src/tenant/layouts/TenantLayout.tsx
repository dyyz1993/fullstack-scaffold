import type { ReactNode } from 'react'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { TenantSidebar } from './TenantSidebar'
import { TenantHeader } from './TenantHeader'

interface TenantLayoutProps {
  children?: ReactNode
}

export const TenantLayout: React.FC<TenantLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen bg-gray-100">
      <TenantSidebar isOpen={sidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TenantHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-6" data-testid="tenant-main">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  )
}
