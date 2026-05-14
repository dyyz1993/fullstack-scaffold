import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { Breadcrumb, Select, Avatar, Dropdown, Layout as AntLayout, theme } from 'antd'
import type { MenuProps } from 'antd'
import { User, LogOut, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '../stores/adminStore'
import { useAdminNotifications } from '../hooks/useAdminNotifications'
import { NotificationDrawer, NotificationBell } from '../components/NotificationDrawer'
import { AccountSwitcher } from '../components/AccountSwitcher'
import { useEffect, useState } from 'react'

interface HeaderProps {
  collapsed: boolean
  onToggle: () => void
}

const ROLE_OPTIONS = [
  { label: 'Super Admin', value: 'super_admin' },
  { label: 'Moderator', value: 'moderator' },
  { label: 'Operator', value: 'operator' },
]

export const Header: React.FC<HeaderProps> = ({ collapsed, onToggle }) => {
  const navigate = useNavigate()
  const { user, logout } = useAdminStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { status, notifications, unreadCount, connect, markAsRead, markAllAsRead } =
    useAdminNotifications()

  useEffect(() => {
    if (status === 'closed') {
      connect()
    }
  }, [status, connect])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: 'Profile',
      icon: <User className="w-4 h-4" />,
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
      onClick: () => navigate('/settings'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogOut className="w-4 h-4" />,
      danger: true,
      onClick: handleLogout,
    },
  ]

  const { token } = theme.useToken()

  return (
    <>
      <AntLayout.Header
        className="flex items-center justify-between px-6 bg-white border-b border-gray-200"
        style={{
          paddingInline: 24,
          height: 64,
          lineHeight: '64px',
          backgroundColor: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
        data-testid="admin-header"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border-none bg-transparent"
            data-testid="toggle-sidebar-button"
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>

          <Breadcrumb
            items={[{ title: 'Home' }, { title: 'Dashboard' }]}
            style={{ fontSize: 14 }}
          />
        </div>

        <div className="flex items-center gap-3">
          <Select
            size="small"
            defaultValue="super_admin"
            options={ROLE_OPTIONS}
            style={{ width: 130 }}
            data-testid="role-switcher"
          />

          <NotificationBell unreadCount={unreadCount} onClick={() => setDrawerOpen(true)} />
          <AccountSwitcher />
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
            <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border-none bg-transparent">
              <Avatar
                size={32}
                src={user?.avatar}
                icon={!user?.avatar && <User className="w-4 h-4" />}
              />
            </button>
          </Dropdown>
        </div>
      </AntLayout.Header>

      <NotificationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        loading={status === 'connecting'}
      />
    </>
  )
}
