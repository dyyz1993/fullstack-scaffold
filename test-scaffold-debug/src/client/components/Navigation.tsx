import { NavLink } from 'react-router-dom'
import { Rocket, Github, CheckCircle, Plug, Bell } from 'lucide-react'

type RouteKey = 'todos' | 'websocket' | 'notifications'

const routes: Record<RouteKey, { label: string; icon: typeof CheckCircle; path: string }> = {
  todos: { label: 'Todo List', icon: CheckCircle, path: '/todos' },
  websocket: { label: 'WebSocket', icon: Plug, path: '/websocket' },
  notifications: { label: 'Notifications', icon: Bell, path: '/notifications' },
}

export function Navigation() {
  return (
    <nav className="nav-container">
      <div className="nav-brand">
        <Rocket size={24} />
        <span>Biomimic App</span>
      </div>
      <div className="nav-links">
        {(Object.keys(routes) as RouteKey[]).map((key) => {
          const route = routes[key]
          const Icon = route.icon
          return (
            <NavLink
              key={key}
              to={route.path}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              <Icon size={18} />
              <span>{route.label}</span>
            </NavLink>
          )
        })}
      </div>
      <div className="nav-actions">
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-link"
        >
          <Github size={18} />
        </a>
      </div>
    </nav>
  )
}
