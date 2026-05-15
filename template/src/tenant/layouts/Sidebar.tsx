import { Menu } from 'antd'
import type { MenuProps } from 'antd'
import {
  DashboardOutlined,
  UserOutlined,
  AppstoreOutlined,
  SettingOutlined,
  CheckSquareOutlined,
  FileTextOutlined,
} from '@ant-design/icons'

interface SidebarProps {
  collapsed: boolean
  onCollapse: (collapsed: boolean) => void
}

type MenuItem = Required<MenuProps>['items'][number]

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onCollapse }) => {
  const menuItems: MenuItem[] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: <a href="/tenant/dashboard">Dashboard</a>,
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: <a href="/tenant/users">Users</a>,
    },
    {
      key: '/subscription',
      icon: <AppstoreOutlined />,
      label: <a href="/tenant/subscription">Subscription</a>,
    },
    {
      key: '/todos',
      icon: <CheckSquareOutlined />,
      label: <a href="/tenant/todos">Todos</a>,
    },
    {
      key: '/content',
      icon: <FileTextOutlined />,
      label: <a href="/tenant/content">Content</a>,
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: <a href="/tenant/settings">Settings</a>,
    },
  ]

  return (
    <AntLayout.Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      className="bg-gray-900"
      data-testid="tenant-sidebar"
    >
      <div className="h-16 flex items-center justify-center bg-gray-900 border-b border-gray-800">
        <h1 className="text-white font-bold text-lg">Tenant Admin</h1>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[window.location.pathname.replace('/tenant', '') || '/dashboard']}
        items={menuItems}
      />
    </AntLayout.Sider>
  )
}
