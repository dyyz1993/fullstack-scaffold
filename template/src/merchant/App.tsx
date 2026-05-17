import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import { Layout } from './layouts/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { ProductsPage } from './pages/ProductsPage'
import { OrdersPage } from './pages/OrdersPage'
import { DisputesPage } from './pages/DisputesPage'
import { SettingsPage } from './pages/SettingsPage'
import { LoginPage } from './pages/LoginPage'
import { MerchantGuard } from './components/MerchantGuard'
import { useMerchantStore } from './stores/merchantStore'

export const App: React.FC = () => {
  const [authCheckDone, setAuthCheckDone] = useState(false)

  useEffect(() => {
    const { checkAuth } = useMerchantStore.getState()
    checkAuth().finally(() => setAuthCheckDone(true))
  }, [])

  if (!authCheckDone) {
    return null
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#52c41a',
        },
      }}
    >
      <BrowserRouter basename="/merchant">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <MerchantGuard>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/orders" element={<OrdersPage />} />
                    <Route path="/disputes" element={<DisputesPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Routes>
                </Layout>
              </MerchantGuard>
            }
          />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}
