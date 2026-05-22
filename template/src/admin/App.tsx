import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import { Layout } from './layouts/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { SettingsPage } from './pages/SettingsPage'
import { PermissionsPage } from './pages/PermissionsPage'
import { RolesPage } from './pages/RolesPage'
import { SystemLogsPage } from './pages/SystemLogsPage'
import { UsersPage } from './pages/UsersPage'
import { OrdersPage } from './pages/OrdersPage'
import { TicketsPage } from './pages/TicketsPage'
import { DisputesPage } from './pages/DisputesPage'
import { ContentPage } from './pages/ContentPage'
import { ProtectedRoute, CaptchaModal } from './components'
import { useThemeStore } from './stores/themeStore'
import { useLanguage } from './i18n/useLanguage'

const ComingSoonPage: React.FC<{ title: string }> = ({ title }) => {
  const { t } = useLanguage()
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">{title}</h2>
        <p className="text-gray-400">{t('monitor.comingSoon')}</p>
      </div>
    </div>
  )
}

export const App: React.FC<{ basePath?: string }> = ({ basePath = '/admin' }) => {
  const mode = useThemeStore(state => state.mode)
  const isDark = mode === 'dark'

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#6366f1',
        },
        components: {
          Menu: {
            colorItemBg: 'transparent',
            colorItemText: 'rgba(255, 255, 255, 0.7)',
            colorItemTextHover: 'rgba(255, 255, 255, 0.9)',
            colorItemBgHover: 'rgba(255, 255, 255, 0.08)',
            colorItemBgSelected: 'rgba(99, 102, 241, 0.15)',
            colorItemTextSelected: '#6366f1',
            colorSubItemBg: '#000c17',
            itemBorderRadius: 8,
            itemMarginBlock: 2,
            itemHeight: 40,
          },
          Layout: {
            siderBg: '#001529',
            headerBg: isDark ? '#141414' : '#ffffff',
            bodyBg: isDark ? '#1f1f1f' : '#f5f6fa',
          },
        },
      }}
    >
      <BrowserRouter basename={basePath}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/orders" element={<OrdersPage />} />
                    <Route path="/tickets" element={<TicketsPage />} />
                    <Route path="/disputes" element={<DisputesPage />} />
                    <Route path="/content" element={<ContentPage />} />
                    <Route path="/system/settings" element={<SettingsPage />} />
                    <Route path="/system/logs" element={<SystemLogsPage />} />
                    <Route
                      path="/system/monitor"
                      element={<ComingSoonPage title="System Monitor" />}
                    />
                    <Route path="/system/permissions" element={<PermissionsPage />} />
                    <Route path="/system/roles" element={<RolesPage />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
        <CaptchaModal />
      </BrowserRouter>
    </ConfigProvider>
  )
}
