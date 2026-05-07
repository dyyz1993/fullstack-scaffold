import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './Layout'
import { TodoPage } from './pages/TodoPage'
import { WebSocketPage } from './pages/WebSocketPage'
import { NotificationPage } from './pages/NotificationPage'

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/todos" replace />} />
          <Route path="/todos" element={<TodoPage />} />
          <Route path="/websocket" element={<WebSocketPage />} />
          <Route path="/notifications" element={<NotificationPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
