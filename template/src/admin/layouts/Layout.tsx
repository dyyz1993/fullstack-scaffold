import { ReactNode, useState } from 'react'
import { Layout as AntLayout, theme } from 'antd'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface LayoutProps {
  children: ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const { token } = theme.useToken()

  return (
    <AntLayout className="min-h-screen" data-testid="admin-layout">
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <AntLayout>
        <Header collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <AntLayout.Content
          className="m-6 p-6 rounded-lg shadow-sm"
          style={{
            minHeight: 'calc(100vh - 64px - 48px)',
            backgroundColor: token.colorBgContainer,
          }}
          data-testid="admin-main"
        >
          {children}
        </AntLayout.Content>
      </AntLayout>
    </AntLayout>
  )
}
