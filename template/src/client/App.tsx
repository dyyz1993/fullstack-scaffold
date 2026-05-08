import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './Layout'
import { TodoPage } from './pages/TodoPage'
import { NotificationPage } from './pages/NotificationPage'
import { WebSocketPage } from './pages/WebSocketPage'
import { ContentListPage } from './pages/ContentListPage'
import { ContentDetailPage } from './pages/ContentDetailPage'

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/todos" replace />} />
          <Route path="/todos" element={<TodoPage />} />
          <Route path="/notifications" element={<NotificationPage />} />
          <Route path="/websocket" element={<WebSocketPage />} />
          <Route path="/content" element={<ContentListPage />} />
          <Route path="/content/:id" element={<ContentDetailPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
