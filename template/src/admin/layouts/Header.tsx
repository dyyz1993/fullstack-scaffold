import { Menu, Bell, User, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Dropdown, Avatar } from 'antd'
import type { MenuProps } from 'antd'
import { useAdminStore } from '../stores/adminStore'

interface HeaderProps {
  onToggleSidebar: () => void
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const navigate = useNavigate()
  const { user, logout } = useAdminStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: 'Profile',
      icon: <User className="w-4 h-4" />,
    },
    {
      key: 'settings',
      label: 'Settings',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogOut className="w-4 h-4" />,
      danger: true,
      onClick: handleLogout,
    },
  ]

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        data-testid="toggle-sidebar-button"
      >
        <Menu className="w-5 h-5 text-gray-600" />
      </button>

      <div className="flex items-center gap-4">
        <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5 text-gray-600" />
        </button>
        <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={['click']}>
          <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
            <Avatar
              size="small"
              src={user?.avatar}
              icon={!user?.avatar && <User className="w-4 h-4" />}
            />
            <span className="text-sm font-medium text-gray-700">{user?.username || 'Admin'}</span>
          </button>
        </Dropdown>
      </div>
    </header>
  )
}
