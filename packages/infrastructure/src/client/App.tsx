import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './Layout'
import { TodoPage } from './pages/TodoPage'
import { NotificationPage } from './pages/NotificationPage'
import { WebSocketPage } from './pages/WebSocketPage'
import { ContentListPage } from './pages/ContentListPage'
import { ContentDetailPage } from './pages/ContentDetailPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { PluginsPage } from './pages/PluginsPage'
import { PluginDetailPage } from './pages/PluginDetailPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { SearchPage } from './pages/SearchPage'
import { PublishPage } from './pages/PublishPage'
import { DeveloperDashboardPage } from './pages/DeveloperDashboardPage'

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/todos" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/todos" element={<TodoPage />} />
          <Route path="/notifications" element={<NotificationPage />} />
          <Route path="/websocket" element={<WebSocketPage />} />
          <Route path="/content" element={<ContentListPage />} />
          <Route path="/content/:id" element={<ContentDetailPage />} />
          <Route path="/plugins" element={<PluginsPage />} />
          <Route path="/plugins/:slug" element={<PluginDetailPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/publish" element={<PublishPage />} />
          <Route path="/developer" element={<DeveloperDashboardPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
