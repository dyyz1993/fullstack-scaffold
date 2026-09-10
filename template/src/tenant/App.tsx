import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, App as AntApp } from 'antd'
import { Layout } from './layouts/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { UsersPage } from './pages/UsersPage'
import { SubscriptionPage } from './pages/SubscriptionPage'
import { SettingsPage } from './pages/SettingsPage'
import { TodosPage } from './pages/TodosPage'
import { ContentPage } from './pages/ContentPage'
import { LoginPage } from './pages/LoginPage'
import { InviteAcceptPage } from './pages/InviteAcceptPage'
import { TenantGuard } from './components/TenantGuard'

export const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <AntApp>
        <BrowserRouter basename="/tenant">
          <Routes>
            {/* 公开路由：登录 + 邀请落地（TenantGuard 的 /login 回跳自此可达） */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/invite/:token" element={<InviteAcceptPage />} />
            <Route
              path="/*"
              element={
                <TenantGuard>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/users" element={<UsersPage />} />
                      <Route path="/subscription" element={<SubscriptionPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/todos" element={<TodosPage />} />
                      <Route path="/content" element={<ContentPage />} />
                    </Routes>
                  </Layout>
                </TenantGuard>
              }
            />
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  )
}
