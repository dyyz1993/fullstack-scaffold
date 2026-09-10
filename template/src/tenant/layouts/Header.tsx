import { Layout as AntLayout, Dropdown } from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { useTenantStore } from '../stores/tenantStore'

interface HeaderProps {
  collapsed: boolean
  onToggle: () => void
}

export const Header: React.FC<HeaderProps> = ({ collapsed, onToggle }) => {
  const logout = useTenantStore(state => state.logout)

  const handleLogout = () => {
    logout()
    // basename=/tenant 下的路由跳转
    window.location.href = '/tenant/login'
  }

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ]

  return (
    <AntLayout.Header
      className="bg-white px-6 flex items-center justify-between shadow-sm"
      data-testid="tenant-header"
    >
      <button
        onClick={onToggle}
        className="text-gray-600 hover:text-gray-900 focus:outline-none"
        data-testid="tenant-sidebar-toggle"
      >
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </button>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">Welcome, Tenant Admin</span>
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <div className="cursor-pointer flex items-center gap-2">
            <UserOutlined className="text-gray-600" />
          </div>
        </Dropdown>
      </div>
    </AntLayout.Header>
  )
}
