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
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <AntLayout>
        <Header onToggle={() => setCollapsed(!collapsed)} />
        <AntLayout.Content
          style={{ padding: '24px', margin: '24px', background: '#fff', borderRadius: '8px' }}
        >
          {children}
        </AntLayout.Content>
      </AntLayout>
    </AntLayout>
  )
}
