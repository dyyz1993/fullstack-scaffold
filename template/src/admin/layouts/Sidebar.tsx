import { Layout, Menu } from 'antd'
import {
  DashboardOutlined,
  FileTextOutlined,
  TeamOutlined,
  SettingOutlined,
  RocketOutlined,
} from '@ant-design/icons'
import { NavLink, useLocation } from 'react-router-dom'
import { useLanguage } from '../i18n/useLanguage'

interface SidebarProps {
  collapsed: boolean
  onCollapse: (collapsed: boolean) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onCollapse }) => {
  const { t } = useLanguage()
  const location = useLocation()

  const MENU_ITEMS = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: <NavLink to="/dashboard">{t('sidebar.dashboard')}</NavLink>,
    },
    {
      key: 'content',
      icon: <FileTextOutlined />,
      label: t('sidebar.content'),
      children: [
        {
          key: 'content-list',
          label: <NavLink to="/content">{t('sidebar.contentList')}</NavLink>,
        },
        {
          key: 'categories',
          label: <NavLink to="/categories">{t('sidebar.categories')}</NavLink>,
        },
      ],
    },
    {
      key: 'users-orders',
      icon: <TeamOutlined />,
      label: t('sidebar.usersOrders'),
      children: [
        {
          key: 'users',
          label: <NavLink to="/users">{t('sidebar.users')}</NavLink>,
        },
        {
          key: 'orders',
          label: <NavLink to="/orders">{t('sidebar.orders')}</NavLink>,
        },
        {
          key: 'tickets',
          label: <NavLink to="/tickets">{t('sidebar.tickets')}</NavLink>,
        },
        {
          key: 'disputes',
          label: <NavLink to="/disputes">{t('sidebar.disputes')}</NavLink>,
        },
      ],
    },
    {
      key: 'system',
      icon: <SettingOutlined />,
      label: t('sidebar.system'),
      children: [
        {
          key: 'roles',
          label: <NavLink to="/system/roles">{t('sidebar.roles')}</NavLink>,
        },
        {
          key: 'system-settings',
          label: <NavLink to="/system/settings">{t('sidebar.settings')}</NavLink>,
        },
        {
          key: 'logs',
          label: <NavLink to="/system/logs">{t('sidebar.logs')}</NavLink>,
        },
      ],
    },
  ]

  const getSelectedKey = () => {
    const path = location.pathname
    if (path === '/dashboard') return 'dashboard'
    if (path.startsWith('/content')) return 'content-list'
    if (path.startsWith('/categories')) return 'categories'
    if (path.startsWith('/users')) return 'users'
    if (path.startsWith('/orders')) return 'orders'
    if (path.startsWith('/tickets')) return 'tickets'
    if (path.startsWith('/disputes')) return 'disputes'
    if (path.startsWith('/system/roles')) return 'roles'
    if (path.startsWith('/system/settings')) return 'system-settings'
    if (path.startsWith('/system/logs')) return 'logs'
    return 'dashboard'
  }

  return (
    <Layout.Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      trigger={null}
      width={256}
      collapsedWidth={80}
      className="!bg-[#001529]"
      data-testid="admin-sidebar"
    >
      <div
        className="h-16 flex items-center justify-center border-b border-gray-700 overflow-hidden transition-all duration-300"
        data-testid="admin-sidebar-logo"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
            <RocketOutlined className="text-white text-base" />
          </div>
          {!collapsed && (
            <span className="text-white font-semibold text-base whitespace-nowrap tracking-tight">
              Biomimic
            </span>
          )}
        </div>
      </div>

      <Menu
        mode="inline"
        selectedKeys={[getSelectedKey()]}
        defaultOpenKeys={['content', 'users-orders', 'system']}
        inlineCollapsed={false}
        items={MENU_ITEMS}
        className="!border-r-0 !bg-transparent mt-2"
        style={{ background: 'transparent' }}
      />
    </Layout.Sider>
  )
}
