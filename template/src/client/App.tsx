import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './Layout'
import { LoadingSpinner } from './components'

const TodoPage = lazy(() => import('./pages/TodoPage').then(m => ({ default: m.TodoPage })))
const NotificationPage = lazy(() =>
  import('./pages/NotificationPage').then(m => ({ default: m.NotificationPage }))
)
const WebSocketPage = lazy(() =>
  import('./pages/WebSocketPage').then(m => ({ default: m.WebSocketPage }))
)
const ChatPage = lazy(() => import('./pages/ChatPage').then(m => ({ default: m.ChatPage })))
const TenantLayout = lazy(() =>
  import('../tenant/layouts/TenantLayout').then(m => ({ default: m.TenantLayout }))
)
const TenantListPage = lazy(() =>
  import('../tenant/pages/TenantListPage').then(m => ({ default: m.TenantListPage }))
)
const TenantCreatePage = lazy(() =>
  import('../tenant/pages/TenantCreatePage').then(m => ({ default: m.TenantCreatePage }))
)
const MembersPage = lazy(() =>
  import('../tenant/pages/MembersPage').then(m => ({ default: m.MembersPage }))
)
const RolesPage = lazy(() =>
  import('../tenant/pages/RolesPage').then(m => ({ default: m.RolesPage }))
)
const SettingsPage = lazy(() =>
  import('../tenant/pages/SettingsPage').then(m => ({ default: m.SettingsPage }))
)
const BillingPage = lazy(() =>
  import('../tenant/pages/BillingPage').then(m => ({ default: m.BillingPage }))
)
const InviteAcceptPage = lazy(() =>
  import('../tenant/pages/InviteAcceptPage').then(m => ({ default: m.InviteAcceptPage }))
)
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-24">
              <LoadingSpinner size="lg" />
            </div>
          }
        >
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
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  )
}
