import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  CheckCircle,
  Bell,
  Plug,
  Rocket,
  Github,
  Building2,
  MessageSquare,
  Menu,
  X,
} from 'lucide-react'
import { AuthButton } from './AuthButton'

type RouteKey = 'todos' | 'notifications' | 'websocket' | 'tenants' | 'chat'

const routes: Record<
  RouteKey,
  { label: string; icon: React.FC<{ className?: string }>; path: string }
> = {
  todos: { label: 'Todo List', icon: CheckCircle, path: '/todos' },
  notifications: { label: 'Notifications', icon: Bell, path: '/notifications' },
  websocket: { label: 'WebSocket', icon: Plug, path: '/websocket' },
  chat: { label: 'Chat', icon: MessageSquare, path: '/chat' },
  tenants: { label: 'Tenants', icon: Building2, path: '/tenants' },
}

export const Navigation: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
          <div className="hidden md:flex items-center gap-1">
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
        <div className="flex items-center gap-4">
          <AuthButton />
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="github-link"
            className="text-gray-400 hover:text-gray-600 transition-colors hidden md:block"
          >
            <Github className="w-5 h-5" />
          </a>
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="mobile-menu-toggle"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-gray-600" />
            ) : (
              <Menu className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-6 py-4 space-y-1">
            {(Object.keys(routes) as RouteKey[]).map(route => {
              const Icon = routes[route].icon
              return (
                <NavLink
                  key={route}
                  to={routes[route].path}
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid={`nav-${route}-button-mobile`}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {routes[route].label}
                </NavLink>
              )
            })}
            <div className="pt-2 flex items-center gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-2 px-4 py-3 text-sm"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
