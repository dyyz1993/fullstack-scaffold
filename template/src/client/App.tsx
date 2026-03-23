import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './Layout'
import { TodoPage } from './pages/TodoPage'
import { NotificationPage } from './pages/NotificationPage'
import { WebSocketPage } from './pages/WebSocketPage'
import { ChatPage } from './pages/ChatPage'
import { TenantLayout } from '../tenant/layouts/TenantLayout'
import {
  TenantListPage,
  TenantCreatePage,
  MembersPage,
  RolesPage,
  SettingsPage,
  BillingPage,
  InviteAcceptPage,
} from '../tenant/pages'

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/todos" replace />} />
          <Route path="/todos" element={<TodoPage />} />
          <Route path="/notifications" element={<NotificationPage />} />
          <Route path="/websocket" element={<WebSocketPage />} />
          <Route path="/chat" element={<ChatPage />} />

          <Route path="/tenants" element={<TenantListPage />} />
          <Route path="/tenants/new" element={<TenantCreatePage />} />
          <Route path="/tenants/:tenantId" element={<TenantLayout />}>
            <Route index element={<Navigate to="members" replace />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="billing" element={<BillingPage />} />
          </Route>

          <Route path="/invite/:token" element={<InviteAcceptPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
