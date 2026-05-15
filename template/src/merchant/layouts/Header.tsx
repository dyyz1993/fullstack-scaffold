import { FC } from 'react'
import { Layout, Button, Dropdown, Avatar, Space, Typography } from 'antd'
import { MenuOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useMerchantStore } from '../stores/merchantStore'

const { Text } = Typography

interface HeaderProps {
  onToggle: () => void
}

export const Header: FC<HeaderProps> = ({ onToggle }) => {
  const { user, logout } = useMerchantStore()

  const handleLogout = () => {
    logout()
  }

  const items: MenuProps['items'] = [
    {
      key: 'profile',
      label: 'Profile',
      icon: <UserOutlined />,
    },
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ]

  return (
    <Layout.Header
      style={{
        padding: '0 24px',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginLeft: 64,
      }}
    >
      <Button type="text" icon={<MenuOutlined />} onClick={onToggle} />

      <Space>
        <Text>Welcome, {user?.username || 'Merchant'}</Text>
        <Dropdown menu={{ items }} placement="bottomRight">
          <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
        </Dropdown>
      </Space>
    </Layout.Header>
  )
}
