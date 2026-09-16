import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { Breadcrumb, Select, Avatar, Dropdown, Layout as AntLayout, theme } from 'antd'
import type { MenuProps } from 'antd'
import { User, LogOut, Settings } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAdminStore } from '../stores/adminStore'
import { useAdminNotifications } from '../hooks/useAdminNotifications'
import { NotificationDrawer, NotificationBell } from '../components/NotificationDrawer'
import { AccountSwitcher } from '../components/AccountSwitcher'
import { ThemeToggle } from '../components/ThemeToggle'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { useLanguage } from '../i18n/useLanguage'
import { useEffect, useState, useMemo } from 'react'

interface HeaderProps {
  collapsed: boolean
  onToggle: () => void
}

export const Header: React.FC<HeaderProps> = ({ collapsed, onToggle }) => {
  const navigate = useNavigate()
  const { user, logout } = useAdminStore()
  const { t } = useLanguage()
  const { token } = theme.useToken()
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

  const ROLE_OPTIONS = useMemo(
    () => [
      { label: t('header.superAdmin'), value: 'super_admin' },
      { label: t('header.moderator'), value: 'moderator' },
      { label: t('header.operator'), value: 'operator' },
    ],
    [t]
  )

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: t('header.profile'),
      icon: <User className="w-4 h-4" />,
    },
    {
      key: 'settings',
      label: t('header.settings'),
      icon: <Settings className="w-4 h-4" />,
      onClick: () => navigate('/settings'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: t('header.logout'),
      icon: <LogOut className="w-4 h-4" />,
      danger: true,
      onClick: handleLogout,
    },
  ]

  // 面包屑随路由：[组名, 页面名]（与 Sidebar 菜单结构对应）
  const location = useLocation()
  const breadcrumbItems = useMemo(() => {
    const pageMap: Array<[RegExp, string, string]> = [
      [/^\/dashboard/, '', t('sidebar.dashboard')],
      [/^\/content/, t('sidebar.content'), t('sidebar.contentList')],
      [/^\/plugins\/review/, t('sidebar.plugins'), t('sidebar.pluginsReview')],
      [/^\/plugins\/dashboard/, t('sidebar.plugins'), t('sidebar.pluginsDashboard')],
      [/^\/plugins/, t('sidebar.plugins'), t('sidebar.pluginsList')],
      [/^\/categories/, t('sidebar.plugins'), t('sidebar.categories')],
      [/^\/users/, t('sidebar.usersOrders'), t('sidebar.users')],
      [/^\/orders/, t('sidebar.usersOrders'), t('sidebar.orders')],
      [/^\/tickets/, t('sidebar.usersOrders'), t('sidebar.tickets')],
      [/^\/disputes/, t('sidebar.usersOrders'), t('sidebar.disputes')],
      [/^\/system\/roles/, t('sidebar.system'), t('sidebar.roles')],
      [/^\/system\/settings/, t('sidebar.system'), t('sidebar.settings')],
      [/^\/system\/logs/, t('sidebar.system'), t('sidebar.logs')],
      [/^\/system\/permissions/, t('sidebar.system'), t('sidebar.permissions')],
      [/^\/settings/, '', t('sidebar.settings')],
    ]
    const match = pageMap.find(([re]) => re.test(location.pathname))
    const items = [{ title: t('header.home') }]
    if (match) {
      if (match[1]) items.push({ title: match[1] })
      items.push({ title: match[2] })
    } else {
      items.push({ title: t('header.dashboard') })
    }
    return items
  }, [location.pathname, t])

  return (
    <>
      <AntLayout.Header
        className="flex items-center justify-between px-6"
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
            className="p-2 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
            style={{ color: token.colorText }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = token.colorFillQuaternary
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            data-testid="toggle-sidebar-button"
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>

          <Breadcrumb items={breadcrumbItems} style={{ fontSize: 14 }} />
        </div>

        <div className="flex items-center gap-3">
          <Select
            size="small"
            defaultValue="super_admin"
            options={ROLE_OPTIONS}
            style={{ width: 130 }}
            data-testid="role-switcher"
          />

          <LanguageSwitcher />
          <ThemeToggle />
          <NotificationBell unreadCount={unreadCount} onClick={() => setDrawerOpen(true)} />
          <AccountSwitcher />
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
            <button
              className="flex items-center gap-2 p-1.5 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
              style={{ color: token.colorText }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = token.colorFillQuaternary
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
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
