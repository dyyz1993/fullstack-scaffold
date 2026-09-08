import { ReactNode, useState } from 'react'
import { Layout as AntLayout } from 'antd'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface LayoutProps {
  children: ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <AntLayout className="min-h-screen" data-testid="tenant-layout">
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <AntLayout>
        <Header collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <AntLayout.Content
          className="m-6 p-6 bg-white rounded-lg shadow-sm"
          style={{ minHeight: 'calc(100vh - 64px - 48px)' }}
          data-testid="tenant-main"
        >
          {children}
        </AntLayout.Content>
      </AntLayout>
    </AntLayout>
  )
}
