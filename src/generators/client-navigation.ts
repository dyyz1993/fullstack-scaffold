import type { ResolvedPreset } from './template-generator'
import { getClientPages } from './template-generator'

const DEFAULT_ICON = 'Circle'

const ICON_MAP: Record<string, string> = {
  TodoPage: 'CheckCircle',
  NotificationPage: 'Bell',
  WebSocketPage: 'Plug',
  ContentListPage: 'FileText',
}

export function generateClientNavigation(resolved: ResolvedPreset): string {
  const pages = getClientPages(resolved).filter(p => !p.route.includes(':'))

  const iconsNeeded = new Set<string>()
  iconsNeeded.add('Rocket')
  iconsNeeded.add('Github')
  for (const page of pages) {
    const icon = ICON_MAP[page.name] || DEFAULT_ICON
    iconsNeeded.add(icon)
  }

  const routeKeys: string[] = []
  const routeEntries: string[] = []

  for (const page of pages) {
    const key = page.route.replace(/^\//, '').replace(/\//g, '-')
    routeKeys.push(`'${key}'`)
    const icon = ICON_MAP[page.name] || DEFAULT_ICON

    const label =
      key === 'todos'
        ? 'Todo List'
        : key === 'notifications'
          ? 'Notifications'
          : key === 'websocket'
            ? 'WebSocket'
            : key.charAt(0).toUpperCase() + key.slice(1)

    const safeKey = /^[a-zA-Z0-9_]+$/.test(key) ? key : `'${key}'`
    routeEntries.push(`  ${safeKey}: { label: '${label}', icon: ${icon}, path: '${page.route}' },`)
  }

  const iconsStr = [...iconsNeeded].join(', ')

  const authButtonImport = resolved.modules.has('admin')
    ? `\nimport { AuthButton } from './AuthButton'`
    : ''
  const authButtonElement = resolved.modules.has('admin') ? `\n          <AuthButton />` : ''

  return `import { NavLink } from 'react-router-dom'
import { ${iconsStr} } from 'lucide-react'${authButtonImport}

type RouteKey = ${routeKeys.join(' | ')}

const routes: Record<
  RouteKey,
  { label: string; icon: React.FC<{ className?: string }>; path: string }
> = {
${routeEntries.join('\n')}
}

export const Navigation: React.FC = () => {
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
                  data-testid={\`nav-\${route}-button\`}
                  className={({ isActive }) =>
                    \`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors \${
                      isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                    }\`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {routes[route].label}
                </NavLink>
              )
            })}
          </div>
        </div>
        <div className="flex items-center gap-4">${authButtonElement}
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
      </div>
    </nav>
  )
}
`
}
