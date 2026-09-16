import { Layout, Menu } from 'antd'
import {
  DashboardOutlined,
  FileTextOutlined,
  TeamOutlined,
  SettingOutlined,
  RocketOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'
import { NavLink, useLocation } from 'react-router-dom'
import { useLanguage } from '../i18n/useLanguage'
import { AVAILABLE_ADMIN_ROUTES } from './sidebar-availability'

interface SidebarProps {
  collapsed: boolean
  onCollapse: (collapsed: boolean) => void
}

const isRouteAvailable = (path?: string): boolean => {
  // 未声明 path 的入口默认保留（无路由语义的项）
  if (!path) return true
  return AVAILABLE_ADMIN_ROUTES.includes(path)
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onCollapse }) => {
  const { t } = useLanguage()
  const location = useLocation()

  // 菜单项形状与 antd Menu items 一致（类型保持字面推断，勿显式标注——
  // 显式 interface 与 antd ItemType 泛型不兼容）。叶子项/分组项通过 path
  // 声明对应路由，供下方按 AVAILABLE_ADMIN_ROUTES 过滤。
  const RAW_MENU_ITEMS = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: t('sidebar.dashboard'),
      path: '/dashboard',
    },
    {
      key: 'content',
      icon: <FileTextOutlined />,
      label: t('sidebar.content'),
      children: [
        {
          key: 'content-list',
          path: '/content',
          label: <NavLink to="/content">{t('sidebar.contentList')}</NavLink>,
        },
      ],
    },
    {
      key: 'plugins',
      icon: <AppstoreOutlined />,
      label: t('sidebar.plugins'),
      children: [
        {
          key: 'plugins-list',
          path: '/plugins',
          label: <NavLink to="/plugins">{t('sidebar.pluginsList')}</NavLink>,
        },
        {
          key: 'plugins-review',
          path: '/plugins/review',
          label: <NavLink to="/plugins/review">{t('sidebar.pluginsReview')}</NavLink>,
        },
        {
          key: 'plugins-dashboard',
          path: '/plugins/dashboard',
          label: <NavLink to="/plugins/dashboard">{t('sidebar.pluginsDashboard')}</NavLink>,
        },
        {
          key: 'plugins-categories',
          path: '/categories',
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
          path: '/users',
          label: <NavLink to="/users">{t('sidebar.users')}</NavLink>,
        },
        {
          key: 'orders',
          path: '/orders',
          label: <NavLink to="/orders">{t('sidebar.orders')}</NavLink>,
        },
        {
          key: 'tickets',
          path: '/tickets',
          label: <NavLink to="/tickets">{t('sidebar.tickets')}</NavLink>,
        },
        {
          key: 'disputes',
          path: '/disputes',
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
          path: '/system/roles',
          label: <NavLink to="/system/roles">{t('sidebar.roles')}</NavLink>,
        },
        {
          key: 'system-settings',
          path: '/system/settings',
          label: <NavLink to="/system/settings">{t('sidebar.settings')}</NavLink>,
        },
        {
          key: 'logs',
          path: '/system/logs',
          label: <NavLink to="/system/logs">{t('sidebar.logs')}</NavLink>,
        },
      ],
    },
  ]

  // 按 preset 可用路由过滤：scaffold 未包含的模块（如 forum 无 plugin 模块）
  // 对应入口直接隐藏，避免点击进入空白内容区（P2：forum /admin/categories 实测缺陷）
  const MENU_ITEMS = RAW_MENU_ITEMS.map(item =>
    item.children
      ? { ...item, children: item.children.filter(child => isRouteAvailable(child.path)) }
      : item
  ).filter(item => (item.children ? item.children.length > 0 : isRouteAvailable(item.path)))

  const getSelectedKey = () => {
    const path = location.pathname
    if (path === '/dashboard') return 'dashboard'
    if (path.startsWith('/content')) return 'content-list'
    if (path.startsWith('/plugins/review')) return 'plugins-review'
    if (path.startsWith('/plugins/dashboard')) return 'plugins-dashboard'
    if (path.startsWith('/plugins')) return 'plugins-list'
    if (path.startsWith('/categories')) return 'plugins-categories'
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
        defaultOpenKeys={['content', 'plugins', 'users-orders', 'system']}
        inlineCollapsed={false}
        items={MENU_ITEMS}
        className="!border-r-0 !bg-transparent mt-2"
        style={{ background: 'transparent' }}
      />
    </Layout.Sider>
  )
}
