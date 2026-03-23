import { Menu, User, LogOut, Building2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Dropdown, Avatar, Button, Tag } from 'antd'
import type { MenuProps } from 'antd'
import { useTenantStore } from '../stores/tenantStore'

interface TenantHeaderProps {
  onToggleSidebar: () => void
}

const planColors: Record<string, string> = {
  free: 'blue',
  starter: 'green',
  pro: 'gold',
  enterprise: 'purple',
}

const planLabels: Record<string, string> = {
  free: '免费版',
  starter: '入门版',
  pro: '专业版',
  enterprise: '企业版',
}

export const TenantHeader: React.FC<TenantHeaderProps> = ({ onToggleSidebar }) => {
  const navigate = useNavigate()
  const { currentTenant } = useTenantStore()

  const menuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: '个人资料',
      icon: <User className="w-4 h-4" />,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogOut className="w-4 h-4" />,
      danger: true,
    },
  ]

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          data-testid="toggle-sidebar-button"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>

        {currentTenant && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-900">{currentTenant.name}</span>
            </div>
            <Tag color={planColors[currentTenant.plan] || 'blue'}>
              {planLabels[currentTenant.plan] || currentTenant.plan}
            </Tag>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {currentTenant?.plan === 'free' && (
          <Button type="primary" onClick={() => navigate(`/tenants/${currentTenant.id}/billing`)}>
            升级套餐
          </Button>
        )}

        <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={['click']}>
          <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
            <Avatar size="small" icon={<User className="w-4 h-4" />} />
          </button>
        </Dropdown>
      </div>
    </header>
  )
}
