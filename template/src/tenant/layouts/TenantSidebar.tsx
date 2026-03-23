import { NavLink, useParams, useNavigate } from 'react-router-dom'
import { Building2, Users, Shield, Settings, CreditCard, ChevronLeft, Plus } from 'lucide-react'
import { useTenantStore, type Tenant } from '../stores/tenantStore'

interface TenantSidebarProps {
  isOpen: boolean
}

const menuItems = [
  { path: 'members', label: '成员管理', icon: Users },
  { path: 'roles', label: '角色管理', icon: Shield },
  { path: 'settings', label: '设置', icon: Settings },
  { path: 'billing', label: '账单', icon: CreditCard },
]

export const TenantSidebar: React.FC<TenantSidebarProps> = ({ isOpen }) => {
  const { tenantId } = useParams<{ tenantId: string }>()
  const navigate = useNavigate()
  const { tenants, currentTenant, setCurrentTenant } = useTenantStore()

  const handleTenantSwitch = (tenant: Tenant) => {
    setCurrentTenant(tenant)
    navigate(`/tenants/${tenant.id}/members`)
  }

  const handleCreateTenant = () => {
    navigate('/tenants/new')
  }

  return (
    <aside
      className={`bg-gray-900 text-white transition-all duration-300 flex flex-col ${
        isOpen ? 'w-64' : 'w-0'
      } overflow-hidden`}
      data-testid="tenant-sidebar"
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-blue-400" />
          <span className="text-lg font-bold">租户管理</span>
        </div>
      </div>

      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 uppercase tracking-wider">当前租户</span>
          <button
            onClick={handleCreateTenant}
            className="p-1 rounded hover:bg-gray-800 transition-colors"
            title="创建租户"
          >
            <Plus className="w-4 h-4 text-gray-400 hover:text-white" />
          </button>
        </div>

        {currentTenant ? (
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-sm font-medium">
                {currentTenant.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{currentTenant.name}</div>
                <div className="text-xs text-gray-400">{currentTenant.plan} 套餐</div>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={handleCreateTenant}
            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
          >
            创建第一个租户
          </button>
        )}

        {tenants.length > 1 && (
          <div className="mt-2">
            <div className="text-xs text-gray-400 mb-1">切换租户</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {tenants
                .filter(t => t.id !== currentTenant?.id)
                .map(tenant => (
                  <button
                    key={tenant.id}
                    onClick={() => handleTenantSwitch(tenant)}
                    className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-gray-800 transition-colors truncate"
                  >
                    {tenant.name}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {tenantId && (
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {menuItems.map(item => {
              const Icon = item.icon
              const fullPath = `/tenants/${tenantId}/${item.path}`
              return (
                <NavLink
                  key={item.path}
                  to={fullPath}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </div>
        </nav>
      )}

      <div className="p-4 border-t border-gray-800">
        <NavLink
          to="/tenants"
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>返回租户列表</span>
        </NavLink>
      </div>
    </aside>
  )
}
