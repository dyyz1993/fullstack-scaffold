import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { CheckCircle, Bell, Plug, Rocket, Github } from 'lucide-react'
import { TodoPage } from './pages/TodoPage'
import { NotificationPage } from './pages/NotificationPage'
import { WebSocketPage } from './pages/WebSocketPage'

type RouteKey = 'todos' | 'notifications' | 'websocket'

const routes: Record<
  RouteKey,
  { label: string; icon: React.FC<{ className?: string }>; path: string }
> = {
  todos: { label: 'Todo List', icon: CheckCircle, path: '/todos' },
  notifications: { label: 'Notifications', icon: Bell, path: '/notifications' },
  websocket: { label: 'WebSocket', icon: Plug, path: '/websocket' },
}

const Navigation: React.FC = () => {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50" data-testid="app-nav">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1
            className="text-xl font-bold text-gray-900 flex items-center gap-2"
            data-testid="app-title"
          >
            <Rocket className="w-6 h-6 text-blue-500" />
            Biomimic App
          </h1>
          <div className="flex items-center gap-1">
            {(Object.keys(routes) as RouteKey[]).map(route => {
              const Icon = routes[route].icon
              return (
                <NavLink
                  key={route}
                  to={routes[route].path}
                  data-testid={`nav-${route}-button`}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {routes[route].label}
                </NavLink>
              )
            })}
          </div>
        </div>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="github-link"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Github className="w-5 h-5" />
        </a>
      </div>
    </nav>
  )
}

const Footer: React.FC = () => {
  return (
    <footer
      className="py-8 text-center text-gray-500 text-sm border-t border-gray-200 bg-white"
      data-testid="app-footer"
    >
      <p className="flex items-center justify-center gap-2">
        Built with <span className="font-medium text-gray-700">Hono RPC</span> +{' '}
        <span className="font-medium text-gray-700">React</span> +{' '}
        <span className="font-medium text-gray-700">TypeScript</span>
      </p>
      <p className="mt-2 text-xs text-gray-400">
        Demonstrates: CRUD Operations | SSE (Server-Sent Events) | WebSocket
      </p>
    </footer>
  )
}

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50" data-testid="app-container">
      <Navigation />
      <main className="py-8" data-testid="app-main">
        {children}
      </main>
      <Footer />
    </div>
  )
}

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/todos" replace />} />
          <Route path="/todos" element={<TodoPage />} />
          <Route path="/notifications" element={<NotificationPage />} />
          <Route path="/websocket" element={<WebSocketPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
