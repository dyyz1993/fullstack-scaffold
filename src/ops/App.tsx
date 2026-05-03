import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, App as AntdApp, Spin } from 'antd'
import { Layout } from './layouts/Layout'
import { ProtectedRoute, CaptchaModal } from './components'

const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage }))
)
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })))
const RegisterPage = lazy(() =>
  import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage }))
)
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage }))
)
const PermissionsPage = lazy(() =>
  import('./pages/PermissionsPage').then(m => ({ default: m.PermissionsPage }))
)
const RolesPage = lazy(() => import('./pages/RolesPage').then(m => ({ default: m.RolesPage })))
const SystemLogsPage = lazy(() =>
  import('./pages/SystemLogsPage').then(m => ({ default: m.SystemLogsPage }))
)
const StaffPage = lazy(() => import('./pages/StaffPage').then(m => ({ default: m.StaffPage })))
const MonitorPage = lazy(() =>
  import('./pages/MonitorPage').then(m => ({ default: m.MonitorPage }))
)
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage }))
)

const SuspenseFallback = (
  <div className="flex items-center justify-center h-64">
    <Spin size="large" />
  </div>
)

export const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <AntdApp>
        <BrowserRouter basename="/ops">
          <Suspense fallback={SuspenseFallback}>
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
                        <Route path="/system/staff" element={<StaffPage />} />
                        <Route path="/system/settings" element={<SettingsPage />} />
                        <Route path="/system/logs" element={<SystemLogsPage />} />
                        <Route path="/system/monitor" element={<MonitorPage />} />
                        <Route path="/system/permissions" element={<PermissionsPage />} />
                        <Route path="/system/roles" element={<RolesPage />} />
                        <Route path="*" element={<NotFoundPage />} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
          <CaptchaModal />
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  )
}
