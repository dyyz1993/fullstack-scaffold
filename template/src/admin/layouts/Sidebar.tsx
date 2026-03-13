import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, ShoppingCart, Headphones, FileText, AlertTriangle, Settings, Shield, type LucideIcon } from 'lucide-react'
import { usePermissions } from '../hooks/usePermissions'
import { useMenuConfig } from '../hooks/useConfig'
import type { MenuItem } from '@shared/modules/permission'

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Headphones,
  FileText,
  AlertTriangle,
  Settings,
  Shield,
}

interface SidebarProps {
  isOpen: boolean
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const { hasAnyPermission } = usePermissions()
  const { menuConfig, loading } = useMenuConfig()

  const filteredMenuItems = menuConfig.filter((item: MenuItem) => {
    if (!item.permissions || item.permissions.length === 0) {
      return true
    }
    return hasAnyPermission(item.permissions)
  })

  if (loading) {
    return (
      <aside className="bg-gray-900 text-white w-64 overflow-hidden" data-testid="admin-sidebar">
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
          <h1 className="text-lg font-bold">Admin Panel</h1>
        </div>
        <nav className="p-4">
          <div className="text-gray-400">加载中...</div>
        </nav>
      </aside>
    )
  }

  return (
    <aside
      className={`bg-gray-900 text-white transition-all duration-300 ${
        isOpen ? 'w-64' : 'w-0'
      } overflow-hidden`}
      data-testid="admin-sidebar"
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
        <h1 className="text-lg font-bold">Admin Panel</h1>
      </div>
      <nav className="p-4">
        {filteredMenuItems.map((item: MenuItem) => {
          const Icon = ICON_MAP[item.icon] || LayoutDashboard
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
